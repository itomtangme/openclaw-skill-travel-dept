#!/usr/bin/env node
/**
 * provision-trip.js — Automated trip provisioning for Travel Department
 *
 * Usage:
 *   node provision-trip.js <config.json>
 *   node provision-trip.js --inline '<json>'
 *
 * Config JSON shape:
 * {
 *   "tripName": "Europe 2026",
 *   "tripId": "europe-202605",
 *   "parentAgent": "travel-manager-202605-Europe",
 *   "startDate": "2026-05-15",
 *   "endDate": "2026-06-26",
 *   "legs": [
 *     {
 *       "name": "England",
 *       "agentId": "travel-manager-20260515-England",
 *       "startDate": "2026-05-15",
 *       "endDate": "2026-05-25"
 *     },
 *     ...
 *   ]
 * }
 *
 * What it does:
 *   1. Creates parent trip manager workspace + trip/ folder with populated templates
 *   2. Creates each leg manager workspace + trip/ folder
 *   3. Creates agent directories with models.json + auth-profiles.json
 *   4. Updates openclaw.json: adds agents + routing
 *   5. Updates TRIPS.md in workspace-travel
 *   6. Prints summary (does NOT restart gateway — caller does that)
 */

const fs = require('fs');
const path = require('path');

const OPENCLAW_DIR = '/root/.openclaw';
const SKILL_DIR = path.join(OPENCLAW_DIR, 'skills', 'travel-dept');
const TEMPLATE_DIR = path.join(SKILL_DIR, 'assets', 'templates');
const TRIP_TEMPLATE_DIR = path.join(TEMPLATE_DIR, 'trip');
const MAIN_AGENT_DIR = path.join(OPENCLAW_DIR, 'agents', 'main', 'agent');
const CONFIG_PATH = path.join(OPENCLAW_DIR, 'openclaw.json');

// ── Helpers ──

function readJSON(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function writeJSON(p, obj) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n');
}

function mkdirp(d) {
  fs.mkdirSync(d, { recursive: true });
}

function replacePlaceholders(text, vars) {
  return text
    .replace(/\[TRIP_NAME\]/g, vars.tripName)
    .replace(/\[TRIP_ID\]/g, vars.tripId)
    .replace(/\[AGENT_ID\]/g, vars.agentId)
    .replace(/\[START_DATE\]/g, vars.startDate)
    .replace(/\[END_DATE\]/g, vars.endDate)
    .replace(/\[DATE\]/g, new Date().toISOString().slice(0, 10))
    .replace(/\[COMPLETION_DATE\]/g, '')
    .replace(/\[TYPE\]/g, 'G/C/M (varies by country)');
}

function copyTemplate(srcFile, destFile, vars) {
  const content = fs.readFileSync(srcFile, 'utf8');
  fs.writeFileSync(destFile, replacePlaceholders(content, vars));
}

// ── Workspace creation ──

function createManagerWorkspace(agentId, vars, isParent) {
  const wsName = `workspace-${agentId}`;
  const wsDir = path.join(OPENCLAW_DIR, wsName);
  const tripDir = path.join(wsDir, 'trip');

  mkdirp(tripDir);

  // Manager identity files
  const managerTemplates = [
    ['SOUL-manager.md', 'SOUL.md'],
    ['IDENTITY-manager.md', 'IDENTITY.md'],
    ['TOOLS-manager.md', 'TOOLS.md'],
    ['AGENT-MANIFEST-manager.md', 'AGENT-MANIFEST.md'],
    ['BOOTSTRAP-manager.md', 'BOOTSTRAP.md'],
    ['HEARTBEAT-manager.md', 'HEARTBEAT.md'],
    ['USER.md', 'USER.md'],
  ];

  for (const [src, dest] of managerTemplates) {
    const srcPath = path.join(TEMPLATE_DIR, src);
    if (fs.existsSync(srcPath)) {
      copyTemplate(srcPath, path.join(wsDir, dest), vars);
    }
  }

  // Trip documents
  const tripTemplates = [
    'itinerary-template.md',
    'bookings-template.md',
    'expenses-template.md',
    'prep-list-template.md',
    'app-list-template.md',
    'misc-template.md',
  ];

  if (isParent) {
    tripTemplates.push('budget-overview-template.md');
  }

  for (const src of tripTemplates) {
    const srcPath = path.join(TRIP_TEMPLATE_DIR, src);
    if (fs.existsSync(srcPath)) {
      const destName = src.replace('-template', '');
      copyTemplate(srcPath, path.join(tripDir, destName), vars);
    }
  }

  // Create AGENTS.md for manager (empty sub-agent table)
  const agentsMd = isParent
    ? `# AGENTS.md — ${vars.tripName}\n\n## Leg Managers\n\n| ID | Name | Dates | Status |\n|----|------|-------|--------|\n`
    : `# AGENTS.md — ${vars.tripName}\n\n## Sub-Agents\n\n_No sub-agents._\n`;
  fs.writeFileSync(path.join(wsDir, 'AGENTS.md'), agentsMd);

  return wsDir;
}

