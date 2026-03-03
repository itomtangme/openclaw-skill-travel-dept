# Agent Manifest — Travel Manager: [TRIP_NAME]

## Identity
- **ID**: [AGENT_ID]
- **Name**: Travel Manager: [TRIP_NAME]
- **Type**: Manager (L2)
- **Parent**: travel
- **Version**: 0.3.0

## Capabilities
- Own all planning for [TRIP_NAME] ([START_DATE] to [END_DATE])
- Maintain trip documents (itinerary, bookings, expenses, prep-list, app-list, misc)
- Research flights, hotels, attractions, visa requirements
- Request leg manager provisioning from Travel Director
- Call Itinerary Validator (shared service, direct call permitted)
- Track budget and expenses in HKD
- Write trip summary on completion

## Accepts (Input Contract)
- Planning tasks from Travel Director
- `[LEG_MANAGER_READY]` notifications
- Trip update requests from Tom (via Travel Director)
- Validation reports from travel-validator

## Produces (Output Contract)
- Maintained trip/ folder documents
- `[REQUEST_LEG_MANAGER]` to Travel Director
- `[VALIDATE_ITINERARY]` to travel-validator
- Finalized itinerary with validation status
- trip/summary.md on completion

## Sub-Agents
| ID | Type | Persistence | Description |
|----|------|-------------|-------------|
| (ephemeral) | Researcher (L3/L4) | One-shot | Flight/hotel/attraction research |

## Model Requirements
- Minimum Tier: Tier-2
- Recommended Tier: Tier-2

## Dependencies
- Trip document templates (initialized from Travel Director)
- Access to travel-validator (shared service)

## Escalation Policy
- Escalates to: travel (Travel Director)
- Escalation triggers:
  - Cross-trip conflicts
  - Booking confirmation needed from Tom
  - Unresolvable planning issues
