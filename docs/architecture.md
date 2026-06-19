# Open Map architecture notes

## Request flow

1. Client sends `POST /api/landmarks` with lat/lng.
2. Server checks cache for a recent briefing in the same geohash bucket.
3. Cache hit returns the cached payload immediately.
4. Cache miss attempts Gemini grounding.
5. Gemini failure falls back to offline landmark data.
6. Server writes successful results back to the cache.

## Failure modes

| Failure | Response |
| --- | --- |
| No API key | Use offline fallback |
| Gemini quota exceeded | Use cache or offline fallback |
| Cache unavailable | Continue without cache |
| Malformed landmark tags | Warn and use fallback |
