// The weekly digest — MVP_PLAN's retention mechanism.
//
// The app is used ~15 days a year. For the other ~340 this email is the only
// thing keeping Yieldd in the customer's mind, so it has to be useful WITHOUT
// logging in: the numbers are in the email, not behind a link.
//
// WHY EMAIL AND NOT WHATSAPP: every message this product sends goes out through
// a deep link — wa.me opens the rep's own WhatsApp and they press send (3.4/3.5),
// chosen to avoid Meta approval, per-message fees and the 24-hour window. A
// SCHEDULED digest cannot use a deep link, because nobody is there to press
// send. The WhatsApp Business API would mean exactly the approval process the
// design avoided; push only reaches people who still have the app installed,
// which is precisely not the audience during the quiet months.
//
// WHY THE SAFEGUARDS MATTER MORE THAN USUAL: this sends as care@yieldd.co,
// which is also the support inbox. Google suspends an account's SENDING for 24
// hours if it exceeds the daily cap. Normal volume is nowhere near it — one
// message per customer per week — but a bug that loops is, and it would take
// support mail down with it. Hence claim-before-send in the database, a hard
// per-run cap, and a pause between messages.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const GMAIL_APP_PASSWORD = Deno.env.get('GMAIL_APP_PASSWORD');
const SENDER = Deno.env.get('DIGEST_SENDER') ?? 'care@yieldd.co';

// A hard ceiling the loop cannot talk its way past. Google's limit is 2,000/day
// and one message per customer per week is nowhere near it, so if a single run
// ever wants to send more than this, something is wrong and stopping is right.
const MAX_PER_RUN = Number(Deno.env.get('DIGEST_MAX_PER_RUN') ?? '200');

// Gmail is far happier with a trickle than a burst, and a burst of identical
// messages is what a spam filter is built to notice.
const PAUSE_MS = Number(Deno.env.get('DIGEST_PAUSE_MS') ?? '1200');

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Paise to "₹4.2L" / "₹85,000". Indian readers think in lakh, not millions. */
function rupees(paisa: number): string {
  const r = Math.round(paisa / 100);
  if (r >= 10000000) return `₹${(r / 10000000).toFixed(r % 10000000 === 0 ? 0 : 1)}Cr`;
  if (r >= 100000) return `₹${(r / 100000).toFixed(r % 100000 === 0 ? 0 : 1)}L`;
  return `₹${r.toLocaleString('en-IN')}`;
}

type DigestRow = {
  organization_id: string;
  organization_name: string;
  event_id: string;
  event_name: string;
  total_leads: number;
  contacted_week: number;
  pending_followups: number;
  deals_won: number;
  won_value_paisa: number;
  spend_paisa: number;
};

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** The one-line summary MVP_PLAN specifies. */
export function summaryLine(row: DigestRow): string {
  const parts = [
    `${row.total_leads} leads`,
    `${row.contacted_week} contacted this week`,
    `${row.pending_followups} pending`,
  ];
  if (row.deals_won > 0) {
    parts.push(`${row.deals_won} won (${rupees(row.won_value_paisa)})`);
  }
  // Only claim an ROI figure when there is a cost to divide by. "ROI 0%" for an
  // event nobody entered a budget for is a wrong number, not a missing one.
  if (row.spend_paisa > 0) {
    const pct = Math.round((row.won_value_paisa / row.spend_paisa) * 100);
    parts.push(`ROI ${pct}% recovered`);
  }
  return `${row.event_name}: ${parts.join(' · ')}`;
}

function followUpLine(row: DigestRow): string {
  if (row.pending_followups === 0) return 'Nothing is overdue for a follow-up. Well kept.';
  const isOne = row.pending_followups === 1;
  return `${row.pending_followups} ${isOne ? 'lead is' : 'leads are'} waiting on a follow-up — the ones most likely to still be warm.`;
}

function textBody(row: DigestRow, name: string): string {
  return [
    `Hi ${name},`,
    '',
    'Your week on Yieldd:',
    '',
    summaryLine(row),
    '',
    followUpLine(row),
    '',
    'Open the app to see who: https://yieldd.co',
    '',
    '—',
    'You are getting this because notifications are on for your Yieldd account.',
    'Turn them off in the app under Settings, Notifications.',
  ].join('\n');
}

function statCell(label: string, value: string): string {
  return (
    `<td style="padding:0 18px 0 0;vertical-align:top">` +
    `<div style="font:700 22px system-ui,-apple-system,sans-serif;color:#0B132B">${esc(value)}</div>` +
    `<div style="font:600 11px system-ui,-apple-system,sans-serif;color:#5A6B87;text-transform:uppercase;letter-spacing:.08em;padding-top:2px">${esc(label)}</div>` +
    `</td>`
  );
}

