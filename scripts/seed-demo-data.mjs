/**
 * Demo data for one account: four events, 64 leads, and the money behind them.
 *
 *   node --env-file=.env scripts/seed-demo-data.mjs            # write it
 *   node --env-file=.env scripts/seed-demo-data.mjs --dry-run  # print the plan
 *   node --env-file=.env scripts/seed-demo-data.mjs --clean    # take it all out
 *
 * This exists so the app can be shown to someone without a booth. A screen with
 * three leads on it does not demo: the pipeline bars have nothing to scale, the
 * ROI figure is a single deal, and the leads list never scrolls. The numbers
 * below are sized to look like three shows that actually happened and one that
 * is happening today.
 *
 * ---------------------------------------------------------------------------
 * Safety
 * ---------------------------------------------------------------------------
 *
 * Everything is scoped to ONE organisation, found by looking up ACCOUNT_EMAIL's
 * profile. The script refuses to run if that lookup returns anything other than
 * exactly one row, so a typo cannot spray demo leads across a real customer.
 *
 * `Plastindia` already exists on this account with its own costs typed in by
 * hand. It is matched BY NAME and reused; not one of its columns is written to.
 * The other three events are created by this script and are the only events
 * `--clean` will delete.
 *
 * ---------------------------------------------------------------------------
 * Why the ids are derived rather than random
 * ---------------------------------------------------------------------------
 *
 * Every row's id is a UUIDv5 of a fixed namespace plus what the row is — event
 * name, lead index, activity kind. So running this twice writes the same 64
 * leads into the same 64 rows instead of producing 128, and `--clean` can
 * delete exactly what was seeded without needing a marker column on `leads`
 * that the UI would then have to learn to ignore.
 *
 * ---------------------------------------------------------------------------
 * What the ROI screen is being fed
 * ---------------------------------------------------------------------------
 *
 * `event_stats` computes ROI from two things: `events.total_cost_paisa` (a
 * generated sum of the seven cost columns) and `deal_value_paisa` on leads
 * whose status is `won`. Both are set deliberately per event rather than left
 * to the random number generator, so the four events read as four different
 * outcomes an exhibitor would recognise:
 *
 *   Plastindia                 ₹80,000 spent   →  a strong small show
 *   India Manufacturing Show   ₹3,20,000 spent →  the one that paid for itself
 *   Auto Expo Components       ₹4,75,000 spent →  expensive, barely ahead
 *   Gujarat Industrial Expo    ₹1,85,000 spent →  still running, behind so far
 *
 * Values also sit on some `lost` leads on purpose. That is the case lib/roi.ts
 * is most careful about — a deal value on a lead that went nowhere is not
 * revenue — and a demo that never exercises it never proves it.
 *
 * ---------------------------------------------------------------------------
 * The plan tier, and the three reps
 * ---------------------------------------------------------------------------
 *
 * The organisation is moved to `pro`. Half of what is seeded here is behind a
 * Pro gate — the ROI dashboard, follow-ups, lead status, the team screen — so
 * on Free the data would be in the database and invisible on the phone, which
 * is not a demo. `isProPlan()` reads the organisation's tier first, so this one
 * column is the whole switch. Set it back to 'free' to undo.
 *
 * The reps are created through the app's own invite path, not by writing to
 * `auth.users`: an invite row, then a real signUp carrying its token, which is
 * exactly what happens when someone taps a link. `handle_new_user()` then puts
 * them in the right organisation with role `rep`, and a demo account that was
 * hand-stitched into auth would behave differently from a real one in ways
 * nobody would find until the demo.
 *
 * Captures are spread across the four of them, weighted, so the leaderboard has
 * a shape instead of one bar.
 */
import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const ACCOUNT_EMAIL = 'mrshaikh.works@gmail.com';
const PROJECT_REF = 'azpanagwuskruelbwtvb';
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

const DRY_RUN = process.argv.includes('--dry-run');
const CLEAN = process.argv.includes('--clean');

/**
 * The demo reps, and the one password all three share.
 *
 * This is a credential for three accounts that exist only to be shown on a
 * screen — they hold no real leads and can be deleted from the Supabase
 * dashboard at any time. It is in the file rather than in `.env` so that
 * whoever runs the demo can actually sign in as a rep and show the rep's view,
 * which is the only reason the accounts exist. Change it here, or set
 * DEMO_REP_PASSWORD, and re-run; existing accounts keep the old one.
 */
const DEMO_REP_PASSWORD = process.env.DEMO_REP_PASSWORD ?? 'YielddDemo@2026';

const DEMO_REPS = [
  { fullName: 'Priya Nair', email: 'priya.nair@growthsaga.in', phone: '+919820114477' },
  { fullName: 'Imran Qureshi', email: 'imran.qureshi@growthsaga.in', phone: '+919820114488' },
  { fullName: 'Rohit Deshpande', email: 'rohit.deshpande@growthsaga.in', phone: '+919820114499' },
];

