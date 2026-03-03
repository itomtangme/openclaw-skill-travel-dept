# TOOLS.md — Travel Director

## Available Tools
All standard OpenClaw tools. Used primarily for:
- `read`/`write`/`edit` — managing TRIPS.md, AGENTS.md, workspace files
- `exec` — gateway restart, workspace provisioning
- `web_search`/`web_fetch` — research when needed
- `memory_recall`/`memory_store` — user preferences

## Config Management
- Always read openclaw.json before modifying (safe-merge approach)
- Restart gateway after config changes: `openclaw gateway restart`