function htmlBody(row: DigestRow, name: string): string {
  const roi =
    row.spend_paisa > 0
      ? statCell('ROI recovered', `${Math.round((row.won_value_paisa / row.spend_paisa) * 100)}%`)
      : '';
  const won = row.deals_won > 0 ? statCell('Won', rupees(row.won_value_paisa)) : '';

  return [
    `<div style="background:#F4F6FA;padding:28px 16px">`,
    `<div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #E4E9F2;border-radius:16px;overflow:hidden">`,
    `<div style="background:#0B132B;padding:20px 24px">`,
    `<div style="font:800 17px system-ui,-apple-system,sans-serif;color:#fff;letter-spacing:-.01em">Yieldd</div>`,
    `<div style="font:500 12.5px system-ui,-apple-system,sans-serif;color:rgba(255,255,255,.62);padding-top:2px">Your week</div>`,
    `</div>`,
    `<div style="padding:24px">`,
    `<div style="font:600 14px system-ui,-apple-system,sans-serif;color:#0B132B">Hi ${esc(name)},</div>`,
    `<div style="font:700 15px system-ui,-apple-system,sans-serif;color:#0B132B;padding:18px 0 14px">${esc(row.event_name)}</div>`,
    `<table cellpadding="0" cellspacing="0" role="presentation"><tr>`,
    statCell('Leads', String(row.total_leads)),
    statCell('Contacted', String(row.contacted_week)),
    statCell('Pending', String(row.pending_followups)),
    won,
    roi,
    `</tr></table>`,
    `<div style="font:500 13.5px/1.55 system-ui,-apple-system,sans-serif;color:#5A6B87;padding-top:18px">${esc(followUpLine(row))}</div>`,
    `<a href="https://yieldd.co" style="display:inline-block;margin-top:20px;background:#F4B000;color:#0B132B;font:700 13.5px system-ui,-apple-system,sans-serif;text-decoration:none;padding:11px 20px;border-radius:8px">Open Yieldd</a>`,
    `</div>`,
    `<div style="padding:16px 24px;border-top:1px solid #EEF1F6;font:500 11.5px/1.5 system-ui,-apple-system,sans-serif;color:#97A3B8">`,
    `You are getting this because notifications are on for your Yieldd account. Turn them off in the app under Settings, Notifications.`,
    `</div></div></div>`,
  ].join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  if (!GMAIL_APP_PASSWORD) {
    return jsonResponse({ error: 'GMAIL_APP_PASSWORD is not set on this project.' }, 500);
  }

  // `dry_run` renders and reports without sending, and without claiming — this
  // is how the function gets tested against real data without mailing real
  // customers, and without burning their once-a-week slot.
  let dryRun = false;
  let onlyOrg: string | null = null;
  try {
    const body = await req.json();
    dryRun = Boolean(body?.dry_run);
    onlyOrg = body?.organization_id ?? null;
  } catch {
    /* no body: a scheduled run */
  }

  const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: rows, error: rowsError } = await db.rpc('weekly_digest_rows');
  if (rowsError) {
    return jsonResponse({ error: `Could not read the figures: ${rowsError.message}` }, 500);
  }

  let candidates = (rows ?? []) as DigestRow[];
  if (onlyOrg) candidates = candidates.filter((r) => r.organization_id === onlyOrg);

  const sent: string[] = [];
  const preview: string[] = [];
  const skipped: { org: string; why: string }[] = [];
  let smtp: SMTPClient | null = null;

  try {
    for (const row of candidates) {
      if (sent.length >= MAX_PER_RUN) {
        skipped.push({ org: row.organization_name, why: 'per-run cap reached' });
        continue;
      }

      // Admins only, and only those who have not opted out. MVP_PLAN aims this
      // at the person wondering whether the show was worth it.
      const { data: recipients } = await db
        .from('profiles')
        .select('email, full_name')
        .eq('organization_id', row.organization_id)
        .eq('role', 'admin')
        .eq('status', 'active')
        .eq('notifications_enabled', true);

      if (!recipients?.length) {
        skipped.push({ org: row.organization_name, why: 'no opted-in admin' });
        continue;
      }

      if (dryRun) {
        preview.push(`${recipients.map((r) => r.email).join(', ')} — ${summaryLine(row)}`);
        continue;
      }

      // Claimed BEFORE sending, conditional on the last send being old enough.
      // Two concurrent runs cannot both win it, and a retry after a crash
      // mid-run will not send the same organisation twice.
      const { data: claimed, error: claimError } = await db.rpc('claim_weekly_digest', {
        p_organization_id: row.organization_id,
      });
      if (claimError) {
        skipped.push({ org: row.organization_name, why: `claim failed: ${claimError.message}` });
        continue;
      }
      if (!claimed) {
        skipped.push({ org: row.organization_name, why: 'already sent this week' });
        continue;
      }

      if (!smtp) {
        smtp = new SMTPClient({
          connection: {
            hostname: 'smtp.gmail.com',
            port: 465,
            tls: true,
            auth: { username: SENDER, password: GMAIL_APP_PASSWORD },
          },
        });
      }

      for (const to of recipients) {
        const firstName = (to.full_name ?? '').trim().split(/\s+/)[0] || 'there';
        await smtp.send({
          from: `Yieldd <${SENDER}>`,
          to: to.email,
          subject: `${row.event_name}: ${row.total_leads} leads, ${row.pending_followups} waiting`,
          content: textBody(row, firstName),
          html: htmlBody(row, firstName),
        });
        sent.push(to.email);
        await sleep(PAUSE_MS);
      }
    }
  } catch (err) {
    // Partial success is reported rather than swallowed: the claims already
    // written mean those organisations will not be retried this week, so
    // whoever reads this needs to know which ones actually went out.
    return jsonResponse(
      {
        error: err instanceof Error ? err.message : 'Sending failed',
        sent_count: sent.length,
        sent,
        skipped,
      },
      500
    );
  } finally {
    try {
      await smtp?.close();
    } catch {
      /* already closed */
    }
  }

  return jsonResponse({
    dry_run: dryRun,
    considered: candidates.length,
    sent_count: sent.length,
    sent,
    preview,
    skipped,
  });
});
