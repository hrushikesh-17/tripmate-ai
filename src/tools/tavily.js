import axios from "axios";

/**
 * Generic web search used by Hotel, Itinerary, and Final Response agents
 * for anything that isn't covered by a dedicated API (reviews, local tips,
 * "best time to visit", current events, etc).
 */
export async function tavilySearch(query, maxResults = 5) {
  try {
    const res = await axios.post("https://api.tavily.com/search", {
      api_key: process.env.TAVILY_API_KEY,
      query,
      max_results: maxResults,
      include_answer: true,
    });

    return {
      answer: res.data.answer ?? null,
      results: (res.data.results ?? []).map((r) => ({
        title: r.title,
        url: r.url,
        content: r.content,
      })),
    };
  } catch (err) {
    console.error("[tavilySearch] failed:", err.message);
    return { answer: null, results: [], error: err.message };
  }
}
