// Browser-side data/auth client. Same surface the app was written against (entities, auth,
// integrations), now backed by Supabase: entities go through the `api` edge function,
// auth and file uploads use Supabase Auth and Storage.
import { API_URL, SUPABASE_ANON_KEY, getAccessToken, getSupabase } from "@/lib/supabase";
import { currentUrl } from "@/lib/authReturnTo";

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

export async function rpc(op, entity, args = {}) {
  const token = (await getAccessToken()) ?? SUPABASE_ANON_KEY;
  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY },
    body: JSON.stringify({ op, entity, args }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(body.error || `Request failed (${response.status})`, response.status);
  return body;
}

export const entityClient = (call) =>
  new Proxy(
    {},
    {
      get: (_, entity) => ({
        list: (options) => call("list", entity, { options }),
        filter: (query, options) => call("filter", entity, { query, options }),
        get: (id) => call("get", entity, { id }),
        create: (data) => call("create", entity, { data }),
        update: (id, data) => call("update", entity, { id, data }),
        delete: (id) => call("delete", entity, { id }),
        count: (query) => call("count", entity, { query }),
        updateMany: (query, update) => call("updateMany", entity, { query, update }),
      }),
    },
  );

const auth = {
  hasToken: () => {
    try {
      return Object.keys(window.localStorage).some((k) => k.startsWith("sb-") && k.endsWith("-auth-token"));
    } catch {
      return false;
    }
  },
  me: () => rpc("me"),
  setToken: () => {},
  logout: async (redirectTo) => {
    await getSupabase()?.auth.signOut();
    window.location.href = redirectTo || "/";
  },
  redirectToLogin: (fromUrl) => {
    const url = new URL("/login", window.location.origin);
    if (fromUrl) url.searchParams.set("returnTo", fromUrl);
    window.location.href = url.href;
  },
  loginWithProvider: async (provider, returnTo = "/") => {
    const redirectTo = new URL(returnTo, window.location.origin).href;
    const { error } = await getSupabase().auth.signInWithOAuth({ provider, options: { redirectTo } });
    if (error) throw error;
  },
  signIn: async ({ email, password }) => {
    const { data, error } = await getSupabase().auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },
  // Returns { needsConfirmation } — Supabase emails a confirmation link unless confirmation is switched off.
  register: async ({ email, password }) => {
    const { data, error } = await getSupabase().auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin + "/" },
    });
    if (error) throw error;
    return { needsConfirmation: !data.session };
  },
  resendConfirmation: async (email) => {
    const { error } = await getSupabase().auth.resend({ type: "signup", email });
    if (error) throw error;
  },
  resetPasswordRequest: async (email) => {
    const { error } = await getSupabase().auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/reset-password",
    });
    if (error) throw error;
  },
  resetPassword: async ({ newPassword }) => {
    const { error } = await getSupabase().auth.updateUser({ password: newPassword });
    if (error) throw error;
  },
};

const integrations = {
  Core: {
    // Uploads to the public `uploads` bucket; returns { file_url } like the old SDK.
    UploadPublicFile: async ({ file }) => {
      const supabase = getSupabase();
      const { data: session } = await supabase.auth.getSession();
      const owner = session.session?.user.id ?? "anon";
      const ext = (file.name?.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
      const path = `${owner}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("uploads").upload(path, file, { contentType: file.type });
      if (error) throw error;
      return { file_url: supabase.storage.from("uploads").getPublicUrl(path).data.publicUrl };
    },
  },
};

export const base44 = { entities: entityClient(rpc), auth, integrations, currentUrl };
