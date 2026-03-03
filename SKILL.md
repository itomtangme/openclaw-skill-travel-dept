# Travel Department Skill

**Name:** `travel-dept`
**Version:** 0.4.0
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
| **Travel Director** | |
| `SOUL-director.md` | `workspace-travel/SOUL.md` |
| `IDENTITY-director.md` | `workspace-travel/IDENTITY.md` |
| `TOOLS-director.md` | `workspace-travel/TOOLS.md` |
| `AGENTS-director.md` | `workspace-travel/AGENTS.md` |
| `AGENT-MANIFEST-director.md` | `workspace-travel/AGENT-MANIFEST.md` |
| `HEARTBEAT-director.md` | `workspace-travel/HEARTBEAT.md` |
| `BOOTSTRAP-director.md` | `workspace-travel/BOOTSTRAP.md` |
| `TRIPS-template.md` | `workspace-travel/TRIPS.md` |
| **Trip Advisor** | |
| `SOUL-advisor.md` | `workspace-travel-advisor/SOUL.md` |
| `IDENTITY-advisor.md` | `workspace-travel-advisor/IDENTITY.md` |
| `TOOLS-advisor.md` | `workspace-travel-advisor/TOOLS.md` |
| `AGENTS-advisor.md` | `workspace-travel-advisor/AGENTS.md` |
| `AGENT-MANIFEST-advisor.md` | `workspace-travel-advisor/AGENT-MANIFEST.md` |
| `HEARTBEAT-advisor.md` | `workspace-travel-advisor/HEARTBEAT.md` |
| `BOOTSTRAP-advisor.md` | `workspace-travel-advisor/BOOTSTRAP.md` |
| **Itinerary Validator** | |
| `SOUL-validator.md` | `workspace-travel-validator/SOUL.md` |
| `IDENTITY-validator.md` | `workspace-travel-validator/IDENTITY.md` |
| `TOOLS-validator.md` | `workspace-travel-validator/TOOLS.md` |
| `AGENTS-validator.md` | `workspace-travel-validator/AGENTS.md` |
| `AGENT-MANIFEST-validator.md` | `workspace-travel-validator/AGENT-MANIFEST.md` |
| `HEARTBEAT-validator.md` | `workspace-travel-validator/HEARTBEAT.md` |
| `BOOTSTRAP-validator.md` | `workspace-travel-validator/BOOTSTRAP.md` |

Copy `USER.md` into each workspace (`workspace-travel/`, `workspace-travel-advisor/`, `workspace-travel-validator/`).

Also copy all `trip/*-template.md` files into `workspace-travel/templates/`.

### 3. Create USER.md in each workspace

Copy `assets/templates/USER.md` into each workspace. Customize if needed.

### 4. Create agent directories

Each agent needs an `agentDir` with provider/model config:

```bash
mkdir -p /root/.openclaw/agents/{travel,travel-advisor,travel-validator}/{agent,sessions}

# Copy provider config from an existing agent (e.g. main)
for agent in travel travel-advisor travel-validator; do
  cp /root/.openclaw/agents/main/agent/models.json /root/.openclaw/agents/$agent/agent/
  cp /root/.openclaw/agents/main/agent/auth-profiles.json /root/.openclaw/agents/$agent/agent/
done
```

### 5. Add agents to openclaw.json

Merge the following into the `agents` array of `~/.openclaw/openclaw.json`:

```json
{
  "id": "travel",
  "name": "Travel Director",
  "workspace": "workspace-travel",
  "agentDir": "/root/.openclaw/agents/travel/agent",
  "model": {
    "primary": "github-copilot/claude-sonnet-4.6",
    "fallbacks": ["openrouter/anthropic/claude-sonnet-4.6"]
  },
  "subagents": {
    "allowAgents": ["travel-advisor", "travel-validator"]
  },
  "identity": {
    "emoji": "✈️"
  }
},
{
  "id": "travel-advisor",
  "name": "Trip Advisor",
  "workspace": "workspace-travel-advisor",
  "agentDir": "/root/.openclaw/agents/travel-advisor/agent",
  "model": {
    "primary": "github-copilot/claude-sonnet-4.6",
    "fallbacks": ["openrouter/anthropic/claude-sonnet-4.6"]
  },
  "identity": {
    "emoji": "💡"
  }
},
{
  "id": "travel-validator",
  "name": "Itinerary Validator",
  "workspace": "workspace-travel-validator",
  "agentDir": "/root/.openclaw/agents/travel-validator/agent",
  "model": {
    "primary": "github-copilot/claude-sonnet-4.6",
    "fallbacks": ["openrouter/anthropic/claude-sonnet-4.6"]
  },
  "identity": {
    "emoji": "✅"
  }
}
```

> **Note:** Agent metadata like `tier`, `layer`, `parent`, `persistent`, and `shared_service` are **not** valid openclaw.json keys. They belong in each agent's workspace files (SOUL.md, IDENTITY.md). Only `id`, `name`, `workspace`, `identity.emoji`, `model`, `subagents`, and `agentDir` are recognized config keys.

