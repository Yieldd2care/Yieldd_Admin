/**
 * Rehearses a migration against the LIVE database inside a rolled-back
 * transaction, then throws the work away.
 *
 *   node --env-file=.env scripts/rehearse-migration.mjs supabase/migrations/<file>.sql
 *   node --env-file=.env scripts/rehearse-migration.mjs <file>.sql --probe "select ..."
 *   node --env-file=.env scripts/rehearse-migration.mjs --sql "select ..."     # read-only
 *
 * TASKS.md records that the Phase 0b migrations were "each rehearsed in a
 * rolled-back transaction against the live database before push" — but that was
 * done by hand, so the practice lived only in a commit message. This is that
 * practice, committed.
 *
 * Postgres runs DDL transactionally, so `begin; <migration>; rollback;` really
 * does create the function, let you read back the resulting catalog state, and
 * then leave the database exactly as it was.
 *
 * What it catches: syntax errors, missing dependencies, a `drop` blocked by a
 * dependent object, and — via --probe — what the ACL or the schema actually
 * looks like afterwards.
 *
 * What it does NOT catch: lock contention under live traffic. The effects are
 * rolled back immediately rather than held open, so a slow CREATE INDEX looks
 * free here and is not. Statements that cannot run inside a transaction block
 * (CREATE INDEX CONCURRENTLY, VACUUM) cannot be rehearsed this way at all — they
 * error, which is itself the correct signal to give them their own file.
 *
 * Needs SUPABASE_ACCESS_TOKEN. Commits nothing, ever.
 */
import { readFileSync } from 'node:fs';

const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const REF = 'azpanagwuskruelbwtvb';

if (!TOKEN) {
  console.error('SUPABASE_ACCESS_TOKEN is not set. Run with: node --env-file=.env');
  process.exit(1);
}

async function adminSql(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${text}`);
  return JSON.parse(text);
}

const args = process.argv.slice(2);
const valueOf = (flag) => {
  const i = args.indexOf(flag);
  return i === -1 ? null : args[i + 1];
};
const bareSql = valueOf('--sql');
const probe = valueOf('--probe');
const file = args.find((a) => !a.startsWith('--') && a !== bareSql && a !== probe);

/**
 * Everything runs inside main() and sets `process.exitCode` rather than calling
 * process.exit(): Node 25 on Windows trips a libuv assertion when the process is
 * torn down with a just-settled fetch handle still open, which would make a
 * PASSING rehearsal report a non-zero exit code.
 */
async function main() {
  // Read-only mode: no transaction, no migration, just look at something.
  if (bareSql) {
    console.log(`\n  read-only query against ${REF}\n`);
    try {
      console.log(JSON.stringify(await adminSql(bareSql), null, 2));
    } catch (err) {
      console.error(`  QUERY FAILED\n\n  ${err.message}\n`);
      process.exitCode = 1;
    }
    return;
  }

  if (!file) {
    console.error('Usage: rehearse-migration.mjs <migration.sql> [--probe "<sql>"]');
    console.error('   or: rehearse-migration.mjs --sql "<read-only sql>"');
    process.exitCode = 1;
    return;
  }

  const sql = readFileSync(file, 'utf8');

  // The probe runs INSIDE the transaction, after the migration and before the
  // rollback — so it sees the post-migration state that will never be committed.
  const script = ['begin;', sql, probe ? `${probe.replace(/;\s*$/, '')};` : '', 'rollback;']
    .filter(Boolean)
    .join('\n');

  console.log(`\n  rehearsing ${file} against ${REF}`);
  console.log('  (begin -> migration -> probe -> rollback; nothing is committed)\n');

  try {
    const result = await adminSql(script);
    console.log('  REHEARSAL PASSED — the migration applies cleanly and was rolled back.\n');
    if (probe) {
      console.log('  probe result:');
      console.log(JSON.stringify(result, null, 2));
      console.log();
    }
  } catch (err) {
    console.error('  REHEARSAL FAILED — nothing was committed. Fix and re-run.\n');
    console.error(`  ${err.message}\n`);
    process.exitCode = 1;
  }
}

await main();