function createAgentDir(agentId) {
  const agentDir = path.join(OPENCLAW_DIR, 'agents', agentId, 'agent');
  const sessionsDir = path.join(OPENCLAW_DIR, 'agents', agentId, 'sessions');
  mkdirp(agentDir);
  mkdirp(sessionsDir);

  // Copy provider config from main
  for (const f of ['models.json', 'auth-profiles.json']) {
    const src = path.join(MAIN_AGENT_DIR, f);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(agentDir, f));
    }
  }

  return agentDir;
}

// ── openclaw.json manipulation ──

function addAgentToConfig(config, agentEntry) {
  const list = config.agents.list;
  // Don't duplicate
  if (list.find(a => a.id === agentEntry.id)) {
    console.log(`  ⚠️  Agent ${agentEntry.id} already in openclaw.json, skipping`);
    return;
  }
  list.push(agentEntry);
}

function ensureSubagentRouting(config, parentId, childId) {
  const list = config.agents.list;
  const parent = list.find(a => a.id === parentId);
  if (!parent) {
    console.log(`  ⚠️  Parent agent ${parentId} not found in config`);
    return;
  }
  if (!parent.subagents) parent.subagents = {};
  if (!parent.subagents.allowAgents) parent.subagents.allowAgents = [];
  if (!parent.subagents.allowAgents.includes(childId)) {
    parent.subagents.allowAgents.push(childId);
  }
}

function makeAgentEntry(agentId, name, emoji = '🗺️') {
  return {
    id: agentId,
    name: name,
    workspace: `workspace-${agentId}`,
    agentDir: path.join(OPENCLAW_DIR, 'agents', agentId, 'agent'),
    model: {
      primary: 'github-copilot/claude-sonnet-4.6',
      fallbacks: ['openrouter/anthropic/claude-sonnet-4.6'],
    },
    subagents: {
      allowAgents: ['travel-validator'],
    },
    identity: {
      emoji: emoji,
    },
  };
}

// ── TRIPS.md update ──

function updateTripsRegistry(tripId, agentId, parentTrip, dates, description) {
  const tripsPath = path.join(OPENCLAW_DIR, 'workspace-travel', 'TRIPS.md');
  if (!fs.existsSync(tripsPath)) {
    console.log('  ⚠️  TRIPS.md not found in workspace-travel, skipping registry update');
    return;
  }
  let content = fs.readFileSync(tripsPath, 'utf8');
  const row = `| ${tripId} | ${agentId} | ${parentTrip || '—'} | planning | ${dates} | ${description} | |`;

  // Insert before "## Archived Trips" or at end of first table
  if (content.includes('## Archived Trips')) {
    content = content.replace('## Archived Trips', row + '\n\n## Archived Trips');
  } else {
    content = content.trimEnd() + '\n' + row + '\n';
  }
  fs.writeFileSync(tripsPath, content);
}

// ── Update parent manager AGENTS.md with leg entries ──

function updateParentAgentsMd(parentAgentId, legs) {
  const agentsMdPath = path.join(OPENCLAW_DIR, `workspace-${parentAgentId}`, 'AGENTS.md');
  if (!fs.existsSync(agentsMdPath)) return;
  let content = fs.readFileSync(agentsMdPath, 'utf8');
  for (const leg of legs) {
    const row = `| ${leg.agentId} | ${leg.name} | ${leg.startDate} – ${leg.endDate} | planning |`;
    content = content.trimEnd() + '\n' + row;
  }
  fs.writeFileSync(agentsMdPath, content + '\n');
}

// ── Update Travel Director AGENTS.md ──

