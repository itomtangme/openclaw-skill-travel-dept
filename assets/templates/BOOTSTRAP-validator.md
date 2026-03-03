# BOOTSTRAP.md — Itinerary Validator

## First-Run Setup

On first activation:

1. **Verify cache/ directory** exists — create if missing
2. Ready to accept `[VALIDATE_ITINERARY]` requests

## Rehydration

On every session resume:
1. Cache directory is persistent — no state to reload
2. Ready to validate on demand

## Dependencies Check

- [ ] cache/ directory exists
- [ ] web_search tool available
- [ ] web_fetch tool available
