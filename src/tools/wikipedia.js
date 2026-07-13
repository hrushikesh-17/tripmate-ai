import axios from "axios";

// Wikipedia's API requires a descriptive User-Agent on every request,
// or it blocks the request with a 403. This identifies our app per
// their usage policy.
const HEADERS = {
  "User-Agent": "TripMateAI/1.0 (https://github.com/hrushikesh-17/tripmate-ai)",
};

/**
 * Fetches a representative photo + short description of a destination
 * using Wikipedia's free public API. No API key, no billing account —
 * unlike Google Places, this just works out of the box.
 *
 * How it works:
 *   1. Search Wikipedia for the destination name to find the correct page
 *      (handles cases like "bali" -> "Bali" the island, not a disambiguation page)
 *   2. Fetch that page's summary, which includes a thumbnail image
 */
export async function getDestinationImage(destinationName) {
  if (!destinationName) return null;

  try {
    // Step 1: search for the best-matching page title
    const searchRes = await axios.get("https://en.wikipedia.org/w/api.php", {
      headers: HEADERS,
      params: {
        action: "query",
        list: "search",
        srsearch: destinationName,
        format: "json",
        origin: "*",
        srlimit: 1,
      },
    });

    const bestMatch = searchRes.data?.query?.search?.[0]?.title;
    if (!bestMatch) return null;

    // Step 2: fetch the summary (includes thumbnail) for that exact title
    const summaryRes = await axios.get(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(bestMatch)}`,
      { headers: HEADERS }
    );

    const data = summaryRes.data;
    if (!data?.thumbnail?.source) return null;

    return {
      title: data.title,
      image_url: data.thumbnail.source,
      description: data.extract,
      source_url: data.content_urls?.desktop?.page ?? null,
    };
  } catch (err) {
    console.error("[getDestinationImage] failed:", err.message);
    return null;
  }
}