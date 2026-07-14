import { placesTextSearch } from "../tools/googleMaps.js";
import { tavilySearch } from "../tools/tavily.js";
import { askGroq } from "../tools/groq.js";

/**
 * 3. ITINERARY AGENT
 * Finds attractions/activities via Google Places + Tavily, then asks the
 * LLM to arrange them into a day-wise plan matching the trip length.
 */
export async function itineraryAgent(state) {
  const { parsed_request } = state;
  const destination = parsed_request?.destination;
  const errors = [];

  if (!destination) {
    errors.push("ItineraryAgent: no destination available, skipping itinerary");
    return { itinerary: null, errors };
  }

  const tripLength = tripLengthInDays(parsed_request.start_date, parsed_request.end_date) || 3;

  const { places } = await placesTextSearch(`top attractions and things to do in ${destination}`);
  const { answer } = await tavilySearch(`must-do activities in ${destination} for ${tripLength} days`);

  const placesText = places.map((p) => `- ${p.name} (rating ${p.rating ?? "N/A"})`).join("\n");

  const itineraryText = await askGroq(
    `You are a travel planner. Build a day-wise itinerary as strict JSON only,
no prose, no markdown fences, shape:
{"days": [{"day": 1, "theme": "string", "activities": ["string", ...]}]}
If any activity mentions a cost, use Indian Rupees (₹) only — never USD or any other currency.`,
    `Destination: ${destination}
Trip length: ${tripLength} days
Candidate places:\n${placesText}
Extra context: ${answer ?? "none"}`
  );

  let itinerary;
  try {
    itinerary = JSON.parse(itineraryText);
  } catch {
    errors.push("ItineraryAgent: LLM did not return valid JSON, storing raw text");
    itinerary = { raw: itineraryText };
  }

  return { itinerary, errors };
}

function tripLengthInDays(start, end) {
  if (!start || !end) return null;
  const days = Math.round((new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24));
  return days > 0 ? days + 1 : null;
}
