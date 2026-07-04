import "dotenv/config";
import express from "express";
import cors from "cors";
import { tripMateGraph } from "./graph.js";
import {
  createConversation,
  saveMessage,
  saveTravelState,
  getConversationHistory,
} from "./db/postgres.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));

/**
 * POST /plan-trip
 * body: { query: string, conversationId?: string, userId?: string }
 *
 * Runs the full 4-agent LangGraph pipeline and persists the result.
 */
app.post("/plan-trip", async (req, res) => {
  const { query, conversationId, userId } = req.body;

  if (!query || typeof query !== "string") {
    return res.status(400).json({ error: "Missing 'query' string in request body." });
  }

  try {
    const convoId = conversationId || (await createConversation(userId));
    await saveMessage(convoId, "user", query);

    const result = await tripMateGraph.invoke({ user_query: query });

    await saveTravelState(convoId, result);
    await saveMessage(convoId, "assistant", result.final_response);

    res.json({
      conversationId: convoId,
      final_response: result.final_response,
      flight_results: result.flight_results,
      hotel_results: result.hotel_results,
      itinerary: result.itinerary,
      errors: result.errors,
    });
  } catch (err) {
    console.error("[/plan-trip] failed:", err);
    res.status(500).json({ error: "Trip planning failed", details: err.message });
  }
});

app.get("/conversations/:id/history", async (req, res) => {
  try {
    const history = await getConversationHistory(req.params.id);
    res.json({ history });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🧳 TripMate AI backend running on http://localhost:${PORT}`);
});
