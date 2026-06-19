# Open Map

Open Map is an interactive flight-simulation dashboard that combines a live map, cockpit-style telemetry, mission tracking, and AI-generated area intelligence. It is designed to feel like a small flight-control environment where the user can move through the world, scan locations, discover landmarks, and review the surrounding context in a polished UI.

## Project description

This project is a React + Express application that gives the user a playful but functional way to explore a geographic area. The frontend simulates motion, displays telemetry, and presents discovered landmarks, while the backend handles request validation, caching, and AI fallback behavior.

The goal is to provide an experience that works even when the AI service is unavailable. If the API key is missing, if the Gemini request fails, or if the user repeatedly checks the same area, the app still returns useful information from cache or offline datasets.

## Features

### Flight and navigation experience
- Real-time aircraft telemetry for speed, altitude, heading, and position
- Keyboard controls for steering and altitude changes
- A map view that shows the current plane location and nearby landmarks
- Free-look toggle for interacting with the map without losing control of the aircraft

### Mission system
- Multiple mission types such as waypoint, discovery, and time-trial objectives
- Progress tracking and completion states
- Mission log and objective panel for quick status updates

### AI-powered scanning
- Sends the current coordinates to the backend for landmark discovery
- Uses Gemini responses to generate area summaries and relevant map points
- Parses coordinate tags from the text so the UI can render matching landmarks

### Caching and resilience
- SQLite-backed cache to reduce repeated API calls for nearby coordinates
- Rate limiting on the API endpoint to protect backend usage
- Offline fallback responses that still provide a useful briefing

### Save and restore progress
- Saves current position, mission progress, landmarks, and discovery state
- Reloads the earlier saved session from browser storage

## How it works

### 1. Frontend runtime
The app bootstraps in [src/App.tsx](src/App.tsx). From there, the main simulation logic lives in [src/hooks/useFlightSimulation.ts](src/hooks/useFlightSimulation.ts).

That hook is responsible for:
- updating current coordinates and telemetry,
- reading keyboard input,
- animating the aircraft through the simulation loop,
- checking mission progress,
- triggering scans when the user requests them or when the location changes enough,
- saving and loading progress from local storage.

The HUD in [src/components/HUD.tsx](src/components/HUD.tsx) presents the flight information and mission details, while [src/components/MapDisplay.tsx](src/components/MapDisplay.tsx) renders the map, markers, and waypoints.

### 2. Backend request flow
The server entrypoint is [server.ts](server.ts). When the client wants information about the current area, it sends a request to `POST /api/landmarks` with the current latitude and longitude.

The server performs the following steps:
1. Validates that the request includes real coordinate values.
2. Checks the cache to see whether the same area was recently scanned.
3. If there is a cache hit, the saved briefing is returned immediately.
4. If there is no cache hit, the server attempts a Gemini request.
5. If the AI response is missing usable landmarks or the API is unavailable, the server falls back to offline data.
6. The final response includes the briefing text, discovered landmarks, and metadata about the data source.

### 3. Caching behavior
The cache layer is implemented under [server/services/cache.ts](server/services/cache.ts). It uses SQLite to store recent results and keeps the app responsive for repeated scans near the same area.

This is important because it:
- reduces wasted API requests,
- avoids duplicate summaries for nearby positions,
- keeps the system useful even when the external API is slow or unavailable.

### 4. Offline fallback behavior
The offline dataset lives in [data/landmarks.json](data/landmarks.json), and the fallback loader is handled by [server/services/landmarkData.ts](server/services/landmarkData.ts).

If the AI API is unavailable, the server still builds a useful briefing by combining:
- known offline landmark entries,
- nearby procedural navigation points,
- cached results when available.

## Project structure

- [server.ts](server.ts) — server setup, API routes, and runtime behavior
- [src/App.tsx](src/App.tsx) — root app component
- [src/hooks/useFlightSimulation.ts](src/hooks/useFlightSimulation.ts) — aircraft simulation, mission logic, and scan handling
- [src/components](src/components) — HUD and map UI
- [src/services](src/services) — frontend API helpers and geospatial utilities
- [server/services](server/services) — cache, fallback data, and geographic helpers
- [data/landmarks.json](data/landmarks.json) — offline landmark dataset
- [docs/architecture.md](docs/architecture.md) — notes on request flow and failure handling

## Tech stack

- React + TypeScript
- Vite
- Express
- Leaflet and react-leaflet
- Tailwind CSS
- Gemini AI SDK
- better-sqlite3
- react-markdown

## Environment setup

Create an environment file from the example:

```bash
cp .env.example .env
```

Required values:
- `GEMINI_API_KEY` — used for live AI-powered scanning
- `APP_URL` — used by the runtime/hosting environment

## Scripts

```bash
npm install
npm run dev
npm run build
npm run lint
```

## Notes on behavior

- If geolocation is denied or unavailable, the app falls back to a default location near Paris.
- If the API key is missing, the app still runs and shows offline responses.
- If a user scans the same area repeatedly, the cache reduces duplicate requests and improves responsiveness.

## Why this project is useful

This project combines simulation, map interfaces, AI-generated storytelling, and resilient fallback design in one place. It is useful for demos, exploratory prototypes, and interactive experiences where the user benefits from both live intelligence and reliable offline behavior.
