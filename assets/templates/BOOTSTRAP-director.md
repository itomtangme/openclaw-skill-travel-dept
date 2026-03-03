# BOOTSTRAP.md — Travel Director

## First-Run Setup

On first activation, verify:

1. **TRIPS.md** exists in workspace — if not, create from `templates/TRIPS-template.md`
2. **templates/** folder is populated with all trip document templates
3. **AGENTS.md** has entries for travel-advisor and travel-validator
4. **Shared services** (travel-advisor, travel-validator) are registered in openclaw.json

## Rehydration

On every session resume:
1. Read TRIPS.md to load active trip state
2. Check AGENTS.md for active manager list
3. Ready to route incoming travel requests

## Dependencies Check

- [ ] workspace-travel-advisor/ exists with SOUL.md
- [ ] workspace-travel-validator/ exists with SOUL.md
- [ ] workspace-travel-validator/cache/ directory exists
- [ ] templates/ contains all 8 trip document templates
