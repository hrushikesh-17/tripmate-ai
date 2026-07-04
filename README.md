# TripMate AI — Multi-Agent Travel Planner

Node.js + LangGraph.js implementation of the 4-agent architecture:
Flight Agent → Hotel Agent → Itinerary Agent → Final Response Agent,
all reading/writing a shared `TravelState`, persisted to Postgres.

## 1. Install dependencies

```bash
npm install
```

## 2. Set up your API keys

Copy the example env file and fill in real keys:

```bash
cp .env.example .env
```

You need free accounts / keys for:
- **Groq** — https://console.groq.com (LLM calls, generous free tier)
- **Tavily** — https://tavily.com (web search)
- **AviationStack** — https://aviationstack.com (flight data, free tier)
- **Google Maps/Places** — https://console.cloud.google.com (enable "Places API" and "Directions API")

## 3. Set up Postgres

If you don't have Postgres running locally, easiest option on Windows is
installing it via the official installer, or using a free hosted instance
(e.g. Neon, Supabase, or Railway) and pasting its connection string into
`DATABASE_URL` in `.env`.

Then create the tables:

```bash
npm run db:init
```

Expected output: `✅ Database schema created/updated successfully.`

## 4. Run the server

```bash
npm start
```

Expected output: `🧳 TripMate AI backend running on http://localhost:4000`

## 5. Test it

```bash
curl -X POST http://localhost:4000/plan-trip \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"5 days in Bali from Mumbai, budget trip for 2 people, starting Aug 1 2026\"}"
```

You should get back JSON with `final_response`, `flight_results`,
`hotel_results`, and `itinerary`.

## Project structure

```
src/
  state.js              # Shared TravelState schema (the diagram's "SHARED STATE" box)
  graph.js              # Wires the 4 agents together with LangGraph
  server.js             # Express API — POST /plan-trip
  agents/
    flightAgent.js       # 1. Extracts trip params + searches flights
    hotelAgent.js         # 2. Searches hotels via Google Places + Tavily
    itineraryAgent.js     # 3. Builds day-wise itinerary via LLM
    finalResponseAgent.js # 4. Combines everything into final answer
  tools/
    flightApi.js         # AviationStack wrapper
    tavily.js             # Tavily search wrapper
    googleMaps.js         # Google Places + Directions wrapper
    groq.js                # Groq LLM wrapper
  db/
    schema.sql           # Postgres tables
    postgres.js           # DB helper functions
    init.js                # Run this once to create tables
```

## Known limitations / next steps

- **Sequential, not parallel**: Hotel and Itinerary agents currently run
  after Flight Agent because they need the parsed destination/dates. Once
  this works end-to-end, split query-parsing into its own first node, then
  fan out Hotel + Itinerary in parallel (LangGraph supports this natively)
  for lower latency — closer to what the original diagram implies.
- **AviationStack free tier** doesn't return historical/future pricing,
  only flight schedules/status — good enough to prototype, but for real
  fares you'll eventually want Skyscanner or Amadeus's API.
- **No auth yet** — `/plan-trip` is open. Add an API key or JWT check
  before deploying this publicly.
- **Frontend**: this is backend-only. Point your existing React/Vite app's
  fetch calls at `POST http://localhost:4000/plan-trip` (or your EC2 URL
  once deployed) to wire up a UI.

## Deploying to your existing EC2 box later

Once this works locally:
1. Copy the folder to the EC2 instance (scp or git clone)
2. `npm install --production`
3. Add a `.env` there with real keys + your RDS/Postgres URL
4. Run it with PM2 (same pattern as your main app):
   `pm2 start src/server.js --name tripmate-api`
5. Add an Nginx location block to proxy `/api/tripmate/` to `localhost:4000`

Ping me when you're ready for that step and I'll walk through it with exact
commands, same as we did for the recovery runbook.
