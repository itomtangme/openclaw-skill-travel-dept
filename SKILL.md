# Travel Department Skill

**Name:** `travel-dept`
**Version:** 0.3.0
**Description:** Travel department for OpenClaw — L1 Director + L2 Trip Managers + L3 Itinerary Validator + L3 Trip Advisor.

## When to Use

This skill applies when the user wants to:
- Set up the Travel department (agents, workspaces, config)
- Provision a new trip manager for a confirmed trip
- Understand the Travel department architecture, naming conventions, or protocols

## Setup (one-time)

Follow these steps to install the Travel department:

### 1. Create permanent workspaces

```bash
mkdir -p /root/.openclaw/workspace-travel/templates
mkdir -p /root/.openclaw/workspace-travel-advisor
mkdir -p /root/.openclaw/workspace-travel-validator/cache
```

### 2. Copy agent identity files from templates

Copy from `assets/templates/` in this skill folder:

| Source template | Destination |
|---|---|
| `SOUL-director.md` | `workspace-travel/SOUL.md` |
| `IDENTITY-director.md` | `workspace-travel/IDENTITY.md` |
| `TOOLS-director.md` | `workspace-travel/TOOLS.md` |
| `AGENTS-director.md` | `workspace-travel/AGENTS.md` |
| `TRIPS-template.md` | `workspace-travel/TRIPS.md` |
| `SOUL-advisor.md` | `workspace-travel-advisor/SOUL.md` |
| `IDENTITY-advisor.md` | `workspace-travel-advisor/IDENTITY.md` |
| `TOOLS-advisor.md` | `workspace-travel-advisor/TOOLS.md` |
| `SOUL-validator.md` | `workspace-travel-validator/SOUL.md` |
| `IDENTITY-validator.md` | `workspace-travel-validator/IDENTITY.md` |
| `TOOLS-validator.md` | `workspace-travel-validator/TOOLS.md` |

Also copy all `trip/*-template.md` files into `workspace-travel/templates/`.

### 3. Create USER.md in each workspace

Each workspace needs a `USER.md` with at minimum:
```markdown
# USER.md
- **Name:** Tom
- **Timezone:** Asia/Hong_Kong
```

### 4. Add agents to openclaw.json

Merge the following into the `agents` array of `~/.openclaw/openclaw.json`:

```json
{
  "id": "travel",
  "name": "Travel Director",
  "workspace": "workspace-travel",
  "identity": {
    "emoji": "✈️"
  }
},
{
  "id": "travel-advisor",
  "name": "Trip Advisor",
  "workspace": "workspace-travel-advisor",
  "identity": {
    "emoji": "💡"
  }
},
{
  "id": "travel-validator",
  "name": "Itinerary Validator",
  "workspace": "workspace-travel-validator",
  "identity": {
    "emoji": "✅"
  }
}
```

> **Note:** Agent metadata like `tier`, `layer`, `parent`, `persistent`, and `shared_service` are **not** valid openclaw.json keys. They belong in each agent's workspace files (SOUL.md, IDENTITY.md). Only `id`, `name`, `workspace`, `identity.emoji`, `model`, `subagents`, and `agentDir` are recognized config keys.

### 5. Add routing entry to main AGENTS.md

Add to the main workspace `AGENTS.md` sub-agent table:

```markdown
| travel | Travel Director | L1-D | workspace-travel | ✈️ | Permanent | Tier-2 | All travel, trips, itineraries, exploration |
```

### 6. Restart gateway

```bash
openclaw gateway restart
```

### 7. Verify

- Send: *"How is Japan in June?"* → should route to travel → travel-advisor (no manager spawned)
- Send: *"Plan my Iceland trip in May 2026."* → should route to travel → confirmation gate → manager provisioned

## Provisioning a New Trip Manager

See `scripts/provision-trip-manager.md` for the step-by-step protocol Travel Director follows when spawning a new L2 manager.

## Key References

- Full spec: `references/TRAVEL-DEPT-SPEC-v0.3.md`
- All agent SOUL/IDENTITY/TOOLS templates: `assets/templates/`
- Trip document templates: `assets/templates/trip/`
