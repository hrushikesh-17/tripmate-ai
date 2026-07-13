import { searchFlights } from "../tools/flightApi.js";
import { tavilySearch } from "../tools/tavily.js";
import { askGroq } from "../tools/groq.js";
import { getDestinationImage } from "../tools/wikipedia.js";

/**
 * 1. FLIGHT AGENT
 * Parses the user's query into structured travel params, then gathers
 * flight info from two complementary sources:
 *   - Tavily search: date-specific price estimates (the real answer to
 *     "how much will this flight cost around my travel dates")
 *   - AviationStack: a real-time sample of airlines currently flying this
 *     route (free tier can't filter by future date, so this is supporting
 *     context, not the price source — see tools/flightApi.js for why)
 * It also fetches a representative photo of the destination via Wikipedia,
 * since we already know the destination name at this point in the pipeline.
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

  const errors = [];
  let flight_results;
  let destination_image = null;

  if (parsed_request.origin && parsed_request.destination) {
    // Always get date-specific price context from Tavily — this is the
    // part that actually answers "what will this flight cost".
    const priceContext = await tavilySearch(
      `flights from ${parsed_request.origin} to ${parsed_request.destination}` +
        (parsed_request.start_date ? ` around ${parsed_request.start_date} price` : " price")
    );

    // Then add AviationStack's real-time route sample as supporting detail.
    const { flights, note, error } = await searchFlights({
      origin: parsed_request.origin,
      destination: parsed_request.destination,
    });

    if (error) {
      errors.push(`FlightAgent: AviationStack route sample unavailable (${error})`);
    }

    flight_results = {
      source: "tavily+aviationstack",
      price_estimate: priceContext.answer,
      price_sources: priceContext.results,
      route_sample: flights,
      route_sample_note: note,
    };

    // Fetch a hero image for the destination (free, no API key needed).
    destination_image = await getDestinationImage(parsed_request.destination);
  } else {
    errors.push("FlightAgent: could not extract enough info to search flights");
    flight_results = { source: "none", price_estimate: null, route_sample: [] };
  }

  return { parsed_request, flight_results, destination_image, errors };
}