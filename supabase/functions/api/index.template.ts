// MarketIntel entity API (replaces the Base44 entity backend).
// One endpoint: POST { op, entity, args }. Caller is a Supabase Auth user (Bearer JWT),
// or the app server using the shared INTERNAL_SECRET (service role: bypasses access rules).
import postgres from "npm:postgres@3.4.4";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const ENTITIES: Record<string, { defaults: Record<string, unknown>; rls: Record<string, any> | null }> = __ENTITIES__;

const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { max: 3, prepare: false, idle_timeout: 20 });
const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});
const INTERNAL_SECRET = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-internal-secret, apikey, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

type User = { id: string; email: string | null; full_name: string | null; role: string } | null;
type Caller = { user: User; service: boolean };

const COLUMNS = new Set(["id", "created_by_id", "created_by", "created_date", "updated_date"]);
const TS_COLUMNS = new Set(["created_date", "updated_date"]);
const OPS = new Set(["$gt", "$gte", "$lt", "$lte", "$ne", "$in", "$nin", "$regex", "$options", "$exists"]);

// ---------- access rules ----------
const subst = (v: any, user: User): any => {
  if (typeof v === "string") {
    const m = v.match(/^\{\{user\.(\w+)\}\}$/);
    return m ? (user ? (user as any)[m[1]] ?? "__none__" : "__anon__") : v;
  }
  if (Array.isArray(v)) return v.map((x) => subst(x, user));
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, subst(x, user)]));
  return v;
};
// Resolve `user_condition` clauses to booleans so the rest is a plain record query.
const resolveRule = (rule: any, user: User): any => {
  if (Array.isArray(rule)) return rule.map((r) => resolveRule(r, user));
  if (!rule || typeof rule !== "object") return rule;
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(rule)) {
    if (k === "user_condition") {
      const ok = !!user && Object.entries(v as any).every(([f, want]) => (user as any)[f] === want);
      out["$$bool"] = ok;
    } else out[k] = resolveRule(v, user);
  }
  return out;
};

// ---------- query -> SQL ----------
const fieldRef = (key: string) => {
  const name = key.startsWith("data.") ? key.slice(5) : key;
  if (!/^[A-Za-z0-9_]+$/.test(name)) throw new HttpError(400, "Invalid field name");
  const isCol = COLUMNS.has(name) && !key.startsWith("data.");
  return { name, isCol };
};

function toSql(query: any, params: any[]): string {
  const p = (v: any) => { params.push(v); return `$${params.length}`; };
  const parts: string[] = [];
  for (const [key, cond] of Object.entries(query ?? {})) {
    if (key === "$$bool") { parts.push(cond ? "true" : "false"); continue; }
    if (key === "$or" || key === "$and") {
      const subs = (cond as any[]).map((q) => `(${toSql(q, params)})`);
      parts.push(subs.length ? `(${subs.join(key === "$or" ? " OR " : " AND ")})` : "true");
      continue;
    }
    if (key.startsWith("$")) throw new HttpError(400, `Unsupported operator ${key}`);
    const { name, isCol } = fieldRef(key);
    const ref = isCol ? `"${name}"` : `(data->'${name}')`;
    const text = isCol ? (name === "id" ? `"id"::text` : TS_COLUMNS.has(name) ? `"${name}"` : `"${name}"::text`) : `(data->>'${name}')`;
    const eq = (v: any) => {
      if (v === null || v === undefined) return isCol ? `${ref} IS NULL` : `(${ref} IS NULL OR ${ref} = 'null'::jsonb)`;
      if (isCol) return TS_COLUMNS.has(name) ? `${ref} = ${p(v)}::timestamptz` : `${text} = ${p(String(v))}`;
      const id = p(JSON.stringify(v));
      // Equality, or membership when the stored field is an array.
      return `(${ref} = ${id}::jsonb OR (jsonb_typeof(${ref}) = 'array' AND ${ref} @> ${id}::jsonb))`;
    };
    const isOps = cond && typeof cond === "object" && !Array.isArray(cond) && Object.keys(cond).some((k) => OPS.has(k));
    if (!isOps) { parts.push(eq(cond)); continue; }
    for (const [op, v] of Object.entries(cond as any)) {
      if (op === "$options") continue;
      if (op === "$in") parts.push(`(${(v as any[]).map(eq).join(" OR ") || "false"})`);
      else if (op === "$nin") parts.push(`NOT (${(v as any[]).map(eq).join(" OR ") || "false"})`);
      else if (op === "$ne") parts.push(`NOT (${eq(v)})`);
      else if (op === "$exists") parts.push(isCol ? "true" : v ? `${ref} IS NOT NULL` : `${ref} IS NULL`);
      else if (op === "$regex") parts.push(`${text} ${String((cond as any).$options ?? "").includes("i") ? "~*" : "~"} ${p(String(v))}`);
      else {
        const sym = { $gt: ">", $gte: ">=", $lt: "<", $lte: "<=" }[op as "$gt"];
        if (isCol && TS_COLUMNS.has(name)) parts.push(`${ref} ${sym} ${p(v)}::timestamptz`);
        else if (typeof v === "number") parts.push(`(CASE WHEN jsonb_typeof(${ref}) = 'number' THEN (${text})::numeric ${sym} ${p(v)}::numeric ELSE false END)`);
        else parts.push(`${text} ${sym} ${p(String(v))}`);
      }
    }
  }
  return parts.length ? parts.join(" AND ") : "true";
}

