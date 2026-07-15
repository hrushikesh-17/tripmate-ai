import Groq from "groq-sdk";
import axios from "axios";

const groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });

/**
 * Multi-provider LLM call with automatic fallback.
 *
 * Tries Groq first (fastest, primary provider). If Groq fails for any
 * reason — most commonly hitting its free-tier daily/per-minute rate
 * limit — it automatically retries the same prompt on Gemini, and if
 * that also fails, on OpenRouter (a free model). This means a single
 * provider's rate limit no longer breaks the app for users; it just
 * quietly hands off to the next available provider.
 *
 * All three providers here are safe for real (commercial) usage on
 * their free tiers — unlike some free trial keys (e.g. Cohere's) that
 * explicitly prohibit production use.
 */
export async function askLLM(systemPrompt, userPrompt, maxTokens = 4096) {
  const attempts = [
    { name: "Groq", fn: () => askGroq(systemPrompt, userPrompt, maxTokens) },
    { name: "Gemini", fn: () => askGemini(systemPrompt, userPrompt, maxTokens) },
    { name: "OpenRouter", fn: () => askOpenRouter(systemPrompt, userPrompt, maxTokens) },
  ];

  let lastError;
  for (const attempt of attempts) {
    try {
      const result = await attempt.fn();
      if (result && result.trim()) return result;
    } catch (err) {
      lastError = err;
      console.error(`[askLLM] ${attempt.name} failed, trying next provider:`, err.message);
    }
  }

  throw new Error(`All LLM providers failed. Last error: ${lastError?.message}`);
}

async function askGroq(systemPrompt, userPrompt, maxTokens) {
  const completion = await groqClient.chat.completions.create({
    model: process.env.GROQ_MODEL || "openai/gpt-oss-120b",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.4,
    max_tokens: maxTokens,
  });
  return completion.choices[0]?.message?.content ?? "";
}

async function askGemini(systemPrompt, userPrompt, maxTokens) {
  const res = await axios.post(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent",
    {
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: { maxOutputTokens: maxTokens, temperature: 0.4 },
    },
    { headers: { "x-goog-api-key": process.env.GEMINI_API_KEY, "Content-Type": "application/json" } }
  );
  return res.data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

async function askOpenRouter(systemPrompt, userPrompt, maxTokens) {
  const res = await axios.post(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      model: "openrouter/free",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: maxTokens,
      temperature: 0.4,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
    }
  );
  return res.data?.choices?.[0]?.message?.content ?? "";
}