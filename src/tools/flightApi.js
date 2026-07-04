import axios from "axios";

/**
 * Free Flight API (AviationStack) — used by the Flight Agent.
 * Note: the free tier only returns real-time/scheduled flight data,
 * not historical fare pricing. For actual bookable prices you'd eventually
 * swap this for Skyscanner/Amadeus, but this is fine to prototype with.
 */
export async function searchFlights({ origin, destination, date }) {
  try {
    const res = await axios.get("http://api.aviationstack.com/v1/flights", {
      params: {
        access_key: process.env.AVIATIONSTACK_API_KEY,
        dep_iata: origin,
        arr_iata: destination,
        flight_date: date,
      },
    });

    const flights = (res.data.data ?? []).slice(0, 10).map((f) => ({
      airline: f.airline?.name,
      flight_number: f.flight?.iata,
      departure: {
        airport: f.departure?.airport,
        scheduled: f.departure?.scheduled,
      },
      arrival: {
        airport: f.arrival?.airport,
        scheduled: f.arrival?.scheduled,
      },
      status: f.flight_status,
    }));

    return { flights, error: null };
  } catch (err) {
    console.error("[searchFlights] failed:", err.message);
    return { flights: [], error: err.message };
  }
}
