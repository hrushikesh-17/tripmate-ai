import axios from "axios";

// Words that suggest a result is a map/diagram/illustration rather than
// an actual travel photo — used to skip bad candidates from both sources.
const BAD_KEYWORDS = ["map", "illustration", "diagram", "flag", "icon", "logo", "chart"];

function looksBad(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  return BAD_KEYWORDS.some((bad) => lower.includes(bad));
}

/**
 * Fetches a representative travel photo of a destination, trying
 * multiple sources from most to least specific, and filtering out
 * maps/flags/diagrams at every step (these keep sneaking through
 * otherwise, e.g. a "world map of Bali" showing up instead of an
 * actual photo).
 *
 *   1. Unsplash search for "{destination} landmark" — checks a few
 *      candidates, skips anything that looks like a map/diagram.
 *   2. Unsplash search for just "{destination}" — broader fallback.
 *   3. Wikipedia's lead image for the destination's article — last
 *      resort for places Unsplash doesn't cover well, still filtered.
 */
export async function getDestinationImage(destinationName) {
  if (!destinationName) return null;

  // --- Tier 1 & 2: Unsplash ---
  for (const query of [`${destinationName} landmark`, destinationName]) {
    try {
      const res = await axios.get("https://api.unsplash.com/search/photos", {
        params: { query, per_page: 6, orientation: "landscape" },
        headers: { Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}` },
      });

      const results = res.data?.results ?? [];
      const goodPhoto = results.find(
        (p) => !looksBad(p.alt_description) && !looksBad(p.description)
      );

      if (goodPhoto) {
        return {
          title: destinationName,
          image_url: goodPhoto.urls?.regular,
          description: goodPhoto.alt_description ?? null,
          photographer: goodPhoto.user?.name ?? null,
          photographer_url: goodPhoto.user?.links?.html ?? null,
          source_url: goodPhoto.links?.html ?? null,
        };
      }
    } catch (err) {
      console.error(`[getDestinationImage] Unsplash search "${query}" failed:`, err.message);
    }
  }

  // --- Tier 3: Wikipedia fallback ---
  try {
    const headers = {
      "User-Agent": "TripMateAI/1.0 (https://github.com/hrushikesh-17/tripmate-ai)",
    };
    const searchRes = await axios.get("https://en.wikipedia.org/w/api.php", {
      headers,
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

    const summaryRes = await axios.get(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(bestMatch)}`,
      { headers }
    );
    const data = summaryRes.data;
    const thumbUrl = data?.thumbnail?.source;

    // Skip if the thumbnail URL itself looks like a map/flag/logo file
    if (!thumbUrl || looksBad(thumbUrl)) return null;

    return {
      title: data.title,
      image_url: thumbUrl,
      description: data.extract,
      source_url: data.content_urls?.desktop?.page ?? null,
    };
  } catch (err) {
    console.error("[getDestinationImage] Wikipedia fallback failed:", err.message);
    return null;
  }
}