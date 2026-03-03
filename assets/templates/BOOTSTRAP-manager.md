# BOOTSTRAP.md — Travel Manager: [TRIP_NAME]

## First-Run Setup

On first activation:

1. **Initialize trip/ folder** — if trip documents don't exist, copy templates from Travel Director's `workspace-travel/templates/` and replace placeholders:
   - `[TRIP_NAME]` → actual trip name
   - `[TRIP_ID]` → trip ID
   - `[AGENT_ID]` → this agent's ID
   - `[START_DATE]` → trip start date
   - `[END_DATE]` → trip end date
2. **Read initial context** provided by Travel Director in the spawn message

## Rehydration

On every session resume:
1. Read all files in trip/ folder to restore trip state
2. Check itinerary.md for current planning status
3. Check bookings.md for committed bookings
4. Check expenses.md for budget status
5. Ready to continue planning

## Dependencies Check

- [ ] trip/itinerary.md exists
- [ ] trip/bookings.md exists
- [ ] trip/expenses.md exists
- [ ] trip/prep-list.md exists
- [ ] trip/app-list.md exists
- [ ] trip/misc.md exists
- [ ] travel-validator is accessible (shared service)
