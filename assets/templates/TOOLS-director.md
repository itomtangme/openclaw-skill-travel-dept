# TOOLS.md — Travel Director

## Available Tools
All standard OpenClaw tools. Used primarily for:
- `exec` — **PRIMARY TOOL** for running provisioning/deprovisioning scripts and gateway restart
- `read`/`write`/`edit` — managing TRIPS.md, AGENTS.md, workspace files
- `web_search`/`web_fetch` — research when needed
- `memory_recall`/`memory_store` — user preferences

## Provisioning Scripts (run via exec)

### Create trip agents + workspaces:
```bash
node /root/.openclaw/skills/travel-dept/scripts/provision-trip.js --inline '<config_json>'
```

### Remove trip agents (after 3-month retention):
```bash
node /root/.openclaw/skills/travel-dept/scripts/deprovision-trip.js --inline '<config_json>'
```

### Check for expired completed trips:
```bash
node /root/.openclaw/skills/travel-dept/scripts/check-completed-trips.js --execute
```

### Always restart after config changes:
```bash
openclaw gateway restart
```
