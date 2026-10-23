import { GoogleGenAI } from "@google/genai";

export const DEFAULT_GEMINI_MODEL = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash-lite";

/** Try each configured model once, only for missing models or temporary unavailability. */
export async function withGeminiModel<T>(
  preferred: string,
  generate: (model: string) => Promise<T>,
  canRetry: () => boolean = () => true,
): Promise<T> {
  const models = [...new Set([preferred, "gemini-2.5-flash-lite", "gemini-3.8-flash"])];
  for (let index = 0; index < models.length; index++) {
    try { return await generate(models[index]); }
    catch (error: unknown) {
      const details = error && typeof error === "object" ? error as { status?: unknown; code?: unknown; message?: unknown } : {};
      const status = Number(details.status ?? details.code);
      const retryable = status === 404 || status === 503 || /\b(?:404|503|NOT_FOUND|UNAVAILABLE)\b/.test(String(details.message ?? ""));
      if (!retryable || !canRetry() || index === models.length - 1) throw error;
    }
  }
  throw new Error("No Gemini model configured");
}

let client: GoogleGenAI | null = null;

/** Missing credentials must never make importing a route fail. */
export function getGenAI(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  client ??= new GoogleGenAI({ apiKey });
  return client;
}
