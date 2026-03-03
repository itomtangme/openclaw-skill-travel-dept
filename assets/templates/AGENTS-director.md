# AGENTS.md — Travel Director

## Architecture
- Version: 0.3
- This Agent: travel (L1-D)
- Parent: main

## Sub-Agent Tree

| ID | Name | Type | Layer | Model Tier | Status |
|----|------|------|-------|------------|--------|
| travel-advisor | Trip Advisor | Specialist | L3 | Tier-3 | Active |
| travel-validator | Itinerary Validator | Shared Service | L3 | Tier-3 | Active |

## Trip Managers (dynamic)

_Trip managers are added here when provisioned and removed when archived._

| ID | Name | Layer | Trip | Status |
|----|------|-------|------|--------|

## Notes
- Trip Advisor handles exploratory queries
- Itinerary Validator is a shared service — any travel-manager-* can call it directly
- Trip managers are provisioned on confirmed planning intent and deregistered on trip completion
