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

export function createClientFromRequest(request) {
  const authorization = request.headers.get("authorization");
  const userHeaders = { Authorization: authorization || `Bearer ${SUPABASE_ANON_KEY}` };
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const serviceHeaders = serviceKey
    ? { Authorization: `Bearer ${SUPABASE_ANON_KEY}`, "x-internal-secret": serviceKey }
    : { Authorization: `Bearer ${SUPABASE_ANON_KEY}` };
  const asUser = caller(userHeaders);
  const asService = caller(serviceHeaders);
  return {
    entities: entityClient(asUser),
    auth: { me: () => asUser("me") },
    asServiceRole: { entities: entityClient(asService) },
  };
}
