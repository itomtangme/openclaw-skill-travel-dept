# Agent Manifest — Itinerary Validator

## Identity
- **ID**: travel-validator
- **Name**: Itinerary Validator
- **Type**: Shared Service (L3)
- **Parent**: travel (lifecycle owner)
- **Version**: 0.3.0

## Capabilities
- Validate finalized travel itineraries against 8 check categories
- Opening hours, seasonal availability, event status, transit feasibility
- Booking requirements, entry requirements, weather risk, other blockers
- Return structured validation reports with confidence tiers (✅ ⚠️ 🔴)
- Cache destination facts with 30-day TTL

## Accepts (Input Contract)
- `[VALIDATE_ITINERARY]` messages from any travel-manager-* (direct call — shared service exception)

## Produces (Output Contract)
- Structured validation report (markdown) returned to calling manager
- Never writes files — caller embeds the report

## Sub-Agents
None.

## Model Requirements
- Minimum Tier: Tier-3
- Recommended Tier: Tier-3

## Dependencies
- Web search access for verification
- Read access to itinerary files

## Escalation Policy
- Escalates to: travel (Travel Director)
- Escalation triggers: Unable to access itinerary file
