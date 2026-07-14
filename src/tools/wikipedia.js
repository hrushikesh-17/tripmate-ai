import axios from "axios";

export async function getDestinationImage(destinationName) {
  if (!destinationName) return null;

  for (const query of [`${destinationName} landmark`, destinationName]) {
    try {
      const res = await axios.get("https://api.unsplash.com/search/photos", {
        params: { query, per_page: 1, orientation: "landscape" },
        headers: { Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}` },
      });

      const photo = res.data?.results?.[0];
      if (photo) {
        return {
          title: destinationName,
          image_url: photo.urls?.regular,
          description: photo.alt_description ?? null,
          photographer: photo.user?.name ?? null,
          photographer_url: photo.user?.links?.html ?? null,
          source_url: photo.links?.html ?? null,
        };
      }
    } catch (err) {
      console.error(`[getDestinationImage] Unsplash search "${query}" failed:`, err.message);
    }
  }

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
    if (!data?.thumbnail?.source) return null;

    return {
      title: data.title,
      image_url: data.thumbnail.source,
      description: data.extract,
      source_url: data.content_urls?.desktop?.page ?? null,
    };
  } catch (err) {
    console.error("[getDestinationImage] Wikipedia fallback failed:", err.message);
    return null;
  }
}