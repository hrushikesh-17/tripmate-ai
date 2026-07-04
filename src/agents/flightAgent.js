import { searchFlights } from "../tools/flightApi.js";
import { tavilySearch } from "../tools/tavily.js";
import { askGroq } from "../tools/groq.js";

/**
 * 1. FLIGHT AGENT
 * Parses the user's query into structured travel params, then searches
 * flights via AviationStack. Falls back to a Tavily search summary if
 * the API has no data (common — AviationStack's free tier is limited).
 */
export async function flightAgent(state) {
  const { user_query } = state;

  // Extract structured fields from the free-text query with the LLM.
  const extraction = await askGroq(
    `Extract travel details from the user's message as strict JSON only,
no prose, no markdown fences. Use this shape:
{"origin": "<IATA code or city or null>", "destination": "<IATA code or city or null>",
 "start_date": "<YYYY-MM-DD or null>", "end_date": "<YYYY-MM-DD or null>",
 "travelers": <number or null>, "budget": "<string or null>"}`,
    user_query
  );

  let parsed_request = {};
  try {
    parsed_request = JSON.parse(extraction);
  } catch {
    parsed_request = {};
  }

  let flight_results;
  const errors = [];

  if (parsed_request.origin && parsed_request.destination && parsed_request.start_date) {
    const { flights, error } = await searchFlights({
      origin: parsed_request.origin,
      destination: parsed_request.destination,
      date: parsed_request.start_date,
    });
    if (error || flights.length === 0) {
      errors.push(`FlightAgent: AviationStack returned no results (${error ?? "empty"})`);
      const fallback = await tavilySearch(
        `flights from ${parsed_request.origin} to ${parsed_request.destination} around ${parsed_request.start_date} price`
      );
      flight_results = { source: "tavily_fallback", ...fallback };
    } else {
      flight_results = { source: "aviationstack", flights };
    }
  } else {
    errors.push("FlightAgent: could not extract enough info to search flights");
    flight_results = { source: "none", flights: [] };
  }

  return { parsed_request, flight_results, errors };
}
