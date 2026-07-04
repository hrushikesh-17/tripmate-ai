import axios from "axios";

const KEY = () => process.env.GOOGLE_MAPS_API_KEY;

/**
 * Places text search — used by Hotel Agent (find hotels) and
 * Itinerary Agent (find attractions/restaurants).
 */
export async function placesTextSearch(query) {
  if (!KEY()) return { places: [], error: "GOOGLE_MAPS_API_KEY not set" };
  try {
    const res = await axios.get(
      "https://maps.googleapis.com/maps/api/place/textsearch/json",
      { params: { query, key: KEY() } }
    );

    const places = (res.data.results ?? []).slice(0, 10).map((p) => ({
      name: p.name,
      address: p.formatted_address,
      rating: p.rating,
      user_ratings_total: p.user_ratings_total,
      price_level: p.price_level,
      location: p.geometry?.location,
      place_id: p.place_id,
    }));

    return { places, error: null };
  } catch (err) {
    console.error("[placesTextSearch] failed:", err.message);
    return { places: [], error: err.message };
  }
}

/**
 * Directions — used by Itinerary Agent to sequence a day's stops sensibly
 * (e.g. estimate travel time between attractions).
 */
export async function getDirections(origin, destination, mode = "walking") {
  if (!KEY()) return { route: null, error: "GOOGLE_MAPS_API_KEY not set" };
  try {
    const res = await axios.get(
      "https://maps.googleapis.com/maps/api/directions/json",
      { params: { origin, destination, mode, key: KEY() } }
    );

    const leg = res.data.routes?.[0]?.legs?.[0];
    if (!leg) return { route: null, error: "No route found" };

    return {
      route: {
        distance: leg.distance?.text,
        duration: leg.duration?.text,
        start_address: leg.start_address,
        end_address: leg.end_address,
      },
      error: null,
    };
  } catch (err) {
    console.error("[getDirections] failed:", err.message);
    return { route: null, error: err.message };
  }
}