### 6. Add `travel` to main's routing allowlist

In `openclaw.json`, ensure `main`'s `subagents.allowAgents` includes `"travel"`:

```json
{
  "id": "main",
  "subagents": {
    "allowAgents": ["planner", "sysadmin", "full-power", "travel"]
  }
}
```

### 8. Add routing entry to main AGENTS.md

Add to the main workspace `AGENTS.md` sub-agent table:

```markdown
| travel | Travel Director | L1-D | workspace-travel | ✈️ | Permanent | Tier-2 | All travel, trips, itineraries, exploration |
```

### 9. Restart gateway

```bash
openclaw gateway restart
```

### 10. Verify

- Send: *"How is Japan in June?"* → should route to travel → travel-advisor (no manager spawned)
- Send: *"Plan my Iceland trip in May 2026."* → should route to travel → confirmation gate → manager provisioned

## Provisioning a New Trip (Automated)

**When Travel Director receives confirmed planning intent, it MUST use the provisioning script.**

### The Script

`scripts/provision-trip.js` — a Node.js script that automatically:
1. Creates parent trip manager workspace with populated templates
2. Creates all leg manager workspaces with populated templates
3. Creates agent directories with `models.json` and `auth-profiles.json`
4. Updates `openclaw.json` (adds agents + routing)
5. Updates `TRIPS.md` in `workspace-travel`
6. Updates `AGENTS.md` in both Travel Director and parent manager workspaces

### How to Use

The Travel Director builds a config JSON and runs:

```bash
node /root/.openclaw/skills/travel-dept/scripts/provision-trip.js --inline '<config_json>'
```

Config JSON shape:
```json
{
  "tripName": "Europe 2026",
  "tripId": "europe-202605",
  "parentAgent": "travel-manager-202605-Europe",
  "startDate": "2026-05-15",
  "endDate": "2026-06-26",
  "legs": [
    {
      "name": "England",
      "agentId": "travel-manager-20260515-England",
      "startDate": "2026-05-15",
      "endDate": "2026-05-25"
    },
    {
      "name": "Iceland",
      "agentId": "travel-manager-20260525-Iceland",
      "startDate": "2026-05-25",
      "endDate": "2026-06-03"
    }
  ]
}
```

After the script succeeds, run `openclaw gateway restart` to activate the new agents.

### Agent ID Naming Convention

| Scope | Format | Example |
|---|---|---|
| Region/month trip | `travel-manager-YYYYMM-<RegionSlug>` | `travel-manager-202605-Europe` |
| Country/date leg | `travel-manager-YYYYMMDD-<CountrySlug>` | `travel-manager-20260515-England` |

- Slugs: PascalCase, English, no spaces
- IDs are immutable once assigned

### After Provisioning

The Travel Director should:
1. Confirm to the user what was created (list workspaces + agents)
2. Ask if the user wants to start detailed planning for any leg

## Deprovisioning a Trip (Automated)

**Completed trips stay active for 3 months after completion.** Dynamic sub-agents are preserved so the user can still reference trip data. After the retention period, they are cleaned up.

### Lifecycle

1. Trip completed → Director sets TRIPS.md status to `completed` + fills `Completed At` date
2. Agents remain active for **3 months**
3. After 3 months → `check-completed-trips.js` finds them and deprovisions

### Scripts

| Script | Purpose |
|--------|---------|
| `scripts/check-completed-trips.js` | Scans TRIPS.md for trips completed 3+ months ago, deprovisions them |
| `scripts/deprovision-trip.js` | Removes specific agents from openclaw.json, archives TRIPS.md, cleans routing |

### Automatic Cleanup

```bash
# Dry run — see what would be removed:
node /root/.openclaw/skills/travel-dept/scripts/check-completed-trips.js

# Execute removal:
node /root/.openclaw/skills/travel-dept/scripts/check-completed-trips.js --execute
openclaw gateway restart

# Custom retention period (e.g. 6 months):
node /root/.openclaw/skills/travel-dept/scripts/check-completed-trips.js --months 6 --execute
```

### Manual/Immediate Removal

If the user explicitly requests early removal:

```bash
# Full trip with legs:
node /root/.openclaw/skills/travel-dept/scripts/deprovision-trip.js --inline '{"parentAgent":"travel-manager-202605-Europe","legs":["travel-manager-20260515-England","travel-manager-20260525-Iceland"]}'

# Single agent:
node /root/.openclaw/skills/travel-dept/scripts/deprovision-trip.js --inline '{"agents":["travel-manager-20260515-England"]}'

openclaw gateway restart
```

Workspaces are **never deleted** — only agent registrations are removed.

## Key References

- Full spec: `references/TRAVEL-DEPT-SPEC-v0.3.md`
- All agent SOUL/IDENTITY/TOOLS templates: `assets/templates/`
- Trip document templates: `assets/templates/trip/`
- **Provisioning script: `scripts/provision-trip.js`**
