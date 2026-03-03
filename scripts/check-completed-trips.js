#!/usr/bin/env node
/**
 * check-completed-trips.js — Find trips completed 3+ months ago, deprovision them
 *
 * Usage:
 *   node check-completed-trips.js              # dry-run (just list)
 *   node check-completed-trips.js --execute    # actually deprovision
 *   node check-completed-trips.js --months 6   # custom retention (default: 3)
 *
 * Reads TRIPS.md, finds rows with status "completed" and a completion date
 * older than the retention period, then runs deprovision-trip.js for each.
 *
 * TRIPS.md row format (completed trips have a date in the Dates column end):
 *   | trip-id | agent-id | parent | completed | 2026-05-15 to 2026-06-26 | desc | 2026-06-28 |
 *                                                                                  ^ completedAt
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const OPENCLAW_DIR = '/root/.openclaw';
const TRIPS_PATH = path.join(OPENCLAW_DIR, 'workspace-travel', 'TRIPS.md');
const DEPROVISION_SCRIPT = path.join(OPENCLAW_DIR, 'skills', 'travel-dept', 'scripts', 'deprovision-trip.js');

const args = process.argv.slice(2);
const execute = args.includes('--execute');
const monthsIdx = args.indexOf('--months');
const retentionMonths = monthsIdx !== -1 ? parseInt(args[monthsIdx + 1], 10) : 3;

function parseTripsTable(content) {
  const lines = content.split('\n');
  const trips = [];
  for (const line of lines) {
    if (!line.startsWith('|') || line.includes('---') || line.includes('Trip ID')) continue;
    const cols = line.split('|').map(c => c.trim()).filter(Boolean);
    if (cols.length < 6) continue;
    // cols: [tripId, agentId, parentTrip, status, dates, description, completedAt?]
    trips.push({
      tripId: cols[0],
      agentId: cols[1],
      parentTrip: cols[2] === '—' ? null : cols[2],
      status: cols[3],
      dates: cols[4],
      description: cols[5],
      completedAt: cols[6] || null,
    });
  }
  return trips;
}

function monthsAgo(dateStr, months) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);
  return d <= cutoff;
}

function main() {
  if (!fs.existsSync(TRIPS_PATH)) {
    console.error('❌ TRIPS.md not found');
    process.exit(1);
  }

  const content = fs.readFileSync(TRIPS_PATH, 'utf8');
  const trips = parseTripsTable(content);

  // Find completed trips older than retention period
  const expired = trips.filter(t =>
    t.status === 'completed' && t.completedAt && monthsAgo(t.completedAt, retentionMonths)
  );

  if (expired.length === 0) {
    console.log(`✅ No trips completed ${retentionMonths}+ months ago. Nothing to do.`);
    return;
  }

  console.log(`\n🔍 Found ${expired.length} trip(s) completed ${retentionMonths}+ months ago:\n`);
  for (const t of expired) {
    console.log(`   ${t.agentId} — ${t.description} (completed: ${t.completedAt})`);
  }

  if (!execute) {
    console.log('\n⚠️  Dry run. Add --execute to deprovision these agents.');
    return;
  }

  // Group by parent: deprovision legs first, then parents
  const parents = expired.filter(t => !t.parentTrip);
  const legs = expired.filter(t => t.parentTrip);

  // Deprovision parent trips (with their legs)
  for (const parent of parents) {
    const parentLegs = legs
      .filter(l => l.parentTrip === parent.tripId)
      .map(l => l.agentId);
    
    const config = JSON.stringify({
      parentAgent: parent.agentId,
      legs: parentLegs,
    });

    console.log(`\n🧹 Deprovisioning: ${parent.agentId} + ${parentLegs.length} leg(s)`);
    try {
      const output = execSync(`node ${DEPROVISION_SCRIPT} --inline '${config}'`, { encoding: 'utf8' });
      console.log(output);
    } catch (err) {
      console.error(`❌ Failed to deprovision ${parent.agentId}:`, err.message);
    }
  }

  // Deprovision orphan legs (parent not expired yet or standalone)
  const handledLegs = new Set(parents.flatMap(p =>
    legs.filter(l => l.parentTrip === p.tripId).map(l => l.agentId)
  ));
  const orphanLegs = legs.filter(l => !handledLegs.has(l.agentId));
  
  if (orphanLegs.length > 0) {
    const config = JSON.stringify({
      agents: orphanLegs.map(l => l.agentId),
    });
    console.log(`\n🧹 Deprovisioning ${orphanLegs.length} standalone leg(s)`);
    try {
      const output = execSync(`node ${DEPROVISION_SCRIPT} --inline '${config}'`, { encoding: 'utf8' });
      console.log(output);
    } catch (err) {
      console.error('❌ Failed:', err.message);
    }
  }

  console.log('\n⚠️  Run \'openclaw gateway restart\' to apply changes.');
  console.log('✅ Cleanup complete!\n');
}

try {
  main();
} catch (err) {
  console.error('❌ Check failed:', err.message);
  process.exit(1);
}
