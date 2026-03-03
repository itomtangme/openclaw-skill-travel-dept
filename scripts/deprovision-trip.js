#!/usr/bin/env node
/**
 * deprovision-trip.js — Automated trip deprovisioning for Travel Department
 *
 * Usage:
 *   node deprovision-trip.js --inline '<json>'
 *   node deprovision-trip.js <config.json>
 *
 * Config JSON shape:
 * {
 *   "parentAgent": "travel-manager-202605-Europe",
 *   "legs": ["travel-manager-20260515-England", "travel-manager-20260525-Iceland", ...]
 * }
 *
 * Or deprovision a single agent:
 * {
 *   "agents": ["travel-manager-20260515-England"]
 * }
 *
 * What it does:
 *   1. Removes agents from openclaw.json (agents list + all subagents.allowAgents references)
 *   2. Updates TRIPS.md status → archived
 *   3. Does NOT delete workspace folders (preserved forever per spec)
 *   4. Prints summary
 */

const fs = require('fs');
const path = require('path');

const OPENCLAW_DIR = '/root/.openclaw';
const CONFIG_PATH = path.join(OPENCLAW_DIR, 'openclaw.json');

function readJSON(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }
function writeJSON(p, obj) { fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n'); }

function removeAgentsFromConfig(config, agentIds) {
  const idSet = new Set(agentIds);

  // Remove from agents list
  config.agents.list = config.agents.list.filter(a => {
    if (idSet.has(a.id)) {
      console.log(`  🗑️  Removed agent: ${a.id}`);
      return false;
    }
    return true;
  });

  // Remove from all subagents.allowAgents arrays
  for (const agent of config.agents.list) {
    if (agent.subagents?.allowAgents) {
      const before = agent.subagents.allowAgents.length;
      agent.subagents.allowAgents = agent.subagents.allowAgents.filter(id => !idSet.has(id));
      const removed = before - agent.subagents.allowAgents.length;
      if (removed > 0) {
        console.log(`  🔗 Removed ${removed} routing ref(s) from ${agent.id}`);
      }
    }
  }
}

function archiveInTripsRegistry(agentIds) {
  const tripsPath = path.join(OPENCLAW_DIR, 'workspace-travel', 'TRIPS.md');
  if (!fs.existsSync(tripsPath)) {
    console.log('  ⚠️  TRIPS.md not found, skipping');
    return;
  }
  let content = fs.readFileSync(tripsPath, 'utf8');
  const idSet = new Set(agentIds);

  // Replace "planning" or "completed" with "archived" in rows containing agent IDs
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    for (const id of idSet) {
      if (lines[i].includes(id)) {
        lines[i] = lines[i].replace(/\| planning \|/g, '| archived |').replace(/\| completed \|/g, '| archived |');
        console.log(`  📋 Archived trip entry for ${id}`);
      }
    }
  }
  fs.writeFileSync(tripsPath, lines.join('\n'));
}

function updateDirectorAgentsMd(agentIds) {
  const agentsMdPath = path.join(OPENCLAW_DIR, 'workspace-travel', 'AGENTS.md');
  if (!fs.existsSync(agentsMdPath)) return;
  let content = fs.readFileSync(agentsMdPath, 'utf8');
  const idSet = new Set(agentIds);

  // Remove lines containing any of the agent IDs
  const lines = content.split('\n');
  const filtered = lines.filter(line => {
    for (const id of idSet) {
      if (line.includes(id)) {
        console.log(`  📝 Removed ${id} from Director AGENTS.md`);
        return false;
      }
    }
    return true;
  });
  fs.writeFileSync(agentsMdPath, filtered.join('\n'));
}

function main() {
  let configData;
  if (process.argv[2] === '--inline') {
    configData = JSON.parse(process.argv[3]);
  } else if (process.argv[2]) {
    configData = readJSON(process.argv[2]);
  } else {
    console.error('Usage: node deprovision-trip.js --inline \'<json>\' | <config.json>');
    process.exit(1);
  }

  // Build list of agent IDs to remove — legs first, then parent (order matters for multi-leg)
  const agentIds = [];
  if (configData.agents) {
    agentIds.push(...configData.agents);
  } else {
    if (configData.legs) agentIds.push(...configData.legs);
    if (configData.parentAgent) agentIds.push(configData.parentAgent);
  }

  if (agentIds.length === 0) {
    console.error('❌ No agents specified to deprovision');
    process.exit(1);
  }

  console.log(`\n🧹 Deprovisioning ${agentIds.length} agent(s):`);
  agentIds.forEach(id => console.log(`   - ${id}`));
  console.log();

  const config = readJSON(CONFIG_PATH);

  removeAgentsFromConfig(config, agentIds);
  writeJSON(CONFIG_PATH, config);
  console.log('\n✅ openclaw.json updated');

  archiveInTripsRegistry(agentIds);
  updateDirectorAgentsMd(agentIds);

  console.log('\n📋 Workspaces preserved (not deleted):');
  agentIds.forEach(id => {
    const ws = path.join(OPENCLAW_DIR, `workspace-${id}`);
    console.log(`   ${fs.existsSync(ws) ? '✅' : '⚠️ '} workspace-${id}/`);
  });

  console.log(`\n⚠️  Run 'openclaw gateway restart' to apply changes.`);
  console.log('✅ Done!\n');
}

try {
  main();
} catch (err) {
  console.error('❌ Deprovisioning failed:', err.message);
  process.exit(1);
}
