/**
 * Which model should read business cards?
 *
 *   node --env-file=.env scripts/compare-card-models.mjs
 *   node --env-file=.env scripts/compare-card-models.mjs --runs 3
 *   node --env-file=.env scripts/compare-card-models.mjs --models claude-sonnet-5
 *
 * Runs every candidate model over the same six fixtures with the exact system
 * prompt the deployed function uses, and reports accuracy, latency and tokens
 * so the choice is made on evidence rather than on which name sounds safest.
 *
 * How it scores, and why:
 *
 *   - Digits and addresses are compared exactly. A misread phone number is a
 *     lead nobody can ever call back, which is worse than a blank field.
 *   - Names and companies are compared case- and punctuation-insensitively. A
 *     card printed in caps may come back title-cased; both are right.
 *   - INVENTED is counted separately from MISSED. A field left blank costs the
 *     rep five seconds of typing. A confidently wrong one gets sent to a
 *     customer. They are not the same failure and must not average together.
 */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(HERE, 'fixtures');
const KEY = process.env.ANTHROPIC_API_KEY;
if (!KEY) throw new Error('ANTHROPIC_API_KEY missing from .env');

const runsArg = process.argv.indexOf('--runs');
const RUNS = runsArg !== -1 ? Number(process.argv[runsArg + 1]) : 1;

const modelsArg = process.argv.indexOf('--models');
const MODELS =
  modelsArg !== -1
    ? process.argv[modelsArg + 1].split(',')
    : ['claude-haiku-4-5-20251001', 'claude-sonnet-5', 'claude-opus-5'];

// The prompt is read out of the deployed function so this can never drift from
// what production actually sends.
const SYSTEM_PROMPT = readFileSync(join(HERE, '..', 'supabase/functions/extract-card/index.ts'), 'utf8')
  .split('const SYSTEM_PROMPT = `')[1]
  .split('`;')[0];

const FIELDS = [
  'full_name', 'designation', 'company', 'phone',
  'company_landline', 'email', 'company_website', 'company_address',
];

/** Compared exactly — a wrong digit or a wrong address is unusable. */
const STRICT = new Set(['phone', 'company_landline', 'email', 'company_website', 'company_address']);

const CASES = [
  {
    file: 'card.jpeg',
    label: 'clean',
    truth: {
      full_name: 'Rajesh Menon', designation: 'Purchase Head', company: 'Northline Engineering',
      phone: '+91 98204 41720', company_landline: '022 4915 8800',
      email: 'rajesh.menon@northline.co.in', company_website: 'www.northline.co.in',
      company_address: 'Plot 47, MIDC Industrial Area, Andheri East, Mumbai 400093',
    },
  },
  {
    file: 'card-hard.jpeg',
    label: 'bad photo',
    truth: {
      full_name: 'Rajesh Menon', designation: 'Purchase Head', company: 'Northline Engineering',
      phone: '+91 98204 41720', company_landline: '022 4915 8800',
      email: 'rajesh.menon@northline.co.in', company_website: 'www.northline.co.in',
      company_address: 'Plot 47, MIDC Industrial Area, Andheri East, Mumbai 400093',
    },
  },
  {
    file: 'card-minimal.jpeg',
    label: 'minimal (5 fields must be null)',
    truth: {
      full_name: 'ANANYA KRISHNAN', designation: null, company: null,
      phone: '+91 99450 22187', company_landline: null,
      email: 'ananya.k@gmail.com', company_website: null, company_address: null,
    },
  },
  {
    file: 'card-dense.jpeg',
    label: 'dense (3 numbers, GST, long address)',
    truth: {
      full_name: 'Vikram Deshpande',
      designation: 'Assistant General Manager — Exports',
      company: 'SHREE BALAJI POLYMERS PVT. LTD.',
      phone: '09920 118 447', company_landline: '+91 20 6712 3390',
      email: 'vikram.d@shreebalajipolymers.com',
      company_website: 'shreebalajipolymers.com',
      company_address: 'Gat No. 214/2, Sanaswadi, Tal. Shirur, Pune 412208, Maharashtra',
    },
  },
  {
    file: 'card-devanagari.jpeg',
    label: 'Devanagari + English',
    truth: {
      full_name: 'Mahesh Singh Rajput', designation: 'PROPRIETOR', company: 'RAJPUT TEXTILES',
      phone: '+91 94140 77820', company_landline: null,
      email: 'mahesh@rajputtextiles.in', company_website: null,
      company_address: 'Shop No. 8, Bapu Bazar, Jaipur 302003, Rajasthan',
    },
  },
  {
    file: 'card-script.jpeg',
    label: 'script font, low contrast',
    truth: {
      full_name: 'Nikita Bhandari', designation: 'Principal Designer', company: 'Aarohi Interiors',
      phone: '098 6702 4413', company_landline: null,
      email: 'studio@aarohiinteriors.co.in', company_website: 'aarohiinteriors.co.in',
      company_address: '12 Lavelle Road, Bengaluru 560001',
    },
  },
  {
    file: 'not-a-card.jpeg',
    label: 'NOT a card (everything must be null)',
    truth: Object.fromEntries(FIELDS.map((f) => [f, null])),
  },
];