/**
 * How the 64 captures are split, as a pool the picker draws from.
 *
 * 0 is the account owner. Weighted rather than even because an even split is
 * the one shape a real leaderboard never has, and the screen exists to show a
 * difference between reps.
 */
const CAPTURE_WEIGHTS = [0, 0, 0, 0, 1, 1, 1, 2, 2, 3];

// ---------------------------------------------------------------------------
// Plumbing
// ---------------------------------------------------------------------------

async function adminSql(query) {
  if (!TOKEN) throw new Error('SUPABASE_ACCESS_TOKEN is not set. Run with --env-file=.env');
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${text}`);
  return JSON.parse(text);
}

/** A SQL string literal. Single quotes doubled; null stays NULL, not 'null'. */
const q = (value) =>
  value === null || value === undefined ? 'NULL' : `'${String(value).replace(/'/g, "''")}'`;

/** UUIDv5 (SHA-1, RFC 4122) so the same input always names the same row. */
const NAMESPACE = '6f9619ff-8b86-d011-b42d-00c04fc964ff';
function uuid5(name) {
  const ns = Buffer.from(NAMESPACE.replace(/-/g, ''), 'hex');
  const hash = createHash('sha1').update(Buffer.concat([ns, Buffer.from(name, 'utf8')])).digest();
  hash[6] = (hash[6] & 0x0f) | 0x50; // version 5
  hash[8] = (hash[8] & 0x3f) | 0x80; // RFC 4122 variant
  const h = hash.subarray(0, 16).toString('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/**
 * A seeded generator, not Math.random.
 *
 * The point of deriving the ids was that a re-run converges on the same rows.
 * That is worth nothing if the row CONTENTS change every time — the demo would
 * shuffle every name and note under whoever is watching. Same seed, same data.
 */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260914);
const pick = (list) => list[Math.floor(rand() * list.length)];
const between = (min, max) => min + Math.floor(rand() * (max - min + 1));
const chance = (p) => rand() < p;

/**
 * Rupees in, paise out. Money is integer paise everywhere below.
 *
 * A null or missing cost line stays null rather than becoming 0 — an unset cost
 * and a cost of zero are different facts, and `Math.round(null * 100)` is 0
 * while `Math.round(undefined * 100)` is NaN, which would be interpolated
 * straight into the insert below and fail it.
 */
const paise = (rupees) => (rupees == null ? null : Math.round(rupees * 100));

// ---------------------------------------------------------------------------
// The four events
// ---------------------------------------------------------------------------
//
// `existing: true` means "this one is already on the account" — matched by
// name, never written to, and never deleted by --clean.

const EVENTS = [
  {
    key: 'plastindia',
    existing: true,
    name: 'Plastindia',
    spendRupees: 80000, // already on the row; repeated here only for the summary
    leadCount: 14,
    days: ['2026-09-01', '2026-09-02', '2026-09-03'],
    // Won ₹2,30,000 against ₹80,000 → +187%.
    won: [145000, 85000],
    qualified: [60000, 120000, 45000],
    lost: [70000],
    newCount: 4,
    contactedCount: 4,
    sector: 'plastics',
  },
  {
    key: 'ims',
    name: 'India Manufacturing Show',
    city: 'Bengaluru',
    stall: 'B-42',
    startDate: '2026-07-14',
    endDate: '2026-07-17',
    status: 'closed',
    leadCount: 20,
    days: ['2026-07-14', '2026-07-15', '2026-07-16', '2026-07-17'],
    costs: {
      stall: 160000,
      fabrication: 70000,
      travel: 28000,
      staff: 25000,
      marketing: 18000,
      furniture: 9000,
      accommodation: 10000,
    }, // ₹3,20,000
    // Won ₹8,85,000 → +177%. The show that paid for itself twice over.
    won: [420000, 275000, 190000],
    qualified: [150000, 95000, 240000, 80000],
    lost: [110000],
    newCount: 6,
    contactedCount: 6,
    sector: 'manufacturing',
  },
  {
    key: 'autoexpo',
    name: 'Auto Expo Components Show',
    city: 'Greater Noida',
    stall: 'D-17',
    startDate: '2026-08-20',
    endDate: '2026-08-23',
    status: 'closed',
    leadCount: 18,
    days: ['2026-08-20', '2026-08-21', '2026-08-22', '2026-08-23'],
    costs: {
      stall: 240000,
      fabrication: 105000,
      travel: 42000,
      staff: 38000,
      marketing: 22000,
      furniture: 13000,
      accommodation: 15000,
    }, // ₹4,75,000
    // Won ₹5,60,000 against ₹4,75,000 → +18%. The show that barely paid.
    won: [320000, 240000],
    qualified: [130000, 175000, 65000],
    lost: [90000, 55000],
    newCount: 5,
    contactedCount: 6,
    sector: 'auto',
  },
  {
    key: 'gujarat',
    name: 'Gujarat Industrial Expo',
    city: 'Ahmedabad',
    stall: 'A-9',
    startDate: '2026-09-12',
    endDate: '2026-09-15',
    status: 'live',
    leadCount: 12,
    days: ['2026-09-12', '2026-09-13', '2026-09-14'],
    costs: {
      stall: 95000,
      fabrication: 40000,
      travel: 16000,
      staff: 14000,
      marketing: 11000,
      furniture: 4000,
      accommodation: 5000,
    }, // ₹1,85,000
    // One deal closed on the floor, ₹4,70,000 still open in the pipeline. Behind
    // on day three of four, which is the honest picture of a live show and the
    // state the ROI screen has to survive without reading as a failure.
    won: [135000],
    qualified: [220000, 90000, 160000],
    lost: [],
    newCount: 5,
    contactedCount: 3,
    sector: 'industrial',
  },
];

// ---------------------------------------------------------------------------
// The people on the cards
// ---------------------------------------------------------------------------

const FIRST_NAMES = [
  'Rajesh', 'Priya', 'Amit', 'Sneha', 'Vikram', 'Anjali', 'Suresh', 'Kavita',
  'Manoj', 'Deepa', 'Arun', 'Meera', 'Sanjay', 'Pooja', 'Nitin', 'Rekha',
  'Harish', 'Swati', 'Prakash', 'Neha', 'Girish', 'Shalini', 'Ramesh', 'Divya',
  'Ashok', 'Nandini', 'Mahesh', 'Ritu', 'Kiran', 'Farhan', 'Imran', 'Zoya',
  'Jatin', 'Bhavna', 'Yogesh', 'Asha', 'Dinesh', 'Preeti', 'Naveen', 'Sunita',
];

const LAST_NAMES = [
  'Sharma', 'Patel', 'Reddy', 'Iyer', 'Desai', 'Mehta', 'Nair', 'Joshi',
  'Kulkarni', 'Rao', 'Gupta', 'Shetty', 'Bansal', 'Chauhan', 'Pillai', 'Kapoor',
  'Malhotra', 'Bhatt', 'Trivedi', 'Saxena', 'Menon', 'Agarwal', 'Thakur',
  'Qureshi', 'Shaikh', 'Deshpande', 'Chatterjee', 'Vaidya', 'Panchal', 'Solanki',
];

/**
 * Companies are grouped by sector so a plastics show is not full of gearbox
 * makers. `domain` drives both the email and the website, because on a real
 * card they match, and a demo where they do not is the kind of small wrongness
 * that gets noticed.
 */
const COMPANIES = {
  plastics: [
    ['Shreeji Polymers Pvt Ltd', 'shreejipolymers.in'],
    ['Kaveri Plastics Industries', 'kaveriplastics.com'],
    ['Nirmal Moulders', 'nirmalmoulders.co.in'],
    ['Vardhman Packaging Solutions', 'vardhmanpack.com'],
    ['Ganesh Extrusions', 'ganeshextrusions.in'],
    ['Aarav Polyfilms Ltd', 'aaravpolyfilms.com'],
    ['Sunrise Masterbatches', 'sunrisemb.in'],
    ['Trimurti Plastic Works', 'trimurtiplastics.com'],
  ],
  manufacturing: [
    ['Precision Tools & Dies', 'precisiontoolsdies.in'],
    ['Hind Machine Works', 'hindmachineworks.com'],
    ['Bharat CNC Systems', 'bharatcnc.in'],
    ['Konark Engineering Works', 'konarkengg.com'],
    ['Supreme Fabricators', 'supremefab.co.in'],
    ['Elite Hydraulics Pvt Ltd', 'elitehydraulics.in'],
    ['Nova Automation Systems', 'novaautomation.com'],
    ['Sai Metal Forming', 'saimetalforming.in'],
    ['Zenith Gear Industries', 'zenithgears.com'],
    ['Indus Weld Technologies', 'induswelding.in'],
  ],
  auto: [
    ['Sundaram Auto Components', 'sundaramauto.in'],
    ['Rathi Brake Systems', 'rathibrakes.com'],
    ['Apex Forgings Ltd', 'apexforgings.in'],
    ['Krishna Auto Electricals', 'krishnaautoelec.com'],
    ['Mahavir Rubber Products', 'mahavirrubber.in'],
    ['Delta Bearings India', 'deltabearings.com'],
    ['Vishwas Sheet Metal', 'vishwassheetmetal.in'],
    ['Orion Castings Pvt Ltd', 'orioncastings.com'],
    ['Sterling Wiring Harness', 'sterlingharness.in'],
  ],
  industrial: [
    ['Patel Engineering Stores', 'patelenggstores.in'],
    ['Gokul Chemicals & Coatings', 'gokulchem.com'],
    ['Rudra Industrial Supplies', 'rudraindustrial.in'],
    ['Sahyadri Pumps Pvt Ltd', 'sahyadripumps.com'],
    ['Amber Insulations', 'amberinsulations.in'],
    ['Navkar Electricals', 'navkarelectricals.com'],
    ['Shivam Conveyor Systems', 'shivamconveyors.in'],
    ['Prime Boilers & Vessels', 'primeboilers.com'],
  ],
};

const DESIGNATIONS = [
  'Purchase Manager', 'Managing Director', 'Proprietor', 'Plant Head',
  'Production Manager', 'Sales Head', 'Procurement Lead', 'Director - Operations',
  'General Manager', 'Technical Head', 'Partner', 'Business Development Manager',
  'Quality Manager', 'Maintenance Head', 'Founder',
];

const CITIES = [
  ['Pune', '411019'], ['Ahmedabad', '380015'], ['Coimbatore', '641021'],
  ['Rajkot', '360002'], ['Ludhiana', '141003'], ['Chennai', '600058'],
  ['Nashik', '422007'], ['Faridabad', '121004'], ['Indore', '452015'],
  ['Surat', '395006'], ['Bengaluru', '560058'], ['Hyderabad', '500055'],
  ['Kolhapur', '416234'], ['Vadodara', '390010'], ['Jamshedpur', '831001'],
];

const AREAS = [
  'MIDC Industrial Area', 'GIDC Estate', 'Phase II Industrial Estate',
  'SIDCO Industrial Estate', 'Focal Point', 'Peenya Industrial Area',
  'Sector 24 Industrial Area', 'Sanand Industrial Estate', 'Hadapsar Industrial Estate',
];

/**
 * Notes a rep would actually type standing at a stall - short, specific, and
 * about what happens next. Not every lead gets one: "needs a note" is a real
 * prompt in this app, and a seed where every lead has a note hides it.
 */
const NOTES = [
  'Wants a quote for 2 tonnes a month. Send the rate card by Friday.',
  'Currently buying from a Chennai supplier, unhappy with lead times.',
  'Asked for a plant visit before they commit. Keen but slow.',
  'Small buyer for now, but they are adding a second line next quarter.',
  'Price-sensitive. Wants to know if there is a slab above 500 units.',
  'Decision sits with his father, who runs the company. Follow up after Diwali.',
  'Needs a sample piece couriered. Address taken.',
  'Already using a competitor. Worth a call in three months, not now.',
  'Very warm. Asked what our payment terms look like on the first order.',
  'Exports to the Gulf, needs material certification papers with every lot.',
  'Wants the machine spec sheet and the power consumption figures.',
  'Met at the stall twice. Bringing his technical head tomorrow.',
  'Budget approved for this quarter. Send the proposal this week.',
  'Only wanted brochures. Low intent.',
  'Interested in the annual contract, not spot buying.',
  'Their plant is 40 km from our Pune unit, so logistics works in our favour.',
  'Asked about after-sales support and spare availability.',
  'Comparing three vendors. Our quote needs to land before the 20th.',
];

const TEMPERATURES = ['hot', 'warm', 'cold'];
const OUTCOMES = ['connected', 'no_answer', 'not_interested', 'meeting_set'];

const SENT_TEMPLATE =
  'Hi {{name}}, great meeting you at {{event}}. Sharing our catalogue here. Happy to talk numbers whenever you are ready. - Sarfaraz, Growth Saga';

// ---------------------------------------------------------------------------
// Building one event's leads
// ---------------------------------------------------------------------------

/** An ISO timestamp inside a show day, in IST, during hall hours. */
function duringShow(day) {
  const pad = (n) => String(n).padStart(2, '0');
  // +05:30 written out: "leads today" is counted against the event's own clock,
  // and letting the server's UTC decide would move a 6pm capture to the next day.
  return `${day}T${pad(between(10, 18))}:${pad(between(0, 59))}:${pad(between(0, 59))}+05:30`;
}

function addDays(iso, days) {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * Today, on the clock of whoever is running the demo.
 *
 * Follow-ups for the live event are placed against this rather than against a
 * date written into the file, because "Due today" is a screen in this app and
 * a hard-coded date empties it the day after it is seeded.
 */
const TODAY = new Date().toISOString().slice(0, 10);

const usedPhones = new Set();
function phoneNumber() {
  let number;
  do {
    number = `+91 ${between(70, 99)}${between(100, 999)} ${between(10000, 99999)}`;
  } while (usedPhones.has(number));
  usedPhones.add(number);
  return number;
}

const usedEmails = new Set();
function emailFor(first, last, domain) {
  const local = `${first}.${last}`.toLowerCase();
  let candidate = `${local}@${domain}`;
  let suffix = 2;
  while (usedEmails.has(candidate)) candidate = `${local}${suffix++}@${domain}`;
  usedEmails.add(candidate);
  return candidate;
}

/**
 * The status ladder for one event, expanded from the counts in EVENTS.
 *
 * Built as an explicit list rather than rolled per lead: the ROI figures above
 * are the reason this script exists, and they must not depend on how the dice
 * landed. Deal values are attached here too, so `won` and `qualified` can never
 * be written without one - the two CHECK constraints on `leads` would reject
 * the insert, which is correct of them and a bad way to find out.
 */
function statusPlan(event) {
  const plan = [];
  for (const value of event.won) plan.push({ status: 'won', dealValue: value });
  for (const value of event.qualified) plan.push({ status: 'qualified', dealValue: value });
  for (const value of event.lost) plan.push({ status: 'lost', dealValue: value });
  for (let i = 0; i < event.contactedCount; i++) plan.push({ status: 'contacted' });
  for (let i = 0; i < event.newCount; i++) plan.push({ status: 'new' });

  const remaining = event.leadCount - plan.length;
  if (remaining < 0) {
    throw new Error(`${event.name}: the status plan has ${-remaining} more leads than leadCount`);
  }
  // Any slack goes to `new`, the status a lead is in when nobody has touched it.
  for (let i = 0; i < remaining; i++) plan.push({ status: 'new' });

  // Shuffled, so the list is not sorted by status when ordered by capture time.
  for (let i = plan.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [plan[i], plan[j]] = [plan[j], plan[i]];
  }
  return plan;
}

function buildLeads(event, eventId, orgId, owners) {
  const companies = COMPANIES[event.sector];
  const lastDay = event.days[event.days.length - 1];
  const pad = (n) => String(n).padStart(2, '0');
  let dueToday = 0;

  return statusPlan(event).map((slot, index) => {
    const first = pick(FIRST_NAMES);
    const last = pick(LAST_NAMES);
    const [company, domain] = pick(companies);
    const [city, pin] = pick(CITIES);
    const capturedAt = duringShow(pick(event.days));
    // Whoever captured it also owns the follow-up. They are separate columns
    // because a lead can be handed on, but nothing here has been handed on.
    const owner = owners[pick(CAPTURE_WEIGHTS)] ?? owners[0];
    const isScan = chance(0.72);
    const hasNote = chance(0.68);
    const consent = chance(0.82);

    // A follow-up belongs on a lead somebody is actually chasing.
    let followUp = null;
    if ((slot.status === 'contacted' || slot.status === 'qualified') && chance(0.6)) {
      if (event.status !== 'live') {
        followUp = addDays(lastDay, between(3, 25)); // in the weeks after the show
      } else {
        // The first two on the live event are pinned to today. Left to the dice
        // the "Due today" list came out empty, and an empty screen is the one
        // thing a demo cannot show. The rest fall in the days after.
        followUp = dueToday < 2 ? TODAY : addDays(TODAY, between(1, 5));
        dueToday++;
      }
    }

    // Closed the week or two after the show. Nobody signs at the stall.
    const closedAt =
      slot.status === 'won'
        ? `${addDays(lastDay, between(4, 21))}T${pad(between(10, 17))}:${pad(between(0, 59))}:00+05:30`
        : null;

    return {
      id: uuid5(`yieldd-demo-lead:${event.key}:${index}`),
      organizationId: orgId,
      eventId,
      capturedBy: owner,
      assignedTo: owner,
      source: isScan ? 'card_scan' : 'manual',
      fullName: `${first} ${last}`,
      company,
      designation: pick(DESIGNATIONS),
      phone: phoneNumber(),
      email: emailFor(first, last, domain),
      extractionStatus: isScan ? 'completed' : 'pending',
      consentGiven: consent,
      consentAt: consent ? capturedAt : null,
      note: hasNote ? pick(NOTES) : null,
      temperature:
        slot.status === 'won' || slot.status === 'qualified'
          ? 'hot'
          : chance(0.75)
            ? pick(TEMPERATURES)
            : null,
      status: slot.status,
      dealValuePaisa: slot.dealValue == null ? null : paise(slot.dealValue),
      dealClosedAt: closedAt,
      followUpDate: followUp,
      savedToContacts: chance(0.35),
      createdAt: capturedAt,
      companyLandline: chance(0.55)
        ? `+91 ${between(20, 79)} ${between(2000, 4999)} ${between(1000, 9999)}`
        : null,
      companyWebsite: chance(0.8) ? `https://www.${domain}` : null,
      companyAddress: `Plot ${between(2, 180)}, ${pick(AREAS)}, ${city} ${pin}`,
      branchAddress: chance(0.18)
        ? `Unit ${between(2, 40)}, ${pick(AREAS)}, ${pick(CITIES)[0]}`
        : null,
      // `reviewed_at` means a human checked what the scan read back. Not every
      // scanned card gets that far, and the app shows the difference.
      reviewedAt: isScan && chance(0.7) ? capturedAt : null,
      outcome: slot.status === 'contacted' || slot.status === 'lost' ? pick(OUTCOMES) : null,
      messaged: slot.status !== 'new' && chance(0.55),
    };
  });
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

const account = await adminSql(`
  select p.id, p.full_name, p.email, p.role, p.organization_id,
         o.name as org_name, o.plan_tier
  from public.profiles p
  join public.organizations o on o.id = p.organization_id
  where p.email = ${q(ACCOUNT_EMAIL)}
`);

if (account.length !== 1) {
  throw new Error(
    `Expected exactly one profile for ${ACCOUNT_EMAIL}, found ${account.length}. Refusing to write.`
  );
}

const { id: profileId, organization_id: orgId, org_name: orgName, plan_tier: planTier } = account[0];
console.log(`Account  ${account[0].full_name} <${ACCOUNT_EMAIL}>`);
console.log(`Org      ${orgName} (${orgId}) - ${planTier} plan\n`);

// ---------------------------------------------------------------------------
// Pro, and the three reps
// ---------------------------------------------------------------------------

/**
 * Everyone whose name can appear on a capture, owner first.
 *
 * Reps that already exist are reused and never signed up twice — the second
 * signUp would fail on the unique email anyway, but reusing them is what makes
 * the whole script safe to re-run.
 */
async function ensureReps() {
  const owners = [profileId];

  const present = await adminSql(`
    select id, email from public.profiles
    where organization_id = ${q(orgId)}
      and email in (${DEMO_REPS.map((rep) => q(rep.email)).join(', ')})
  `);
  const byEmail = new Map(present.map((row) => [row.email, row.id]));

  const missing = DEMO_REPS.filter((rep) => !byEmail.has(rep.email));
  if (missing.length && !DRY_RUN) {
    const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) throw new Error('EXPO_PUBLIC_SUPABASE_URL / _ANON_KEY are needed to create the reps');

    for (const rep of missing) {
      // A real invite row, redeemed by a real signUp. `handle_new_user()` reads
      // the token out of the user metadata, puts the profile in this org with
      // role `rep`, and marks the invite accepted — the same three writes a
      // person tapping the link would cause.
      const [invite] = await adminSql(`
        insert into public.invites (organization_id, invited_by, role, phone, full_name, email)
        values (${q(orgId)}, ${q(profileId)}, 'rep'::user_role,
                ${q(rep.phone)}, ${q(rep.fullName)}, ${q(rep.email)})
        returning token
      `);

      const client = createClient(url, anon, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      });
      const { data, error } = await client.auth.signUp({
        email: rep.email,
        password: DEMO_REP_PASSWORD,
        options: {
          data: { full_name: rep.fullName, phone: rep.phone, invite_token: invite.token },
        },
      });
      if (error) throw new Error(`Could not create ${rep.email}: ${error.message}`);
      byEmail.set(rep.email, data.user.id);
      console.log(`  created rep  ${rep.fullName} <${rep.email}>`);
    }
  }

  for (const rep of DEMO_REPS) {
    const id = byEmail.get(rep.email);
    if (id) owners.push(id);
  }
  return owners;
}

// Existing events are matched by name, so `Plastindia` is reused, not duplicated.
const existingRows = await adminSql(
  `select id, name from public.events where organization_id = ${q(orgId)}`
);
const existingByName = new Map(existingRows.map((row) => [row.name, row.id]));

const eventIds = new Map();
for (const event of EVENTS) {
  const found = existingByName.get(event.name);
  if (found) {
    eventIds.set(event.key, found);
  } else if (event.existing) {
    throw new Error(`${event.name} is marked as an existing event but is not on this account.`);
  } else {
    eventIds.set(event.key, uuid5(`yieldd-demo-event:${orgId}:${event.key}`));
  }
}

if (CLEAN) {
  const leadIds = EVENTS.flatMap((event) =>
    Array.from({ length: event.leadCount }, (_, i) => uuid5(`yieldd-demo-lead:${event.key}:${i}`))
  );
  const createdEventIds = EVENTS.filter((e) => !e.existing).map((e) => eventIds.get(e.key));

  // Leads first: `lead_activity` and `message_sends` cascade off them. Deleting
  // by the derived ids means a lead captured for real on one of these events is
  // not swept up with them.
  if (DRY_RUN) {
    console.log(`Would delete ${leadIds.length} leads and ${createdEventIds.length} events.`);
  } else {
    await adminSql(`delete from public.leads where id in (${leadIds.map(q).join(', ')})`);
    await adminSql(
      `delete from public.events where id in (${createdEventIds.map(q).join(', ')})
         and organization_id = ${q(orgId)}`
    );
    console.log(`Deleted ${leadIds.length} demo leads and ${createdEventIds.length} demo events.`);
    console.log('Plastindia, and anything captured on it by hand, were left alone.');
    console.log(
      'The three demo rep accounts and the Pro plan tier are NOT undone here - deleting an\n' +
        'auth user needs the service-role key, and dropping the tier would lock screens the\n' +
        'owner may now be using. Both are one action each in the Supabase dashboard.'
    );
  }
} else {
  // --- the plan, and the people -------------------------------------------

  // Before the reps, not after: `enforce_invite_seats()` refuses the third
  // invite otherwise. Pro is eight seats — the number the web dashboard design
  // prints on both the Settings and Team screens — and the account was sitting
  // on five, two of which are held by pending invites the owner sent by hand.
  // Those are left exactly where they are; a demo is no reason to revoke an
  // invite somebody is holding a link to.
  //
  // `greatest` rather than a plain assignment so a later purchase of extra
  // seats is not quietly rolled back by a re-run.
  if (!DRY_RUN) {
    await adminSql(`
      update public.organizations
         set plan_tier = 'pro'::org_plan_tier,
             seats_included = greatest(seats_included, 8),
             updated_at = now()
       where id = ${q(orgId)}`);
  }

  const owners = await ensureReps();

  // --- events -------------------------------------------------------------

  const created = EVENTS.filter((event) => !event.existing);
  const eventValues = created.map((event) => {
    const c = event.costs;
    return `(${[
      q(eventIds.get(event.key)),
      q(orgId),
      q(profileId),
      q(event.name),
      q(event.city),
      q(event.startDate),
      q(event.endDate),
      `${q(event.status)}::event_status`,
      q(event.stall),
      paise(c.stall),
      paise(c.fabrication),
      paise(c.travel),
      paise(c.staff),
      paise(c.marketing),
      paise(c.furniture),
      paise(c.accommodation),
    ].join(', ')})`;
  });

  const eventSql = `
    insert into public.events (
      id, organization_id, created_by, name, city, start_date, end_date, status, stall_number,
      cost_stall_paisa, cost_fabrication_paisa, cost_travel_paisa, cost_staff_paisa,
      cost_marketing_paisa, cost_furniture_paisa, cost_accommodation_paisa
    ) values ${eventValues.join(',\n      ')}
    on conflict (id) do update set
      city = excluded.city, start_date = excluded.start_date, end_date = excluded.end_date,
      status = excluded.status, stall_number = excluded.stall_number,
      cost_stall_paisa = excluded.cost_stall_paisa,
      cost_fabrication_paisa = excluded.cost_fabrication_paisa,
      cost_travel_paisa = excluded.cost_travel_paisa,
      cost_staff_paisa = excluded.cost_staff_paisa,
      cost_marketing_paisa = excluded.cost_marketing_paisa,
      cost_furniture_paisa = excluded.cost_furniture_paisa,
      cost_accommodation_paisa = excluded.cost_accommodation_paisa`;

  // --- leads --------------------------------------------------------------

  const allLeads = EVENTS.flatMap((event) =>
    buildLeads(event, eventIds.get(event.key), orgId, owners)
  );

  // Every rep on every event. `leads_insert_event_member` needs the row before
  // a capture is allowed, `event_leaderboard` reads the roster to decide who
  // appears, and a rep signing in to the demo sees nothing at all without it.
  const memberSql = `
    insert into public.event_members (event_id, profile_id, status, joined_at)
    values ${EVENTS.flatMap((event) =>
      owners.map(
        (owner) => `(${q(eventIds.get(event.key))}, ${q(owner)}, 'active'::member_status, now())`
      )
    ).join(',\n      ')}
    on conflict (event_id, profile_id) do update set status = 'active'::member_status`;

  const leadValues = allLeads.map(
    (lead) =>
      `(${[
        q(lead.id), q(lead.organizationId), q(lead.eventId), q(lead.capturedBy), q(lead.assignedTo),
        `${q(lead.source)}::lead_source`, q(lead.fullName), q(lead.company), q(lead.designation),
        q(lead.phone), q(lead.email), `${q(lead.extractionStatus)}::extraction_status`,
        lead.consentGiven, q(lead.consentAt), q(lead.note),
        lead.temperature ? `${q(lead.temperature)}::lead_temperature` : 'NULL',
        `${q(lead.status)}::lead_status`,
        lead.dealValuePaisa ?? 'NULL', q(lead.dealClosedAt), q(lead.followUpDate),
        lead.savedToContacts, q(lead.createdAt), q(lead.createdAt),
        q(lead.companyLandline), q(lead.companyWebsite), q(lead.companyAddress),
        q(lead.branchAddress), q(lead.reviewedAt),
      ].join(', ')})`
  );

  const leadSql = `
    insert into public.leads (
      id, organization_id, event_id, captured_by, assigned_to, source, full_name, company,
      designation, phone, email, extraction_status, consent_given, consent_at, note, temperature,
      status, deal_value_paisa, deal_closed_at, follow_up_date, saved_to_contacts,
      created_at, updated_at, company_landline, company_website, company_address,
      branch_address, reviewed_at
    ) values ${leadValues.join(',\n      ')}`;

  // --- history ------------------------------------------------------------
  //
  // A lead opened during a demo shows its timeline. Without these rows every
  // lead reads as having appeared from nowhere and never been worked, which is
  // the opposite of what this data is here to show.

  const activities = [];
  const messages = [];
  const addActivity = (lead, type, at, outcome = null) =>
    activities.push({
      id: uuid5(`yieldd-demo-activity:${lead.id}:${type}`),
      leadId: lead.id,
      // The rep who holds the lead is the one who did the thing. An admin's
      // name against every note on a rep's lead is the kind of detail a
      // prospect notices before the numbers.
      actorId: lead.capturedBy,
      type,
      at,
      outcome,
    });

  for (const lead of allLeads) {
    addActivity(lead, 'captured', lead.createdAt);
    if (lead.temperature) addActivity(lead, 'temperature_set', lead.createdAt);
    if (lead.note) addActivity(lead, 'note_added', lead.createdAt);
    if (lead.status !== 'new') {
      addActivity(lead, 'status_changed', lead.dealClosedAt ?? lead.createdAt);
    }
    if (lead.outcome) addActivity(lead, 'outcome_logged', lead.createdAt, lead.outcome);
    if (lead.followUpDate) addActivity(lead, 'follow_up_set', lead.createdAt);
    if (lead.messaged) {
      addActivity(lead, 'message_sent', lead.createdAt);
      messages.push({
        id: uuid5(`yieldd-demo-message:${lead.id}`),
        leadId: lead.id,
        sentBy: lead.capturedBy,
        channel: chance(0.75) ? 'whatsapp' : 'email',
        at: lead.createdAt,
      });
    }
  }

  // The 64 rows are deleted and written fresh rather than upserted.
  //
  // `enforce_lead_update_rules()` makes `captured_by` immutable, and it is
  // right to: who picked the card up is a fact about what happened, and a
  // product that lets it be edited cannot be trusted about any of the rest.
  // `assigned_to` is the column that moves when work is handed on. A re-run of
  // this script does need to change who captured what — the team can gain a rep
  // between runs — so it replaces the rows instead of arguing with the rule.
  //
  // The history and the messages go with them: `lead_activity` and
  // `message_sends` cascade off the lead, and rewriting the lead while keeping
  // a timeline that describes the old one is worse than having no timeline.
  const leadIdList = allLeads.map((lead) => q(lead.id)).join(', ');
  const clearSql = `delete from public.leads where id in (${leadIdList})`;

  const activitySql = `
    insert into public.lead_activity (id, lead_id, actor_id, activity_type, outcome, created_at)
    values ${activities
      .map(
        (a) =>
          `(${q(a.id)}, ${q(a.leadId)}, ${q(a.actorId)}, ${q(a.type)}::activity_type, ` +
          `${a.outcome ? `${q(a.outcome)}::lead_outcome` : 'NULL'}, ${q(a.at)})`
      )
      .join(',\n      ')}`;

  const messageSql = `
    insert into public.message_sends (id, lead_id, sent_by, channel, template_used, status, created_at)
    values ${messages
      .map(
        (m) =>
          `(${q(m.id)}, ${q(m.leadId)}, ${q(m.sentBy)}, ${q(m.channel)}::message_channel, ` +
          `${q(SENT_TEMPLATE)}, 'sent'::message_status, ${q(m.at)})`
      )
      .join(',\n      ')}`;

  console.log(`Plan      ${orgName} -> pro`);
  console.log(`Team      ${owners.length} people (1 admin, ${owners.length - 1} reps)`);
  console.log(`Events    ${EVENTS.length} (${eventValues.length} written, 1 reused)`);
  console.log(`Leads     ${allLeads.length}`);
  console.log(`History   ${activities.length} activity rows, ${messages.length} messages sent\n`);

  for (const event of EVENTS) {
    const spend =
      event.spendRupees ??
      Object.values(event.costs).reduce((sum, value) => sum + (value ?? 0), 0);
    const wonValue = event.won.reduce((sum, value) => sum + value, 0);
    // No spend recorded means no return to report, not a division by zero.
    const roi = spend > 0 ? Math.round(((wonValue - spend) / spend) * 100) : null;
    console.log(
      `  ${event.name.padEnd(26)} ${String(event.leadCount).padStart(2)} leads` +
        `  spend ${`Rs ${spend.toLocaleString('en-IN')}`.padStart(13)}` +
        `  won ${`Rs ${wonValue.toLocaleString('en-IN')}`.padStart(13)}` +
        `  ROI ${roi == null ? 'not costed' : `${roi > 0 ? '+' : ''}${roi}%`}`
    );
  }
  console.log('');

  if (DRY_RUN) {
    console.log('--dry-run: nothing was written.');
  } else {
    // Order matters: the events must exist before a lead can point at one, the
    // members before the leads for the same reason, and the history last
    // because every row of it hangs off a lead id.
    if (eventValues.length) await adminSql(eventSql);
    await adminSql(memberSql);
    await adminSql(clearSql);
    await adminSql(leadSql);
    await adminSql(activitySql);
    await adminSql(messageSql);

    const split = await adminSql(`
      select p.full_name, count(l.id) as leads,
             count(l.id) filter (where l.status = 'won') as won
      from public.profiles p
      left join public.leads l on l.captured_by = p.id
      where p.organization_id = ${q(orgId)}
      group by p.full_name order by count(l.id) desc`);
    console.log('Captures by rep');
    for (const row of split) {
      console.log(`  ${row.full_name.padEnd(20)} ${String(row.leads).padStart(2)} leads, ${row.won} won`);
    }
    console.log('\nWritten.');
  }
}
