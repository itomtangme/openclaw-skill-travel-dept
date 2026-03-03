# Travel Department — OpenClaw Skill

An OpenClaw agent skill that implements a complete **Travel Department** with hierarchical agent management for trip planning, research, and itinerary validation.

## Architecture

```
L0 Orchestrator (main)
└── L1-D Travel Director (travel)              ✈️  Tier-2, permanent
    ├── L3 Trip Advisor (travel-advisor)        💡  Tier-3, permanent
    ├── L3 Itinerary Validator (travel-validator) ✅  Tier-3, permanent, shared service
    └── L2 Trip Manager (travel-manager-*)      🗺️  Tier-2, persistent per trip
        └── L2 Leg Manager (travel-manager-*)        per-leg (multi-leg trips)
```

## Install

```bash
# Copy skill folder into your OpenClaw skills directory
cp -r travel-dept ~/.openclaw/skills/

# Follow setup steps in SKILL.md
```

See [SKILL.md](SKILL.md) for full setup instructions.

## Configuration

- **Currency:** HKD (all foreign amounts converted)
- **Proactive reminders:** Only on explicit request
- **Completed trips:** Agents deregistered but workspace files preserved forever

## Usage Examples

### Exploratory query (no manager created)

> "How is Japan in June?"

Routes to **Trip Advisor** → researched response about weather, crowds, costs. No trip registry entry created.

### Planning a trip

> "Plan my Europe trip in May 2026."

Travel Director confirms intent → spawns `travel-manager-202605-Europe` → creates workspace with all trip documents.

### Multi-leg example: Europe 2026

```
travel-manager-202605-Europe        (parent — budget overview)
├── travel-manager-20260515-England (leg 1: May 15–24)
└── travel-manager-20260525-Iceland (leg 2: May 25–Jun 1)
```

Each leg manager has its own independent `trip/` folder with itinerary, bookings, expenses, prep-list, app-list, and misc files.

## Naming Conventions

| Scope | Agent ID Format | Example |
|---|---|---|
| Region/month trip | `travel-manager-YYYYMM-<RegionSlug>` | `travel-manager-202605-Europe` |
| Country/date leg | `travel-manager-YYYYMMDD-<CountrySlug>` | `travel-manager-20260515-England` |

- Slugs: PascalCase, English, no spaces
- IDs are immutable once assigned
- Workspace: `workspace-<agent-id>`

## Folder Layout

```
workspace-travel/               ← Travel Director
├── SOUL.md, IDENTITY.md, TOOLS.md, AGENTS.md, USER.md
├── TRIPS.md                    ← master trip registry
└── templates/                  ← trip document templates

workspace-travel-advisor/       ← Trip Advisor (L3)
├── SOUL.md, IDENTITY.md, TOOLS.md, USER.md

workspace-travel-validator/     ← Itinerary Validator (L3)
├── SOUL.md, IDENTITY.md, TOOLS.md, USER.md
└── cache/                      ← 30-day TTL fact cache

workspace-travel-manager-*/     ← Trip Managers (L2, per trip)
├── SOUL.md, IDENTITY.md, TOOLS.md, USER.md
└── trip/
    ├── itinerary.md, bookings.md, expenses.md
    ├── prep-list.md, app-list.md, misc.md
    ├── summary.md              ← written at completion
    └── budget-overview.md      ← parent trips only
```

## Creating & Rehydrating Managers

### Creating a new manager

Travel Director handles all provisioning. See `scripts/provision-trip-manager.md`. The flow:

1. Travel Director creates TRIPS.md entry
2. Creates workspace from templates (replacing placeholders)
3. Adds agent to `openclaw.json`
4. Restarts gateway
5. Spawns manager with initial context

### Rehydrating an existing manager

When a user references an existing trip, Travel Director:
1. Looks up the trip in TRIPS.md
2. Routes the message to the existing manager agent
3. The manager reads its `trip/` files to restore context

No special rehydration command needed — the manager's workspace *is* its persistent state.

## Agent Details

- [Travel Director](README-DIRECTOR.md)
- [Travel Manager](README-MANAGER.md)
- [Itinerary Validator](README-VALIDATOR.md)
- [Trip Advisor](README-ADVISOR.md)

## Full Spec

See `references/TRAVEL-DEPT-SPEC-v0.3.md` for the complete specification.

## License

MIT
