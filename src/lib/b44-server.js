// Server-side client (replaces the Base44 SDK's createClientFromRequest). Only referenced from
// server-only code. Acts as the visitor when their Authorization header is present; `asServiceRole`
// uses the Supabase service-role key (SUPABASE_SERVICE_ROLE_KEY) and bypasses access rules. Without
// that key, service-role calls degrade to anonymous (public) reads.
import { API_URL, SUPABASE_ANON_KEY } from "@/lib/supabase";
import { entityClient } from "@/api/base44Client";

const apiUrl = () => (process.env.SUPABASE_URL ? `${process.env.SUPABASE_URL}/functions/v1/api` : API_URL);

const caller = (headers) => async (op, entity, args = {}) => {
  const response = await fetch(apiUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, ...headers },
    body: JSON.stringify({ op, entity, args }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(body.error || `Request failed (${response.status})`), { status: response.status });
  return body;
};

// Service-role reads are public aggregates (feeds, counts, trends) fetched many times per page.
// Identical calls are coalesced and kept for a few seconds; any write through this server clears them.
const TTL_MS = 20_000;
const MAX_ENTRIES = 500;
const cache = new Map();
const withCache = (call) => (op, entity, args = {}) => {
  if (op !== "list" && op !== "filter" && op !== "count" && op !== "get") {
    cache.clear();
    return call(op, entity, args);
  }
  const key = JSON.stringify([op, entity, args]);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.promise;
  if (cache.size >= MAX_ENTRIES) cache.clear();
  const promise = call(op, entity, args);
  cache.set(key, { at: Date.now(), promise });
  promise.catch(() => cache.delete(key));
  return promise;
};

export function createClientFromRequest(request) {
  const authorization = request.headers.get("authorization");
  const userHeaders = { Authorization: authorization || `Bearer ${SUPABASE_ANON_KEY}` };
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const serviceHeaders = serviceKey
    ? { Authorization: `Bearer ${SUPABASE_ANON_KEY}`, "x-internal-secret": serviceKey }
    : { Authorization: `Bearer ${SUPABASE_ANON_KEY}` };
  const asUser = caller(userHeaders);
  const asService = withCache(caller(serviceHeaders));
  return {
    entities: entityClient(asUser),
    auth: { me: () => asUser("me") },
    asServiceRole: { entities: entityClient(asService) },
  };
}
