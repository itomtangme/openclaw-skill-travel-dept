# Travel Department — Full Spec v0.3
*Planner agent output. All decisions from 2026-03-03 session incorporated. All 11 action items resolved.*
*Intended audience: executing agent (Main / Sysadmin) + skill-creator.*

---

## Table of Contents

1. [Department Overview](#1-department-overview)
2. [Architecture Position](#2-architecture-position)
3. [Intent Routing & Confirmation Gate](#3-intent-routing--confirmation-gate)
4. [Naming Conventions](#4-naming-conventions)
5. [TRIPS.md Registry & Status Model](#5-tripsmd-registry--status-model)
6. [Agent Specs](#6-agent-specs)
   - 6.1 Travel Director (L1-D)
   - 6.2 Travel Manager (L2)
   - 6.3 Itinerary Validator (L3)
   - 6.4 Trip Advisor (L3)
7. [Data Schemas](#7-data-schemas)
8. [Delegation & Communication Protocols](#8-delegation--communication-protocols)
9. [Trip Completion Protocol](#9-trip-completion-protocol)
10. [Validation Protocol (detail)](#10-validation-protocol-detail)
11. [Folder Structure (full)](#11-folder-structure-full)
12. [OpenClaw Config Changes](#12-openclaw-config-changes)
13. [Execution Brief for Implementing Agent](#13-execution-brief-for-implementing-agent)

---

## 1. Department Overview

The Travel Department handles all travel-related requests for Tom. It separates **exploratory curiosity** (Trip Advisor) from **committed trip planning** (Trip Managers) and enforces **quality gates** via a dedicated Itinerary Validator before any plan is presented as final.

**Key design decisions:**
- Currency: HKD throughout (all foreign amounts converted)
- OneDrive sync: not used
- Multi-traveller tracking: not required
- Leg managers maintain their own independent documents (no inheritance from parent)
- Proactive reminders: only on explicit request
- Completed trip managers are deregistered from openclaw.json but their workspace files are never deleted

---

## 2. Architecture Position

```
L0 Orchestrator (main)
└── L1-D Travel Director (travel)          [permanent, Tier-2]
        ├── L3 Trip Advisor (travel-advisor)           [permanent, Tier-3, shared service]
        ├── L3 Itinerary Validator (travel-validator)  [permanent, Tier-3, shared service]
        └── L2 Travel Manager per trip (travel-manager-*)  [persistent until completed, Tier-2]
                └── L2 Travel Manager per leg (travel-manager-* date-level)  [if multi-leg]
```

**Shared service note (Architecture Exception):**
`travel-validator` is classified as a shared L3 service. Direct calls from any `travel-manager-*` agent are permitted without routing through Travel Director. This is an explicit exception to the no-lateral-shortcuts rule. Travel Director owns the validator's lifecycle but does not need to be in the call path for validation requests.

---

## 3. Intent Routing & Confirmation Gate

Travel Director classifies every incoming request before acting.

### Signal Word Table

| Intent | Trigger Signals | Action |
|--------|----------------|--------|
| **Planning** | "plan my trip", "I'm going to X", "set up X trip", "book", "help me plan", "create itinerary", "I've decided", "we're going" | Spawn or rehydrate Trip Manager |
| **Exploratory** | "how is X in Y month", "what's it like", "ideas for", "should I go", "best time to", "worth visiting", "thinking about", "recommend" | Route to Trip Advisor only |
| **Status/update** | References an existing trip by name/destination/date | Look up TRIPS.md → route to existing manager |
| **Ambiguous** | Doesn't match either column clearly | Ask: *"Are you planning a specific trip, or just exploring ideas?"* |

**Hard rule:** Trip Advisor is the only agent active until Tom explicitly confirms planning intent. Travel Director must not create any TRIPS.md entry or spawn any manager during an advisory-only conversation.

### Handoff Signal from Trip Advisor
When Tom confirms planning intent during an advisory conversation, Trip Advisor ends its response with:
```
[ADVISORY_COMPLETE — PLANNING INTENT CONFIRMED]
Destination: <destination>
Suggested dates: <dates>
Ready for Travel Director to initiate trip planning.
```
Travel Director picks up this signal and proceeds with manager provisioning.

---

## 4. Naming Conventions

### Agent IDs

| Scope | Format | Example |
|-------|--------|---------|
| Region/month-level trip | `travel-manager-YYYYMM-<RegionSlug>` | `travel-manager-202605-Europe` |
| Country/date-level leg | `travel-manager-YYYYMMDD-<CountrySlug>` | `travel-manager-20260515-England` |

**Rules:**
- YYYY/MM/DD = departure date of the trip or leg
- RegionSlug / CountrySlug: PascalCase, English, no spaces (e.g. `SoutheastAsia`, `NewZealand`, `Japan`, `England`, `Iceland`)
- IDs are **immutable** once assigned — never rename after creation
- Workspace name = `workspace-<agent-id>` (e.g. `workspace-travel-manager-20260515-England`)

---

## 5. TRIPS.md Registry & Status Model

### Status Definitions

| Status | Meaning |
|--------|---------|
| `planning` | Manager spawned; itinerary not yet finalized or validated |
| `confirmed` | Itinerary validated; key bookings made or pending |
| `in-progress` | Trip is currently happening (Tom is travelling) |
| `completed` | Trip ended; summary.md written |
| `archived` | Manager deregistered from openclaw.json; workspace files preserved |

### Schema

```markdown
# Trip Registry

| Trip ID | Agent ID | Parent Trip | Status | Dates | Description |
|---------|----------|-------------|--------|-------|-------------|
| 202605-Europe | travel-manager-202605-Europe | — | confirmed | 2026-05-15–2026-06-01 | Europe May 2026 |
| 20260515-England | travel-manager-20260515-England | 202605-Europe | confirmed | 2026-05-15–2026-05-24 | England leg |
| 20260525-Iceland | travel-manager-20260525-Iceland | 202605-Europe | planning | 2026-05-25–2026-06-01 | Iceland leg |

## Archived Trips
| Trip ID | Agent ID | Dates | Completed | Notes |
|---------|----------|-------|-----------|-------|
```

---

## 6. Agent Specs

---

### 6.1 Travel Director

| Field | Value |
|-------|-------|
| **ID** | `travel` |
| **Name** | Travel Director |
| **Layer** | L1-D |
| **Tier** | Tier-2 |
| **Emoji** | ✈️ |
| **Workspace** | `/root/.openclaw/workspace-travel/` |
| **Persistence** | Permanent |
| **Parent** | `main` |

**Responsibilities:**
1. Intake and classify all travel requests (see §3)
2. Route exploratory queries to Trip Advisor — never touch TRIPS.md for advisory-only requests
3. Spawn or rehydrate L2 Trip Managers on confirmed planning intent only
4. **All agent provisioning goes through Travel Director** — managers never self-provision or provision leg managers directly; they request it from Travel Director
5. Maintain `TRIPS.md` as the single source of truth
6. Synthesize cross-trip date conflicts when relevant
7. Delegate deregistration to Sysadmin on trip completion (see §9)
8. Provide reminders/notifications only when explicitly asked by Tom
9. Escalate unresolvable issues to L0

**Children:**

| Agent | ID | Persistence |
|-------|----|-------------|
| Trip Advisor | `travel-advisor` | Permanent |
| Itinerary Validator | `travel-validator` | Permanent |
| Trip Managers | `travel-manager-*` | Persistent (deregistered after completion) |

---

### 6.2 Travel Manager

| Field | Value |
|-------|-------|
| **ID** | `travel-manager-YYYYMM-<Slug>` or `travel-manager-YYYYMMDD-<Slug>` |
| **Name** | Travel Manager: [Trip Name] |
| **Layer** | L2 |
| **Tier** | Tier-2 |
| **Emoji** | 🗺️ |
| **Workspace** | `/root/.openclaw/workspace-travel-manager-<id>/` |
| **Persistence** | Persistent (until trip archived) |
| **Parent** | `travel` |

**Responsibilities:**
1. Own all planning for a single trip or leg
2. Initialize `trip/` folder from Travel Director's templates on first run
3. Rehydrate from `trip/` files on session resume
4. Spawn ephemeral L3/L4 researchers (not registered in openclaw.json) for flights, hotels, attractions, visa info
5. If multi-leg trip: **request** leg manager provisioning from Travel Director (never self-provision)
6. Draft and maintain all trip documents (§7)
7. **Mandatory validation gate**: call `travel-validator` after itinerary is finalized (see §10)
8. Incorporate validator findings; resolve blocking issues; re-validate if changes are major (see re-validation trigger below)
9. Return finalized plan + validator status to Travel Director
10. Confirm with Tom before any booking action
11. Write `trip/summary.md` on trip completion directive from Travel Director

**Re-validation trigger:** Re-validation is required if any of the following change after a validation pass:
- A venue visit date changes
- A transport connection changes
- Accommodation changes
- A new day or location is added
Minor changes (hotel swap same city, meal time tweak) do not require re-validation.

**Leg independence:** Each leg manager maintains its own full `trip/` folder. No data inheritance from parent. Parent trip manager maintains `trip/budget-overview.md` as a lightweight cost rollup (totals only, sourced from leg files on request).

---

### 6.3 Itinerary Validator

| Field | Value |
|-------|-------|
| **ID** | `travel-validator` |
| **Name** | Itinerary Validator |
| **Layer** | L3 |
| **Tier** | Tier-3 |
| **Emoji** | ✅ |
| **Workspace** | `/root/.openclaw/workspace-travel-validator/` |
| **Persistence** | Permanent |
| **Parent** | `travel` (lifecycle owner) |
| **Callers** | Any `travel-manager-*` — direct call permitted (shared service exception) |

**Responsibilities:**
Validate a finalized itinerary and return a structured report. One job only.

**Validation checks:**

| Category | What's Checked |
|----------|---------------|
| Opening hours | Is venue open on planned day? Day-of-week, public holidays |
| Seasonal availability | Is experience available in that season? (e.g. Northern Lights Oct–Mar) |
| Event status | Is event/festival/exhibition still active on that date? |
| Transit feasibility | Is travel time between locations realistic given the schedule gap? |
| Booking requirements | Does venue require advance booking not yet noted? |
| Entry requirements | Visa, permit, or ticket needing advance arrangement? |
| Weather risk | Known seasonal hazards? (typhoon, monsoon, extreme cold) |
| Other blockers | Construction closures, off-season shutdowns, date conflicts |

**Does NOT do:** suggest alternatives, modify files, initiate contact with Tom, book anything, rewrite itinerary.

**Output path:** Validator returns structured text to the calling manager. The **manager** writes the report into `itinerary.md` under `## Validation Report`. Validator never writes files.

**Confidence tiers (mandatory in all output):**

| Tier | Symbol | Meaning |
|------|--------|---------|
| Confirmed | ✅ | Authoritative source found |
| Unconfirmed | ⚠️ | Could not verify — flagged for manual check |
| Known issue | 🔴 | Conflict found |

**Tools allowed:** `web_search`, `web_fetch`, `read`, `memory_recall`
**Forbidden:** `exec`, `write`, `edit`, `browser` mutations

**Caching:** Validator may cache destination facts in `workspace-travel-validator/cache/` with a **30-day TTL**. Cached entries include source URL and cache date.

**Input format (from calling manager):**
```
[VALIDATE_ITINERARY]
trip_id: travel-manager-20260515-England
itinerary_path: /root/.openclaw/workspace-travel-manager-20260515-England/trip/itinerary.md
travel_dates: 2026-05-15 to 2026-05-24
```

**Output format:**
```markdown
# Validation Report
**Trip:** [name]
**Validated:** [date]
**Overall Status:** [✅ All Clear | ⚠️ Advisory Issues | 🔴 Blocking Issues Found]
**Issues:** [X blocking, Y advisory]

## Blocking Issues 🔴
[numbered list; each includes: what, why it's a problem, recommended action, confidence tier, source]

## Advisory Issues ⚠️
[numbered list; each includes: what, why flagged, recommended action, confidence tier, source]

## Passed ✅
[brief list of what was checked and cleared]

## Research Sources
[URLs used]
```

---

### 6.4 Trip Advisor

| Field | Value |
|-------|-------|
| **ID** | `travel-advisor` |
| **Name** | Trip Advisor |
| **Layer** | L3 |
| **Tier** | Tier-3 |
| **Emoji** | 💡 |
| **Workspace** | `/root/.openclaw/workspace-travel-advisor/` |
| **Persistence** | Permanent |
| **Parent** | `travel` |

**Responsibilities:**
1. Answer exploratory travel questions with researched, opinionated responses
2. Provide destination overviews: weather, crowds, costs, highlights, drawbacks
3. Seasonal advice: best/worst times, events to catch or avoid
4. Suggest rough trip structures: day counts, must-sees, hidden gems
5. Flag practical concerns: visa difficulty, safety, cost tier, language barrier
6. Compare destinations when Tom is deciding between options
7. Build and maintain a model of Tom's travel preferences via `memory_store`
8. Issue `[ADVISORY_COMPLETE — PLANNING INTENT CONFIRMED]` handoff signal when Tom confirms intent

**Does NOT do:** create TRIPS.md entries, spawn managers, produce formal day-by-day itineraries, track bookings or expenses, call the Validator.

**Response style:**
- Opinionated and direct — give real recommendations, not hedged non-answers
- Honest about downsides (crowds, cost, weather)
- Length scales with request: "quick thoughts" → bullets only; "deep dive" → structured multi-section

**Memory:** Trip Advisor is allowed to `memory_store` Tom's travel preferences, visited destinations, and stated dislikes, so future advice becomes progressively more personalized.

**Tools allowed:** `web_search`, `web_fetch`, `read`, `memory_recall`, `memory_store`
**Forbidden:** `exec`, `write` (outside plans/), `edit` non-markdown, `browser` mutations

---

## 7. Data Schemas

All schemas below live in each manager's `trip/` folder. Leg managers maintain their own full copy.

---

### 7.1 `itinerary.md`

```markdown
# Itinerary — [Trip Name]

## Overview
- **Trip ID:** [id]
- **Agent ID:** [agent-id]
- **Dates:** [start] to [end]
- **Traveller:** Tom
- **Base currency:** HKD

## Day-by-Day

| Date | Day | Location | Transport In | Accommodation | Key Activities | Notes |
|------|-----|----------|-------------|---------------|----------------|-------|
| 2026-05-15 | Fri | London | Flight HKG→LHR CX251 | Travelodge City | Arrive ~18:00, rest | Check-in from 15:00 |

## Transport Summary
| Leg | Mode | Provider | Ref | Departure | Arrival |
|-----|------|----------|-----|-----------|---------|

## Accommodation Summary
| Dates | Name | Address | Confirmation |
|-------|------|---------|--------------|

## Validation Report
[Written by manager after validator call. See §10 for format.]

## Revision History
| Date | Change | Re-validated? |
|------|--------|--------------|
```

---

### 7.2 `bookings.md`

```markdown
# Booking Tracker — [Trip Name]

| # | Type | Provider | Ref/PNR | Dates | Cost | Currency | HKD Equiv | Status | Cancellation Deadline | Notes |
|---|------|----------|---------|-------|------|----------|-----------|--------|----------------------|-------|
| 1 | Flight | Cathay | ABC123 | 15 May | 8,500 | HKD | 8,500 | Confirmed | N/A | |
| 2 | Hotel | Booking.com | XYZ | 15-24 May | 4,200 | GBP | 42,000 | Confirmed | 2026-05-12 | Free cancel before deadline |

## Status Values
- `Pending` — not yet booked
- `Confirmed` — booked and confirmed
- `Cancelled` — cancelled
- `Refunded` — refund received

## Total Committed Spend: HKD [X]
```

---

### 7.3 `expenses.md`

```markdown
# Expense Tracker — [Trip Name]

## Budget vs. Actuals

| Category | Budget (HKD) | Committed (HKD) | Spent (HKD) | Remaining (HKD) |
|----------|-------------|-----------------|-------------|-----------------|
| Flights | 20,000 | 8,500 | 8,500 | 11,500 |
| Accommodation | 15,000 | 12,000 | 0 | 3,000 |
| Food | 8,000 | 0 | 0 | 8,000 |
| Transport (local) | 3,000 | 0 | 0 | 3,000 |
| Activities | 5,000 | 0 | 0 | 5,000 |
| Misc | 2,000 | 0 | 0 | 2,000 |
| **Total** | **53,000** | **20,500** | **8,500** | **32,500** |

## Actual Expenses Log

| Date | Category | Description | Amount | Currency | HKD Equiv | Receipt |
|------|----------|-------------|--------|----------|-----------|---------|
```

---

### 7.4 `prep-list.md`

```markdown
# Preparation List — [Trip Name]

## Documents
- [ ] Passport valid 6 months beyond return date
- [ ] Visa / ETA applied and received
- [ ] Travel insurance confirmed + emergency number saved
- [ ] Printed/saved booking confirmations (offline accessible)

## Health
- [ ] Travel vaccinations checked
- [ ] Medications packed (sufficient supply)
- [ ] GP letter if carrying prescription meds

## Logistics
- [ ] Bank notified of travel dates
- [ ] International SIM or eSIM purchased and tested
- [ ] Accommodation addresses saved offline
- [ ] Emergency contacts list saved offline

## Packing Highlights
- [ ] Power adapter type: [Type G for UK / Type F for Iceland / etc.]
- [ ] Power bank (<100Wh for carry-on compliance)
- [ ] [destination-specific items]

## Done ✅
[Completed items moved here with completion date]
```

---

### 7.5 `app-list.md`

```markdown
# App List — [Trip Name]

## Must Install Before Departure

| App | Platform | Purpose | Offline Action Required |
|-----|----------|---------|------------------------|
| Citymapper | iOS/Android | Local transport | Download city offline |
| Google Translate | iOS/Android | Language | Download language pack |
| Wise | iOS/Android | Payments & currency | — |
| Flighty | iOS | Flight tracking | — |
| [destination-specific] | | | |

## Already Installed (verify offline content)

| App | Offline Action |
|-----|----------------|
| Google Maps | Save offline area: [city/region] |

## Optional / Recommended
[App suggestions with rationale]
```

---

### 7.6 `misc.md`

```markdown
# Miscellaneous — [Trip Name]

## Visa & Entry Requirements

| Country | Requirement | Application Method | Status | Notes |
|---------|------------|-------------------|--------|-------|
| UK | ETA required | gov.uk/apply-for-an-eta | Pending | Apply 2+ weeks before |
| Iceland | Schengen-free (HK passport) | N/A | N/A | Max 90 days |

## Emergency Contacts
- Local emergency: [number]
- Nearest HK consulate/embassy: [number]
- Travel insurance 24h hotline: [number]
- Hotel contacts: [in bookings.md]

## Research Notes
[Free-form: links, friend recommendations, things to check, ideas]

## Useful Resources
[Curated links for the destination]
```

---

### 7.7 `summary.md` (written at trip completion)

```markdown
# Trip Summary — [Trip Name]
**Dates:** [start] to [end]
**Completed:** [date]

## Overview
[2-3 sentence summary of the trip]

## Stats
- Total duration: X days
- Total spend: HKD [X] (budget was HKD [X])
- Locations visited: [list]

## What Went Well
[bullet list]

## What Didn't Work
[bullet list]

## Booking Reference (final record)
[Key PNRs and confirmation numbers preserved here]

## Validator Issues Encountered
[What was flagged, how it was resolved]

## Notes for Future Trips
[Lessons, tips, things to do differently]
```

---

### 7.8 `budget-overview.md` (parent trip manager only)

```markdown
# Budget Overview — [Parent Trip Name]

*Aggregated from leg managers. Totals only — see individual leg workspaces for line items.*

| Leg | Agent ID | Budget (HKD) | Committed (HKD) | Spent (HKD) |
|-----|----------|-------------|-----------------|-------------|
| England | travel-manager-20260515-England | 30,000 | 20,500 | 8,500 |
| Iceland | travel-manager-20260525-Iceland | 25,000 | 5,000 | 0 |
| **Total** | | **55,000** | **25,500** | **8,500** |

*Last updated: [date] by [manager-id]*
```

---

## 8. Delegation & Communication Protocols

### Manager Provisioning (fixed from v0.1)

Managers **never** self-provision or provision leg managers. The correct flow:

```
Trip Manager → Travel Director: [REQUEST_LEG_MANAGER]
  trip_id: 202605-Europe
  leg_id: 20260515-England
  dates: 2026-05-15 to 2026-05-24
  description: England leg

Travel Director:
  1. Create TRIPS.md entry
  2. Provision workspace (copy templates)
  3. Add to openclaw.json
  4. Update AGENTS.md
  5. Spawn leg manager with initial context
  6. Notify parent manager: [LEG_MANAGER_READY] agent-id: travel-manager-20260515-England
```

### Ephemeral Researcher Spawning
Trip Managers may spawn ephemeral L3/L4 sub-agents for research (flights, hotels, visa, attractions). These are **not registered** in openclaw.json — one-shot tasks only. Findings are written back to `trip/` files by the manager.

### Standard Delegation Message Format

```
[TASK]
from: <agent-id>
to: <agent-id>
task: <short description>
context_path: <relevant file path if applicable>
priority: normal | high
```

---

## 9. Trip Completion Protocol

When Tom marks a trip as completed:

```
1. Travel Director sets status = `completed` in TRIPS.md
2. Travel Director instructs manager(s) to write trip/summary.md
3. Manager confirms summary written
4. Travel Director sets status = `archived` in TRIPS.md
5. Travel Director delegates to Sysadmin:
   [DEREGISTER_AGENT]
   agent-ids: [travel-manager-20260515-England, travel-manager-20260525-Iceland, travel-manager-202605-Europe]
   action: remove from openclaw.json + AGENTS.md
   note: DO NOT delete workspace folders — preserve all files
6. Sysadmin performs config edits + gateway restart
7. Travel Director confirms deregistration complete
8. Workspace files remain permanently in /root/.openclaw/workspace-travel-manager-*/
```

**For multi-leg trips:** all leg managers are deregistered before the parent manager.

---

## 10. Validation Protocol (detail)

### When Validation Runs
After itinerary finalization — mandatory before any plan is returned to Tom as final.

### Call Format
Manager sends to `travel-validator`:
```
[VALIDATE_ITINERARY]
trip_id: <agent-id>
itinerary_path: <full path to itinerary.md>
travel_dates: <start> to <end>
```

### After Receiving Report
1. Manager reviews blocking issues (🔴)
2. For each blocking issue: update itinerary.md to resolve
3. Check re-validation trigger: if any venue date, transport, accommodation, or new day changed → re-validate
4. After final clean pass (or advisory-only issues remain): embed full report under `## Validation Report` in itinerary.md
5. Return plan to Travel Director with note: `Validator status: [All Clear / Advisory issues noted / Blocking issues resolved]`

---

## 11. Folder Structure (full)

```
/root/.openclaw/

workspace-travel/                              ← Travel Director
├── IDENTITY.md
├── SOUL.md
├── TOOLS.md
├── AGENTS.md                                  ← active manager + shared service registry
├── AGENT-MANIFEST.md
├── HEARTBEAT-STATUS.md
├── USER.md
├── TRIPS.md                                   ← master trip registry
└── templates/
    ├── itinerary-template.md
    ├── bookings-template.md
    ├── expenses-template.md
    ├── prep-list-template.md
    ├── app-list-template.md
    ├── misc-template.md
    ├── summary-template.md
    └── budget-overview-template.md

workspace-travel-advisor/                      ← Trip Advisor (L3, permanent)
├── IDENTITY.md
├── SOUL.md
├── TOOLS.md
├── AGENT-MANIFEST.md
├── HEARTBEAT-STATUS.md
└── USER.md

workspace-travel-validator/                    ← Itinerary Validator (L3, permanent)
├── IDENTITY.md
├── SOUL.md
├── TOOLS.md
├── AGENT-MANIFEST.md
├── HEARTBEAT-STATUS.md
├── USER.md
└── cache/                                     ← 30-day TTL fact cache
    └── [destination-slug]-[YYYY-MM-DD].md

workspace-travel-manager-202605-Europe/        ← L2 parent trip manager
├── IDENTITY.md
├── SOUL.md
├── TOOLS.md
├── AGENTS.md                                  ← leg manager references
├── AGENT-MANIFEST.md
├── HEARTBEAT-STATUS.md
├── USER.md
└── trip/
    ├── itinerary.md
    ├── bookings.md
    ├── expenses.md
    ├── prep-list.md
    ├── app-list.md
    ├── misc.md
    ├── budget-overview.md                     ← parent only: leg cost rollup
    └── summary.md                             ← written at completion

workspace-travel-manager-20260515-England/     ← L2 leg manager (independent)
├── IDENTITY.md
├── SOUL.md
├── TOOLS.md
├── AGENT-MANIFEST.md
├── HEARTBEAT-STATUS.md
├── USER.md
└── trip/
    ├── itinerary.md
    ├── bookings.md
    ├── expenses.md
    ├── prep-list.md
    ├── app-list.md
    ├── misc.md
    └── summary.md                             ← written at completion

workspace-travel-manager-20260525-Iceland/     ← L2 leg manager (independent)
└── trip/ [same structure as England]
```

---

## 12. OpenClaw Config Changes

### 12.1 Agents to Add to `openclaw.json`

```json
[
  {
    "id": "travel",
    "name": "Travel Director",
    "emoji": "✈️",
    "tier": 2,
    "layer": "L1-D",
    "parent": "main",
    "workspace": "workspace-travel",
    "persistent": true
  },
  {
    "id": "travel-advisor",
    "name": "Trip Advisor",
    "emoji": "💡",
    "tier": 3,
    "layer": "L3",
    "parent": "travel",
    "workspace": "workspace-travel-advisor",
    "persistent": true
  },
  {
    "id": "travel-validator",
    "name": "Itinerary Validator",
    "emoji": "✅",
    "tier": 3,
    "layer": "L3",
    "parent": "travel",
    "workspace": "workspace-travel-validator",
    "persistent": true,
    "shared_service": true
  }
]
```

Trip manager entries are added dynamically by Travel Director when provisioned. Template:
```json
{
  "id": "travel-manager-YYYYMMDD-Slug",
  "name": "Travel Manager: [Trip Name]",
  "emoji": "🗺️",
  "tier": 2,
  "layer": "L2",
  "parent": "travel",
  "workspace": "workspace-travel-manager-YYYYMMDD-Slug",
  "persistent": true
}
```

### 12.2 Routing Rules (main AGENTS.md or routing config)

```yaml
routing_rules:
  - keywords:
      - travel
      - trip
      - flight
      - hotel
      - itinerary
      - visa
      - passport
      - holiday
      - vacation
      - destination
      - booking
      - accommodation
      - airport
      - airline
      - cruise
    agent: travel
    priority: high
  - patterns:
      - "plan.*trip"
      - "book.*flight"
      - ".*travel.*"
      - "going to .* in"
      - "how is .* in (january|february|march|april|may|june|july|august|september|october|november|december)"
    agent: travel
```

### 12.3 Main Workspace AGENTS.md Entry

```markdown
| travel | Travel Director | L1-D | workspace-travel | ✈️ | Permanent | Tier-2 | All travel, trips, itineraries, exploration |
```

---

## 13. Execution Brief for Implementing Agent

*This section tells the executing agent exactly what to build. Follow in order.*

### Step 1 — Create skill folder structure

```
skills/travel-dept/
├── SKILL.md                          ← skill entry point
├── README.md                         ← user-facing overview
├── README-DIRECTOR.md                ← Travel Director detail
├── README-MANAGER.md                 ← Travel Manager detail
├── README-VALIDATOR.md               ← Itinerary Validator detail
├── README-ADVISOR.md                 ← Trip Advisor detail
├── references/
│   └── TRAVEL-DEPT-SPEC-v0.3.md      ← copy of this file
├── assets/
│   └── templates/
│       ├── SOUL-director.md
│       ├── SOUL-manager.md
│       ├── SOUL-validator.md
│       ├── SOUL-advisor.md
│       ├── IDENTITY-director.md
│       ├── IDENTITY-manager.md       ← uses placeholder [TRIP_NAME], [TRIP_ID]
│       ├── IDENTITY-validator.md
│       ├── IDENTITY-advisor.md
│       ├── TOOLS-director.md
│       ├── TOOLS-manager.md
│       ├── TOOLS-validator.md
│       ├── TOOLS-advisor.md
│       ├── AGENTS-director.md
│       ├── trip/
│       │   ├── itinerary-template.md
│       │   ├── bookings-template.md
│       │   ├── expenses-template.md
│       │   ├── prep-list-template.md
│       │   ├── app-list-template.md
│       │   ├── misc-template.md
│       │   ├── summary-template.md
│       │   └── budget-overview-template.md
│       └── TRIPS-template.md
└── scripts/
    └── provision-trip-manager.md     ← step-by-step guide for Travel Director to follow when provisioning a new manager
```

### Step 2 — SKILL.md content

SKILL.md must include:
- Name: `travel-dept`
- Description: Travel department for OpenClaw — L1 Director + L2 Trip Managers + L3 Validator + L3 Advisor
- Setup steps: (1) create workspaces, (2) copy templates, (3) add to openclaw.json, (4) restart gateway, (5) test with a travel query

### Step 3 — Initialize workspaces

Create the following directories and populate from templates:
- `/root/.openclaw/workspace-travel/`
- `/root/.openclaw/workspace-travel-advisor/`
- `/root/.openclaw/workspace-travel-validator/`
- `/root/.openclaw/workspace-travel-validator/cache/`
- `/root/.openclaw/workspace-travel/templates/` (copy all trip templates here)

### Step 4 — Write all template files

All schemas from §7 should be written as templates with placeholder markers:
- `[TRIP_NAME]`, `[TRIP_ID]`, `[AGENT_ID]`, `[START_DATE]`, `[END_DATE]`

### Step 5 — Update openclaw.json

Add the three permanent agents (travel, travel-advisor, travel-validator) per §12.1.
Use safe-config approach — read current config first, merge, write back.

### Step 6 — Update main workspace AGENTS.md

Add travel director entry per §12.3.

### Step 7 — Gateway restart

After openclaw.json changes. Use Sysadmin agent or `openclaw gateway restart`.

### Step 8 — GitHub push

```bash
cd ~/.openclaw/skills/travel-dept
git init (if needed)
gh repo create itomtangme/openclaw-skill-travel-dept --public --description "Travel department skill for OpenClaw"
git add .
git commit -m "feat: travel department skill v0.3"
git push
```

### Step 9 — Verify

Send a test travel query through main: *"How is Japan in June?"*
Expected: routes to travel → travel-advisor responds. No manager spawned.

Send a planning query: *"Plan my Iceland trip in May 2026."*
Expected: routes to travel → confirmation gate → manager provisioned.

---

*End of spec v0.3. Written by Planner agent 2026-03-03.*
*All 11 action items from review session incorporated.*
*Ready for Main or Sysadmin to execute §13.*
