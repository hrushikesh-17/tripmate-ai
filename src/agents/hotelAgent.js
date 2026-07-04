import { placesTextSearch } from "../tools/googleMaps.js";
import { tavilySearch } from "../tools/tavily.js";

/**
 * 2. HOTEL AGENT
 * Searches hotels near the destination using Google Places, and enriches
 * with a Tavily search for general "best hotels in X" write-ups/reviews.
 */
export async function hotelAgent(state) {
  const { parsed_request } = state;
  const destination = parsed_request?.destination;
  const errors = [];

  if (!destination) {
    errors.push("HotelAgent: no destination available, skipping hotel search");
    return { hotel_results: { hotels: [], reviews: null }, errors };
  }

  const budgetHint = parsed_request?.budget ? ` ${parsed_request.budget}` : "";
  const { places, error } = await placesTextSearch(`hotels in ${destination}${budgetHint}`);

  if (error) errors.push(`HotelAgent: Google Places error - ${error}`);

  const { answer } = await tavilySearch(`best hotels to stay in ${destination}${budgetHint} 2026`);

  return {
    hotel_results: {
      hotels: places,
      reviews_summary: answer,
    },
    errors,
  };
}
