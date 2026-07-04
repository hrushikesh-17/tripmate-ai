import { Annotation } from "@langchain/langgraph";

/**
 * TravelState — the shared state object every agent reads from and writes to.
 * This is the "SHARED STATE (TravelState)" box in the architecture diagram.
 *
 * Each field uses a "reducer" function that decides how new agent output
 * gets merged into the existing state. Most fields just get overwritten
 * (`(old, next) => next ?? old`), except `messages`, which accumulates.
 */
export const TravelState = Annotation.Root({
  // Original user request, e.g. "5 days in Bali for 2 people, budget trip"
  user_query: Annotation({
    reducer: (old, next) => next ?? old,
    default: () => "",
  }),

  // Structured version of the query the parser/flight agent extracts
  // e.g. { origin, destination, start_date, end_date, travelers, budget }
  parsed_request: Annotation({
    reducer: (old, next) => ({ ...old, ...next }),
    default: () => ({}),
  }),

  // Output of the Flight Agent
  flight_results: Annotation({
    reducer: (old, next) => next ?? old,
    default: () => null,
  }),

  // Output of the Hotel Agent
  hotel_results: Annotation({
    reducer: (old, next) => next ?? old,
    default: () => null,
  }),

  // Output of the Itinerary Agent
  itinerary: Annotation({
    reducer: (old, next) => next ?? old,
    default: () => null,
  }),

  // Output of the Final Response Agent — what actually gets shown to the user
  final_response: Annotation({
    reducer: (old, next) => next ?? old,
    default: () => "",
  }),

  // Running conversation history (accumulates across turns)
  messages: Annotation({
    reducer: (old, next) => old.concat(next),
    default: () => [],
  }),

  // Any errors an agent hit, so the final agent can gracefully degrade
  errors: Annotation({
    reducer: (old, next) => old.concat(next),
    default: () => [],
  }),
});