function updateDirectorAgentsMd(agents) {
  const agentsMdPath = path.join(OPENCLAW_DIR, 'workspace-travel', 'AGENTS.md');
  if (!fs.existsSync(agentsMdPath)) return;
  let content = fs.readFileSync(agentsMdPath, 'utf8');
  for (const a of agents) {
    // Append to end
    const row = `| ${a.id} | ${a.name} | L2 | workspace-${a.id} | 🗺️ | Dynamic | Tier-2 | ${a.desc} |`;
    content = content.trimEnd() + '\n' + row;
  }
  fs.writeFileSync(agentsMdPath, content + '\n');
}

// ── Main ──

function main() {
  // Parse input
  let configData;
  if (process.argv[2] === '--inline') {
    configData = JSON.parse(process.argv[3]);
  } else if (process.argv[2]) {
    configData = readJSON(process.argv[2]);
  } else {
    console.error('Usage: node provision-trip.js <config.json> | --inline \'<json>\'');
    process.exit(1);
  }

  const { tripName, tripId, parentAgent, startDate, endDate, legs = [] } = configData;

  console.log(`\n🚀 Provisioning trip: ${tripName}`);
  console.log(`   Parent: ${parentAgent} (${startDate} → ${endDate})`);
  console.log(`   Legs: ${legs.length}\n`);

  // Load openclaw.json
  const config = readJSON(CONFIG_PATH);

  // 1. Create parent manager
  console.log(`📁 Creating parent manager: ${parentAgent}`);
  const parentVars = { tripName, tripId, agentId: parentAgent, startDate, endDate };
  createManagerWorkspace(parentAgent, parentVars, true);
  createAgentDir(parentAgent);

  const parentEntry = makeAgentEntry(parentAgent, `Travel Manager: ${tripName}`);
  // Parent needs routing to legs
  for (const leg of legs) {
    parentEntry.subagents.allowAgents.push(leg.agentId);
  }
  addAgentToConfig(config, parentEntry);
  ensureSubagentRouting(config, 'travel', parentAgent);

  updateTripsRegistry(tripId, parentAgent, null, `${startDate} to ${endDate}`, tripName);

  // 2. Create leg managers
  const directorAgentEntries = [{ id: parentAgent, name: `Travel Manager: ${tripName}`, desc: tripName }];

  for (const leg of legs) {
    console.log(`📁 Creating leg manager: ${leg.agentId} (${leg.name})`);
    const legTripId = `${tripId}-${leg.name.toLowerCase().replace(/\s+/g, '-')}`;
    const legVars = {
      tripName: `${tripName} — ${leg.name}`,
      tripId: legTripId,
      agentId: leg.agentId,
      startDate: leg.startDate,
      endDate: leg.endDate,
    };
    createManagerWorkspace(leg.agentId, legVars, false);
    createAgentDir(leg.agentId);

    const legEntry = makeAgentEntry(leg.agentId, `Travel Manager: ${tripName} — ${leg.name}`);
    addAgentToConfig(config, legEntry);
    ensureSubagentRouting(config, parentAgent, leg.agentId);
    ensureSubagentRouting(config, 'travel', leg.agentId);

    updateTripsRegistry(legTripId, leg.agentId, tripId, `${leg.startDate} to ${leg.endDate}`, `${tripName} — ${leg.name}`);

    directorAgentEntries.push({ id: leg.agentId, name: `Travel Manager: ${leg.name}`, desc: `${tripName} — ${leg.name}` });
  }

  // 3. Update parent's AGENTS.md with leg references
  if (legs.length > 0) {
    updateParentAgentsMd(parentAgent, legs);
  }

  // 4. Update director AGENTS.md
  updateDirectorAgentsMd(directorAgentEntries);

  // 5. Write openclaw.json
  writeJSON(CONFIG_PATH, config);
  console.log('\n✅ openclaw.json updated');

  // 6. Summary
  console.log('\n📋 Summary of created resources:');
  console.log(`   Parent workspace: workspace-${parentAgent}/`);
  for (const leg of legs) {
    console.log(`   Leg workspace:    workspace-${leg.agentId}/`);
  }
  console.log(`\n⚠️  Run 'openclaw gateway restart' to activate new agents.`);
  console.log('✅ Done!\n');
}

try {
  main();
} catch (err) {
  console.error('❌ Provisioning failed:', err.message);
  console.error(err.stack);
  process.exit(1);
}
