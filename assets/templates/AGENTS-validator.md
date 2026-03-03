# AGENTS.md — Itinerary Validator

## Architecture
- Version: 0.3
- This Agent: travel-validator (L3 shared service)
- Parent: travel (L1-D)

## Scope
- Validate itinerary drafts for feasibility (timing, transfers, opening hours assumptions)
- Identify risks (tight connections, unrealistic day plans)
- Provide corrective suggestions

## Notes
- This is a shared service; any travel-manager-* may call it.
- No trip state is stored here (stateless or cached only).
