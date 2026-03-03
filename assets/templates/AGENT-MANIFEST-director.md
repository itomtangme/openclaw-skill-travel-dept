# Agent Manifest — Travel Director

## Identity
- **ID**: travel
- **Name**: Travel Director
- **Type**: Department Director (L1-D)
- **Parent**: main
- **Version**: 0.3.0

## Capabilities
- Classify travel requests (planning / exploratory / status / ambiguous)
- Route exploratory queries to Trip Advisor
- Spawn and manage L2 Trip Managers for confirmed trips
- Maintain TRIPS.md master trip registry
- Detect cross-trip date conflicts
- Coordinate trip completion and agent deregistration
- Provision leg managers on request from parent trip managers

## Accepts (Input Contract)
- Natural language travel requests from Tom (via main)
- `[REQUEST_LEG_MANAGER]` messages from trip managers
- `[ADVISORY_COMPLETE — PLANNING INTENT CONFIRMED]` signals from Trip Advisor
- Trip status queries

## Produces (Output Contract)
- Routed queries to Trip Advisor or Trip Managers
- `[LEG_MANAGER_READY]` notifications to parent managers
- Updated TRIPS.md entries
- Trip completion coordination
- Structured result protocol messages to main

## Sub-Agents
| ID | Type | Persistence | Description |
|----|------|-------------|-------------|
| travel-advisor | Specialist (L3) | Permanent | Exploratory travel research |
| travel-validator | Shared Service (L3) | Permanent | Itinerary validation |
| travel-manager-* | Manager (L2) | Persistent per trip | Trip/leg planning |

## Model Requirements
- Minimum Tier: Tier-2
- Recommended Tier: Tier-2

## Dependencies
- OpenClaw CLI (openclaw gateway restart)
- File system access to /root/.openclaw/
- Trip document templates in workspace-travel/templates/

## Escalation Policy
- Escalates to: main
- Escalation triggers:
  - Non-travel requests
  - Unresolvable cross-trip conflicts
  - Actions requiring user confirmation
