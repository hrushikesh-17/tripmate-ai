import { StateGraph, START, END } from "@langchain/langgraph";
import { TravelState } from "./state.js";
import { flightAgent } from "./agents/flightAgent.js";
import { hotelAgent } from "./agents/hotelAgent.js";
import { itineraryAgent } from "./agents/itineraryAgent.js";
import { finalResponseAgent } from "./agents/finalResponseAgent.js";

/**
 * NOTE on ordering vs. the diagram:
 * The diagram shows all 4 agents fanning out from the top, implying
 * parallelism. In practice, Hotel and Itinerary both need `parsed_request`
 * (origin/destination/dates), which Flight Agent extracts. So this graph
 * runs Flight -> Hotel -> Itinerary -> Final Response sequentially.
 * This is simpler to build and debug first. Once it works end-to-end,
 * a good next step is splitting query-parsing into its own node and
 * running Hotel + Itinerary in parallel branches (LangGraph supports
 * fan-out/fan-in natively) for lower latency.
 */
const graph = new StateGraph(TravelState)
  .addNode("flight_agent", flightAgent)
  .addNode("hotel_agent", hotelAgent)
  .addNode("itinerary_agent", itineraryAgent)
  .addNode("final_response_agent", finalResponseAgent)
  .addEdge(START, "flight_agent")
  .addEdge("flight_agent", "hotel_agent")
  .addEdge("hotel_agent", "itinerary_agent")
  .addEdge("itinerary_agent", "final_response_agent")
  .addEdge("final_response_agent", END);

export const tripMateGraph = graph.compile();
