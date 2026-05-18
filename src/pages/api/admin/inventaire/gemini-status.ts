export const prerender = false;
import { hasServerKey as hasGeminiKey, getKeyCount as getGeminiKeyCount, resolveModel as resolveGeminiModel } from '@/lib/inventaire-gemini.js';
import { hasGroqKey,    getGroqKeyCount,    resolveGroqModel    } from '@/lib/inventaire-groq.js';
import { hasMistralKey, getMistralKeyCount, resolveMistralModel } from '@/lib/inventaire-mistral.js';
import { hasVisionKey } from '@/lib/inventaire-vision.js';

export async function GET() {
  return new Response(
    JSON.stringify({
      // legacy field (kept for backwards compat with the client)
      serverKey: hasGeminiKey(),
      // primary LLM
      geminiKey: hasGeminiKey(),
      geminiKeyCount: getGeminiKeyCount(),
      geminiModel: resolveGeminiModel(),
      // fallback LLMs
      groqKey: hasGroqKey(),
      groqKeyCount: getGroqKeyCount(),
      groqModel: resolveGroqModel(),
      mistralKey: hasMistralKey(),
      mistralKeyCount: getMistralKeyCount(),
      mistralModel: resolveMistralModel(),
      // OCR / logo / colors
      visionKey: hasVisionKey(),
      // Aliases retained for client compatibility
      model: resolveGeminiModel(),
    }),
    { headers: { 'Content-Type': 'application/json; charset=utf-8' } }
  );
}