// Same rule semantics evaluated in JS against a record that is about to be created.
function matches(rec: Record<string, any>, query: any): boolean {
  for (const [key, cond] of Object.entries(query ?? {})) {
    if (key === "$$bool") { if (!cond) return false; continue; }
    if (key === "$or") { if (!(cond as any[]).some((q) => matches(rec, q))) return false; continue; }
    if (key === "$and") { if (!(cond as any[]).every((q) => matches(rec, q))) return false; continue; }
    const val = rec[key.startsWith("data.") ? key.slice(5) : key];
    const eq = (w: any) => (Array.isArray(val) ? val.includes(w) : val === w) || (w == null && val == null);
    if (cond && typeof cond === "object" && !Array.isArray(cond)) {
      for (const [op, w] of Object.entries(cond as any)) {
        if (op === "$in") { if (!(w as any[]).some(eq)) return false; }
        else if (op === "$ne") { if (eq(w)) return false; }
        else if (op === "$gt") { if (!(val > (w as any))) return false; }
        else if (op === "$gte") { if (!(val >= (w as any))) return false; }
        else if (op === "$lt") { if (!(val < (w as any))) return false; }
        else if (op === "$lte") { if (!(val <= (w as any))) return false; }
      }
    } else if (!eq(cond)) return false;
  }
  return true;
}

const rule = (entity: string, action: string, caller: Caller) => {
  const raw = ENTITIES[entity].rls?.[action];
  return raw === undefined ? undefined : resolveRule(subst(raw, caller.user), caller.user);
};

// ---------- records ----------
const iso = (d: unknown) => (d instanceof Date ? d.toISOString() : d);
const shape = (r: any) => ({
  ...r.data,
  id: r.id,
  created_date: iso(r.created_date),
  updated_date: iso(r.updated_date),
  created_by: r.created_by,
  created_by_id: r.created_by_id,
});
const clean = (data: any) => {
  const out = { ...(data ?? {}) };
  for (const k of ["id", "created_date", "updated_date", "created_by", "created_by_id"]) delete out[k];
  return out;
};

function orderBy(sort?: string) {
  if (!sort) return `"created_date" DESC`;
  const desc = sort.startsWith("-");
  const { name, isCol } = fieldRef(desc ? sort.slice(1) : sort);
  return (isCol ? `"${name}"` : `(data->'${name}')`) + (desc ? " DESC" : " ASC") + " NULLS LAST";
}

const userShape = (u: any) => ({ ...u.data, id: u.id, email: u.email, full_name: u.full_name, role: u.role,
  created_date: iso(u.created_date), updated_date: iso(u.updated_date) });

async function handleUser(op: string, args: any, caller: Caller) {
  const isAdmin = caller.service || caller.user?.role === "admin";
  if (op === "list" || op === "filter") {
    if (!caller.user && !caller.service) throw new HttpError(401, "Unauthorized");
    const rows = await sql`select * from public.app_users ${isAdmin ? sql`` : sql`where id = ${caller.user!.id}`} order by created_date desc limit 1000`;
    const items = rows.map(userShape);
    return op === "list" ? items : { items };
  }
  if (op === "get") {
    const rows = await sql`select * from public.app_users where id = ${args.id}`;
    if (!rows[0] || (!isAdmin && rows[0].id !== caller.user?.id)) throw new HttpError(404, "Not found");
    return userShape(rows[0]);
  }
  if (op === "count") return (await sql`select count(*)::int c from public.app_users`)[0].c;
  if (op === "update") {
    if (!isAdmin) throw new HttpError(403, "Forbidden");
    const d = args.data ?? {};
    const role = d.role === undefined ? undefined : d.role === "admin" ? "admin" : "user";
    const rows = await sql`update public.app_users set role = coalesce(${role ?? null}, role), updated_date = now() where id = ${args.id} returning *`;
    if (!rows[0]) throw new HttpError(404, "Not found");
    return userShape(rows[0]);
  }
  throw new HttpError(400, "Unsupported operation on User");
}

