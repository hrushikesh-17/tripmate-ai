import Groq from "groq-sdk";

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

/**
 * Single helper used by any agent that needs an LLM call.
 * Kept generic (system + user prompt in, text out) so every agent
 * can reuse it, not just the Final Response agent.
 */
export async function askGroq(systemPrompt, userPrompt) {
  const completion = await client.chat.completions.create({
    model: process.env.GROQ_MODEL || "llama3-70b-8192",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.4,
  });

  return completion.choices[0]?.message?.content ?? "";
}
