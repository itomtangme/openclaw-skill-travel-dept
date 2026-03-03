# Provision Trip Manager — Step-by-Step Guide

This guide is for **Travel Director** to follow when provisioning a new L2 Trip Manager.

## Prerequisites
- Confirmed planning intent from Tom (not just exploratory)
- Trip details: name, dates, destination, whether it's a parent trip or leg

## Steps

### 1. Determine Agent ID

| Scope | Format | Example |
|---|---|---|
| Region/month trip | `travel-manager-YYYYMM-<RegionSlug>` | `travel-manager-202605-Europe` |
| Country/date leg | `travel-manager-YYYYMMDD-<CountrySlug>` | `travel-manager-20260515-England` |

- YYYY/MM/DD = departure date
- Slug: PascalCase, English, no spaces
- IDs are immutable once assigned

### 2. Create TRIPS.md Entry

Add a row to `workspace-travel/TRIPS.md`:

```markdown
| [TRIP_ID] | [AGENT_ID] | [PARENT_TRIP or —] | planning | [DATES] | [DESCRIPTION] |
```

### 3. Create Workspace

```bash
AGENT_ID="travel-manager-YYYYMMDD-Slug"
WS="/root/.openclaw/workspace-${AGENT_ID}"

mkdir -p "${WS}/trip"
```

### 4. Copy and Populate Templates

From `workspace-travel/templates/` (or from the skill's `assets/templates/`):

1. Copy `SOUL-manager.md` → `${WS}/SOUL.md` — replace placeholders
2. Copy `IDENTITY-manager.md` → `${WS}/IDENTITY.md` — replace placeholders
3. Copy `TOOLS-manager.md` → `${WS}/TOOLS.md`
4. Create `${WS}/USER.md` with Tom's details

For trip documents, copy from `assets/templates/trip/`:
- `itinerary-template.md` → `${WS}/trip/itinerary.md`
- `bookings-template.md` → `${WS}/trip/bookings.md`
- `expenses-template.md` → `${WS}/trip/expenses.md`
- `prep-list-template.md` → `${WS}/trip/prep-list.md`
- `app-list-template.md` → `${WS}/trip/app-list.md`
- `misc-template.md` → `${WS}/trip/misc.md`

For parent trips only, also copy:
- `budget-overview-template.md` → `${WS}/trip/budget-overview.md`

Replace all placeholders: `[TRIP_NAME]`, `[TRIP_ID]`, `[AGENT_ID]`, `[START_DATE]`, `[END_DATE]`

### 5. Add Agent to openclaw.json

Read current config, merge new agent entry:

```json
{
  "id": "<agent-id>",
  "name": "Travel Manager: <Trip Name>",
  "workspace": "workspace-<agent-id>",
  "identity": {
    "emoji": "🗺️"
  }
}
```

> **Note:** Do not add `tier`, `layer`, `parent`, `persistent` to openclaw.json — these are not recognized config keys and will crash the gateway. Store them in the agent's SOUL.md instead.

### 6. Update Travel Director AGENTS.md

Add entry to the "Trip Managers (dynamic)" table in `workspace-travel/AGENTS.md`.

### 7. Restart Gateway

```bash
openclaw gateway restart
```

### 8. Notify

If this is a leg manager requested by a parent manager, notify the parent:

```
[LEG_MANAGER_READY]
agent-id: <agent-id>
workspace: workspace-<agent-id>
```

### 9. Spawn Manager

Send initial task to the new manager with trip context.

## Deprovisioning (on trip completion)

See Trip Completion Protocol in the spec. Key points:
1. Manager writes summary.md
2. Status → archived in TRIPS.md
3. Remove from openclaw.json and AGENTS.md (but keep workspace files)
4. Restart gateway
5. For multi-leg: deregister legs before parent
