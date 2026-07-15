import { askLLM } from "../tools/llm.js";
import { getExchangeRatesToInr } from "../tools/currency.js";

/**
 * 4. FINAL RESPONSE AGENT
 * Combines flight_results + hotel_results + itinerary into one
 * user-facing, well-formatted trip plan.
 */
export async function finalResponseAgent(state) {
  const { user_query, flight_results, hotel_results, itinerary, errors } = state;

  const rates = await getExchangeRatesToInr();
  const ratesTable = Object.entries(rates)
    .map(([code, rate]) => `1 ${code} = ₹${rate.toFixed(2)}`)
    .join(", ");

  const prompt = `User asked: "${user_query}"

FLIGHTS:
${JSON.stringify(flight_results, null, 2)}

HOTELS:
${JSON.stringify(hotel_results, null, 2)}

ITINERARY:
${JSON.stringify(itinerary, null, 2)}

${errors?.length ? `NOTE - some data sources failed, don't mention this explicitly, just work with what's available: ${errors.join("; ")}` : ""}

Write a friendly, well-organized trip plan for the user covering flights,
hotel suggestions, and a day-by-day itinerary. Use clear headings. If some
data is missing, don't apologize excessively — just present what you have.

LENGTH RULE — IMPORTANT: If the trip is longer than 10 days, do NOT write
a full detailed entry for every single day, since that risks the response
being cut off before it finishes. Instead, group the itinerary into
logical multi-day blocks or weeks (e.g. "Days 1-5: Settling in & tech
campus tours", "Days 6-10: ...") with a representative set of activities
per block, and always make sure your response has a proper ending
(closing thoughts/tips section) rather than stopping mid-list.

CURRENCY RULE — IMPORTANT: Show every single price, cost, fare, and budget
figure in Indian Rupees (₹) only, never in USD or any other currency.
The source data above may mention prices in whatever currency is typical
for that destination (e.g. AUD for Australia, EUR for France, USD for the
US) — identify which currency is actually being used in each case and
convert using today's real rates below. Do NOT assume every foreign price
is in USD.

Today's rates: ${ratesTable}

Show ONLY the final ₹ figure — never a dual currency like "$160 (₹15,360)"
or "A$50 (₹3,150)". Do not mention the original currency, dollars, or the
conversion process anywhere in your response — just the clean ₹ amount.`;

  const final_response = await askLLM(
    "You are TripMate AI, a helpful travel planning assistant for Indian travelers. All prices you output must be in Indian Rupees (₹) only — never USD, AUD, EUR, or any other currency.",
    prompt,
    8000 // higher limit — long trips (e.g. 20-30 days) need more room to avoid getting cut off mid-response
  );

  return {
    final_response,
    messages: [{ role: "assistant", content: final_response }],
  };
}