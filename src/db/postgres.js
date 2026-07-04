import pg from "pg";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function createConversation(userId = null) {
  const { rows } = await pool.query(
    `INSERT INTO conversations (user_id) VALUES ($1) RETURNING id`,
    [userId]
  );
  return rows[0].id;
}

export async function saveMessage(conversationId, role, content) {
  await pool.query(
    `INSERT INTO messages (conversation_id, role, content) VALUES ($1, $2, $3)`,
    [conversationId, role, content]
  );
}

export async function saveTravelState(conversationId, state) {
  await pool.query(
    `INSERT INTO travel_states
      (conversation_id, user_query, parsed_request, flight_results, hotel_results, itinerary, final_response, errors)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      conversationId,
      state.user_query,
      state.parsed_request,
      state.flight_results,
      state.hotel_results,
      state.itinerary,
      state.final_response,
      JSON.stringify(state.errors ?? []),
    ]
  );
}

export async function getConversationHistory(conversationId) {
  const { rows } = await pool.query(
    `SELECT role, content, created_at FROM messages
     WHERE conversation_id = $1 ORDER BY created_at ASC`,
    [conversationId]
  );
  return rows;
}
