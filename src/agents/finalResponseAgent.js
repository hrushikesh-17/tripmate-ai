import { askGroq } from "../tools/groq.js";

/**
 * 4. FINAL RESPONSE AGENT
 * Combines flight_results + hotel_results + itinerary into one
 * user-facing, well-formatted trip plan.
 */
export async function finalResponseAgent(state) {
  const { user_query, flight_results, hotel_results, itinerary, errors } = state;

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
data is missing, don't apologize excessively — just present what you have.`;

  const final_response = await askGroq(
    "You are TripMate AI, a helpful travel planning assistant.",
    prompt
  );

  return {
    final_response,
    messages: [{ role: "assistant", content: final_response }],
  };
}
