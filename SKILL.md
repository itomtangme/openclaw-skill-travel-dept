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

# Copy models.json and auth-profiles.json from an existing agent (e.g. main)
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

## Provisioning a New Trip Manager

See `scripts/provision-trip-manager.md` for the step-by-step protocol Travel Director follows when spawning a new L2 manager.

## Key References

- Full spec: `references/TRAVEL-DEPT-SPEC-v0.3.md`
- All agent SOUL/IDENTITY/TOOLS templates: `assets/templates/`
- Trip document templates: `assets/templates/trip/`
