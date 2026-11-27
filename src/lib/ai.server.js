import { openaiCompatibleText } from "@tanstack/ai-openai/compatible";

// A TanStack AI chat adapter on any OpenAI-compatible API. Set OPENAI_API_KEY (and optionally
// OPENAI_BASE_URL / OPENAI_MODEL) as Railway variables. Callers must authenticate the visitor first.
export const gatewayModel = (_client, model) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("AI features are not configured (OPENAI_API_KEY is missing).");
  const name = !model || model === "automatic" ? process.env.OPENAI_MODEL || "gpt-4o-mini" : model;
  return openaiCompatibleText(name, { name: "openai", baseURL: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1", apiKey });
};
