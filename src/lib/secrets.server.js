// Server-side secrets, read from the environment (Railway variables).
export const secrets = { get: (name) => process.env[name] };
