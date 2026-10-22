import { GoogleGenAI } from "@google/genai";

let client: GoogleGenAI | null = null;

/** Missing credentials must never make importing a route fail. */
export function getGenAI(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  client ??= new GoogleGenAI({ apiKey });
  return client;
}