async function handle(op: string, entity: string, args: any, caller: Caller) {
  if (entity === "User") return handleUser(op, args, caller);
  if (!ENTITIES[entity]) throw new HttpError(404, `Unknown entity ${entity}`);

  const allowed = (action: string): any => {
    if (caller.service) return {};
    const r = rule(entity, action, caller);
    if (r === undefined) throw new HttpError(403, "Forbidden");
    return r;
  };
  const scoped = (action: string, query: any, params: any[]) => {
    const rls = allowed(action);
    const a = toSql(query, params);
    const b = toSql(rls, params);
    params.unshift(entity); // $1 is the entity; shift placeholders below
    return { a, b };
  };
  void scoped;

  // Build WHERE with entity as $1.
  const where = (action: string, query: any) => {
    const params: any[] = [entity];
    const user = toSql(query, params);
    const rls = toSql(allowed(action), params);
    return { text: `entity = $1 AND (${user}) AND (${rls})`, params };
  };

  if (op === "list" || op === "filter") {
    const q = op === "list" ? {} : args.query ?? {};
    const o = (op === "list" ? args.options ?? args : args.options) ?? {};
    const { text, params } = where("read", q);
    const limit = Math.min(Math.max(Number(o.limit) || 50, 1), 5000);
    const skip = Math.max(Number(o.skip) || 0, 0);
    const rows = await sql.unsafe(`select * from public.entity_records where ${text} order by ${orderBy(o.sort)} limit ${limit} offset ${skip}`, params);
    return { items: rows.map(shape) };
  }
  if (op === "count") {
    const { text, params } = where("read", args.query ?? {});
    const rows = await sql.unsafe(`select count(*)::int c from public.entity_records where ${text}`, params);
    return rows[0].c;
  }
  if (op === "get") {
    const { text, params } = where("read", { id: args.id });
    const rows = await sql.unsafe(`select * from public.entity_records where ${text} limit 1`, params);
    if (!rows[0]) throw new HttpError(404, "Not found");
    return shape(rows[0]);
  }
  if (op === "create") {
    const data = { ...ENTITIES[entity].defaults, ...clean(args.data) };
    const createdBy = caller.service ? null : caller.user?.id ?? null;
    if (!caller.service) {
      const r = rule(entity, "create", caller);
      if (r === undefined) throw new HttpError(403, "Forbidden");
      const probe = { ...data, created_by_id: createdBy, created_by: caller.user?.email ?? null };
      if (!matches(probe, r)) throw new HttpError(403, "Forbidden");
    }
    const rows = await sql`insert into public.entity_records (entity, data, created_by_id, created_by)
      values (${entity}, ${sql.json(data)}, ${createdBy}, ${caller.service ? null : caller.user?.email ?? null}) returning *`;
    return shape(rows[0]);
  }
  if (op === "update" || op === "delete") {
    const { text, params } = where(op === "update" ? "update" : "delete", { id: args.id });
    if (op === "delete") {
      const rows = await sql.unsafe(`delete from public.entity_records where ${text} returning id`, params);
      if (!rows[0]) throw new HttpError(404, "Not found");
      return { success: true };
    }
    params.push(JSON.stringify(clean(args.data)));
    const rows = await sql.unsafe(
      `update public.entity_records set data = data || $${params.length}::jsonb, updated_date = now() where ${text} returning *`, params);
    if (!rows[0]) throw new HttpError(404, "Not found");
    return shape(rows[0]);
  }
  if (op === "updateMany") {
    const { text, params } = where("update", args.query ?? {});
    params.push(JSON.stringify(clean(args.update?.$set ?? args.update)));
    const rows = await sql.unsafe(
      `update public.entity_records set data = data || $${params.length}::jsonb, updated_date = now() where ${text} returning id`, params);
    return { updated: rows.length };
  }
  throw new HttpError(400, `Unsupported operation ${op}`);
}

async function callerFrom(req: Request): Promise<Caller> {
  const secret = req.headers.get("x-internal-secret");
  if (INTERNAL_SECRET && secret && secret === INTERNAL_SECRET) {
    // The app server may act as a specific signed-in user (rules apply) or as the service (rules bypassed).
    const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!bearer) return { user: null, service: true };
  }
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return { user: null, service: false };
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return { user: null, service: false };
  const row = (await sql`select role, full_name from public.app_users where id = ${data.user.id}`)[0];
  const user = { id: data.user.id, email: data.user.email ?? null, full_name: row?.full_name ?? null, role: row?.role ?? "user" };
  return { user, service: false };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const { op, entity, args } = await req.json();
    const caller = await callerFrom(req);
    if (op === "me") {
      if (!caller.user) throw new HttpError(401, "Unauthorized");
      return json(userShape((await sql`select * from public.app_users where id = ${caller.user.id}`)[0]));
    }
    if (op === "whoami") return json({ user: caller.user, service: caller.service });
    await sql`set local statement_timeout = '8s'`.catch(() => {});
    return json(await handle(op, entity, args ?? {}, caller));
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.message }, e.status);
    console.error(e);
    return json({ error: "Internal error" }, 500);
  }
});
