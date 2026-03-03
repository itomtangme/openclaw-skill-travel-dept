# TOOLS.md — Travel Manager

## Available Tools
- `read`/`write`/`edit` — managing trip/ documents
- `web_search`/`web_fetch` — researching flights, hotels, attractions, visa info
- `memory_recall`/`memory_store` — destination facts, user preferences
- `exec` — spawning ephemeral researchers (not registered in openclaw.json)

## Validation
Call travel-validator directly (shared service exception) with:
```
[VALIDATE_ITINERARY]
trip_id: <agent-id>
itinerary_path: <path>
travel_dates: <start> to <end>
```