const loose = (v) =>
  String(v ?? '').toLowerCase().replace(/[.,'’\-—–\s]+/g, ' ').replace(/\s+/g, ' ').trim();

function score(got, truth) {
  let exact = 0, missed = 0, invented = 0, wrong = 0;
  const notes = [];

  for (const field of FIELDS) {
    const want = truth[field];
    const has = got?.[field] ?? null;

    if (want === null) {
      if (has === null) exact++;
      else { invented++; notes.push(`INVENTED ${field}=${JSON.stringify(has)}`); }
      continue;
    }
    if (has === null) { missed++; notes.push(`missed ${field}`); continue; }

    const match = STRICT.has(field) ? has === want : loose(has) === loose(want);
    if (match) exact++;
    else { wrong++; notes.push(`WRONG ${field}: ${JSON.stringify(has)} ≠ ${JSON.stringify(want)}`); }
  }
  return { exact, missed, invented, wrong, notes };
}

async function ask(model, base64) {
  const started = Date.now();
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model, max_tokens: 1024, system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: [
        { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64 } },
        { type: 'text', text: 'Read this business card.' },
      ]}],
    }),
  });
  const ms = Date.now() - started;
  if (!res.ok) return { ms, error: `HTTP ${res.status} ${(await res.text()).slice(0, 160)}` };

  const body = await res.json();
  const text = body.content?.[0]?.text ?? '';
  let parsed = null;
  const match = text.match(/\{[\s\S]*\}/);
  if (match) { try { parsed = JSON.parse(match[0]); } catch { /* left null */ } }

  return { ms, parsed, usage: body.usage ?? {} };
}

const missing = CASES.filter((c) => !existsSync(join(FIXTURES, c.file)));
if (missing.length) throw new Error(`missing fixtures: ${missing.map((m) => m.file).join(', ')}`);

const summary = [];

for (const model of MODELS) {
  let exact = 0, missed = 0, invented = 0, wrong = 0, ms = 0, inTok = 0, outTok = 0, calls = 0, errored = 0;
  console.log(`\n${'='.repeat(78)}\n${model}\n${'='.repeat(78)}`);

  for (const testCase of CASES) {
    const base64 = readFileSync(join(FIXTURES, testCase.file)).toString('base64');

    for (let run = 0; run < RUNS; run++) {
      const result = await ask(model, base64);
      calls++;
      ms += result.ms;

      if (result.error) {
        errored++;
        console.log(`  ${testCase.label.padEnd(38)} ERROR ${result.error}`);
        continue;
      }
      inTok += result.usage.input_tokens ?? 0;
      outTok += result.usage.output_tokens ?? 0;

      const s = score(result.parsed, testCase.truth);
      exact += s.exact; missed += s.missed; invented += s.invented; wrong += s.wrong;

      const flag = s.invented || s.wrong ? '!' : ' ';
      console.log(
        `${flag} ${testCase.label.padEnd(38)} ${s.exact}/8  ${String(result.ms).padStart(5)} ms` +
          `  ${String(result.usage.input_tokens ?? 0).padStart(5)} in / ${String(result.usage.output_tokens ?? 0).padStart(3)} out`
      );
      s.notes.forEach((n) => console.log(`      ${n}`));
    }
  }

  const total = CASES.length * RUNS * 8;
  summary.push({
    model, exact, total, missed, invented, wrong, errored,
    avgMs: Math.round(ms / calls),
    avgIn: Math.round(inTok / Math.max(1, calls - errored)),
    avgOut: Math.round(outTok / Math.max(1, calls - errored)),
  });
}

console.log(`\n${'='.repeat(78)}\nSUMMARY  (${CASES.length} cards x ${RUNS} run(s) = ${CASES.length * RUNS * 8} fields per model)\n${'='.repeat(78)}`);
console.log(
  'model'.padEnd(28) + 'correct'.padStart(10) + 'invented'.padStart(10) +
  'wrong'.padStart(8) + 'missed'.padStart(8) + 'avg ms'.padStart(9) + 'tokens in/out'.padStart(16)
);
for (const r of summary) {
  console.log(
    r.model.padEnd(28) +
    `${r.exact}/${r.total}`.padStart(10) +
    String(r.invented).padStart(10) +
    String(r.wrong).padStart(8) +
    String(r.missed).padStart(8) +
    String(r.avgMs).padStart(9) +
    `${r.avgIn}/${r.avgOut}`.padStart(16) +
    (r.errored ? `   (${r.errored} errored)` : '')
  );
}
console.log(
  '\nInvented and wrong are the ones that cost you a customer; missed only costs typing.\n' +
  'Input tokens are almost entirely the image, so they barely differ between models —\n' +
  'the price difference is the per-token rate, not the volume.'
);
