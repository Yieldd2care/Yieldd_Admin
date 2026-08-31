/**
 * Checks that account deletion can actually complete.
 *
 * Deleting a profile fails if ANY row still points at it. Postgres blocks that
 * on `on delete restrict` — and equally on a foreign key written with no
 * delete rule at all, because the default is `no action`, which blocks just as
 * hard while looking like nothing. That is a real bug this project shipped
 * into a draft migration: only the three explicit RESTRICT columns were
 * handled, and the five silent ones would have failed at runtime, in front of
 * someone who had just typed DELETE.
 *
 * So this reads every migration, works out which columns block, and asserts
 * the deletion migration deals with each one. Add a table with a profile
 * foreign key and forget to handle it, and this fails before a user does.
 *
 *   node scripts/verify-account-deletion.mjs
 *
 * No database needed — it reads the migrations as text, so it runs in CI and
 * on a machine with no credentials.
 */
import fs from 'node:fs';
import path from 'node:path';

const MIGRATIONS = path.join(process.cwd(), 'supabase', 'migrations');
const DELETION = '20260831120000_account_deletion.sql';

/** Tables whose rows vanish with the lead/event/org they hang off. */
const CASCADES_FROM = {
  voice_notes: 'leads',
  lead_activity: 'leads',
  message_sends: 'leads',
  event_members: 'events',
  event_custom_field_defs: 'events',
};

function loadMigrations() {
  return fs
    .readdirSync(MIGRATIONS)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => ({ name: f, sql: fs.readFileSync(path.join(MIGRATIONS, f), 'utf8') }));
}

/**
 * Every column referencing public.profiles(id), with the delete rule actually
 * written on it. Tracks the enclosing `create table` so the column can be
 * named properly rather than guessed at.
 */
function findProfileReferences(migrations) {
  const found = [];

  for (const { name, sql } of migrations) {
    let table = null;
    for (const rawLine of sql.split('\n')) {
      const line = rawLine.trim();

      const createTable = line.match(/^create table (?:if not exists )?public\.(\w+)/i);
      if (createTable) {
        table = createTable[1];
        continue;
      }
      if (line === ');') {
        table = null;
        continue;
      }
      if (!table) continue;
      if (!/references\s+public\.profiles\s*\(\s*id\s*\)/i.test(line)) continue;

      const column = line.match(/^(\w+)\s+uuid/i)?.[1];
      if (!column) continue;

      const rule = /on delete cascade/i.test(line)
        ? 'cascade'
        : /on delete set null/i.test(line)
          ? 'set null'
          : /on delete restrict/i.test(line)
            ? 'restrict'
            : 'no action';

      found.push({ migration: name, table, column, rule });
    }
  }

  return found;
}

const migrations = loadMigrations();
const deletion = migrations.find((m) => m.name === DELETION);
if (!deletion) {
  console.error(`FAIL  ${DELETION} is missing — account deletion is not implemented.`);
  process.exit(1);
}

const refs = findProfileReferences(migrations);
const blocking = refs.filter((r) => r.rule === 'restrict' || r.rule === 'no action');

console.log(`Columns referencing profiles: ${refs.length}`);
for (const r of refs) {
  const mark = r.rule === 'cascade' || r.rule === 'set null' ? 'ok  ' : 'BLOCKS';
  console.log(`  ${mark} ${r.table}.${r.column}  (${r.rule})`);
}

// --- handover: every blocking column must be reassigned ---------------------
const failures = [];

for (const r of blocking) {
  const reassigns = new RegExp(
    `update\\s+public\\.${r.table}\\s+set\\s+${r.column}\\s*=`,
    'i'
  ).test(deletion.sql);

  if (!reassigns) {
    failures.push(
      `handover: ${r.table}.${r.column} is ${r.rule} but is never reassigned — the profile delete will fail`
    );
  }
}

// --- org mode: every blocking table must be emptied, directly or by cascade -
// The branch runs from "if v_mode = 'org' then" to its matching else. Searched
// forward from the start, not from the top of the file — an earlier CASE
// expression owns the first 'else' in this migration, and slicing to that
// yields an empty string and eight failures that are the script's fault.
const orgStart = deletion.sql.indexOf("if v_mode = 'org' then");
const orgEnd = orgStart + deletion.sql.slice(orgStart).search(/^ {2}else$/m);
const orgSection = deletion.sql.slice(orgStart, orgEnd);

for (const r of blocking) {
  const deletedDirectly = new RegExp(`delete\\s+from\\s+public\\.${r.table}\\b`, 'i').test(
    orgSection
  );
  const parent = CASCADES_FROM[r.table];
  const deletedByParent =
    parent && new RegExp(`delete\\s+from\\s+public\\.${parent}\\b`, 'i').test(orgSection);

  if (!deletedDirectly && !deletedByParent) {
    failures.push(
      `org mode: ${r.table} still holds rows pointing at profiles (${r.column}), and is neither deleted nor cascaded from ${parent ?? 'anything'}`
    );
  }
}

// --- the organisation row itself --------------------------------------------
const orgRefs = migrations
  .flatMap(({ sql }) =>
    sql
      .split('\n')
      .filter((l) => /references\s+public\.organizations\s*\(\s*id\s*\)/i.test(l))
  )
  .filter((l) => /on delete restrict/i.test(l) || !/on delete/i.test(l));

if (orgRefs.length && !/delete\(\)|delete\s+from\s+public\.organizations/i.test(deletion.sql)) {
  // The organisations row is removed by the Edge Function, not the migration —
  // flagged rather than failed, because it lives in another file.
  console.log(
    '\nnote  organizations is pinned by a RESTRICT reference; the row is deleted by\n' +
      '      supabase/functions/delete-account after the logins go. Verified there, not here.'
  );
}

console.log('');
if (failures.length) {
  for (const f of failures) console.log(`FAIL  ${f}`);
  console.log(`\n${failures.length} problem${failures.length === 1 ? '' : 's'}.`);
  process.exit(1);
}

console.log(`All ${blocking.length} blocking columns are handled in both modes.`);
