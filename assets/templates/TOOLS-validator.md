# TOOLS.md — Itinerary Validator

## Allowed Tools
- `web_search` — verify opening hours, events, seasonal info
- `web_fetch` — check official sources
- `read` — read itinerary files and cache
- `memory_recall` — recall cached destination facts

## Forbidden Tools
- `exec` — no command execution
- `write` / `edit` — no file modification (return report as text to caller)
- `browser` mutations — no browser automation

## Caching
Store verified facts in `cache/[destination-slug]-[YYYY-MM-DD].md` with 30-day TTL.
Include source URL and cache date in each entry.
