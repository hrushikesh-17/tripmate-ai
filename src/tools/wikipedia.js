import axios from "axios";

// Wikipedia/Wikimedia's API requires a descriptive User-Agent on every
// request, or it blocks the request with a 403.
const HEADERS = {
  "User-Agent": "TripMateAI/1.0 (https://github.com/hrushikesh-17/tripmate-ai)",
};

// The Wikipedia page "summary" thumbnail is whatever image sits in that
// page's infobox — for places, that's sometimes a locator map, a flag, or
// a coat of arms instead of an actual photo. We filter those out by
// checking the filename for these keywords.
const BAD_IMAGE_KEYWORDS = [
  "map", "flag", "coa_", "coat_of_arms", "locator", "logo", "seal_of",
  "location_", "svg", // svg maps/diagrams are almost never real photos
];

function looksLikeRealPhoto(filename) {
  const lower = filename.toLowerCase();
  return !BAD_IMAGE_KEYWORDS.some((bad) => lower.includes(bad));
}

/**
 * Fetches a representative *photo* of a destination by searching
 * Wikimedia Commons (Wikipedia's photo library) directly, rather than
 * relying on a Wikipedia article's infobox image — which is often a map
 * or flag for country/region-level pages, not a scenic photo.
 */
export async function getDestinationImage(destinationName) {
  if (!destinationName) return null;

  try {
    // Step 1: search Commons' File namespace for photos of this place
    const searchRes = await axios.get("https://commons.wikimedia.org/w/api.php", {
      headers: HEADERS,
      params: {
        action: "query",
        list: "search",
        srsearch: `${destinationName} tourism OR landscape OR skyline`,
        srnamespace: 6, // 6 = File namespace
        format: "json",
        origin: "*",
        srlimit: 10,
      },
    });

    const candidates = (searchRes.data?.query?.search ?? []).map((r) => r.title);
    const goodTitle = candidates.find(looksLikeRealPhoto);

    if (!goodTitle) {
      // Fall back to the old approach if Commons search turns up nothing usable
      return await getFallbackSummaryImage(destinationName);
    }

    // Step 2: get the actual image URL for that file
    const infoRes = await axios.get("https://commons.wikimedia.org/w/api.php", {
      headers: HEADERS,
      params: {
        action: "query",
        titles: goodTitle,
        prop: "imageinfo",
        iiprop: "url|extmetadata",
        iiurlwidth: 800,
        format: "json",
        origin: "*",
      },
    });

    const pages = infoRes.data?.query?.pages ?? {};
    const page = Object.values(pages)[0];
    const imageInfo = page?.imageinfo?.[0];
    if (!imageInfo) return await getFallbackSummaryImage(destinationName);

    return {
      title: destinationName,
      image_url: imageInfo.thumburl || imageInfo.url,
      description: imageInfo.extmetadata?.ImageDescription?.value?.replace(/<[^>]+>/g, "") ?? null,
      source_url: `https://commons.wikimedia.org/wiki/${encodeURIComponent(goodTitle)}`,
    };
  } catch (err) {
    console.error("[getDestinationImage] Commons search failed:", err.message);
    return await getFallbackSummaryImage(destinationName);
  }
}

// Original approach, kept as a fallback for destinations Commons search
// doesn't handle well (e.g. very small/obscure places).
async function getFallbackSummaryImage(destinationName) {
  try {
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
    console.error("[getFallbackSummaryImage] failed:", err.message);
    return null;
  }
}