/**
 * The event economics.
 *
 * Every figure the ROI screen and the PDF show is computed here, once, from
 * two inputs: what the event cost and what the leads did. These are the numbers
 * an exhibitor takes to their finance team, so the rules are written out rather
 * than inlined into a component:
 *
 *   won value      = Σ deal_value_paisa of leads whose status is `won`
 *   event spend    = events.total_cost_paisa (the generated sum of 7 columns)
 *   ROI %          = (won value − spend) / spend × 100
 *   cost per lead  = spend / total leads
 *   cost per won   = spend / deals won
 *
 * ROI is *return on* investment, not *return of* it: ₹6,84,000 earned against
 * ₹2,82,500 spent is 142%, not 242%. Breaking even is 0%.
 *
 * Arithmetic is in integer paise throughout and only converted to rupees for
 * display. Doing it in rupees means 0.1 + 0.2, and a finance team notices.
 *
 * Every function returns `null` rather than a number when the answer is
 * genuinely unknown — no spend recorded, no leads captured. `null` renders as
 * "—" or a prompt to fill the gap; a 0 in its place is a claim, and a wrong one.
 */

export type LeadEconomics = {
  status: 'New' | 'Contacted' | 'Qualified' | 'Won' | 'Lost';
  /** Rupees, as the app carries them. Undefined when no deal value was entered. */
  dealValue?: number;
};

/** Rupees → paise, rounded, so the sum below never drifts. */
function toPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

/**
 * What has actually been closed, in paise.
 *
 * Only `Won` leads count. A deal value sitting on a lead that was later marked
 * Lost is not revenue, and including it is how an ROI figure becomes fiction.
 */
export function wonValuePaise(leads: LeadEconomics[]): number {
  return leads
    .filter((lead) => lead.status === 'Won')
    .reduce((sum, lead) => sum + toPaise(lead.dealValue ?? 0), 0);
}

export function dealsWon(leads: LeadEconomics[]): number {
  return leads.filter((lead) => lead.status === 'Won').length;
}

/**
 * Return on investment as a percentage.
 *
 *   −100  spent everything, closed nothing
 *      0  broke even
 *   +142  earned ₹2.42 for every ₹1 spent
 *
 * `null` when nothing was spent: dividing by zero is not "infinite ROI", it is
 * a missing input, and the screen should ask for the cost instead of printing
 * a number nobody can defend.
 */
export function roiPercent(wonPaise: number, spendPaise: number): number | null {
  if (!spendPaise) return null;
  return ((wonPaise - spendPaise) / spendPaise) * 100;
}

/** Spend ÷ leads, in paise. `null` when either input is missing. */
export function costPerLeadPaise(spendPaise: number, leadCount: number): number | null {
  if (!spendPaise || !leadCount) return null;
  return Math.round(spendPaise / leadCount);
}

/** Spend ÷ deals won, in paise — what each closed deal cost to win. */
export function costPerWonPaise(spendPaise: number, won: number): number | null {
  if (!spendPaise || !won) return null;
  return Math.round(spendPaise / won);
}

/** Won ÷ total, as a percentage. `null` with no leads. */
export function conversionPercent(won: number, total: number): number | null {
  if (!total) return null;
  return (won / total) * 100;
}

export type PipelineRow = {
  status: LeadEconomics['status'];
  count: number;
  /** Share of all leads, 0–100. What the number under the bar means. */
  shareOfTotal: number;
  /** Bar width, 0–100, scaled against the biggest bucket so bars are comparable. */
  barWidth: number;
};

const PIPELINE_ORDER: LeadEconomics['status'][] = ['New', 'Contacted', 'Qualified', 'Won', 'Lost'];

/**
 * How the leads are split across the five statuses.
 *
 * These are five exclusive buckets, not a funnel — a lead is New *or*
 * Contacted, never counted twice — so the counts sum to the total and the bars
 * are scaled against the largest bucket rather than against the first one.
 * The old screen drew every bar as a fraction of `New`, which made "Contacted
 * 68%" look like a conversion rate it never was.
 */
export function pipelineBreakdown(leads: LeadEconomics[]): PipelineRow[] {
  return pipelineFromCounts(
    PIPELINE_ORDER.map((status) => leads.filter((lead) => lead.status === status).length)
  );
}

/**
 * The same breakdown from counts the server already aggregated.
 *
 * A rep can only read their own leads, so counting rows on the device gives
 * them a fraction of the real total — see `event_stats` in the database.
 */
export function pipelineFromCounts(counts: number[]): PipelineRow[] {
  const total = counts.reduce((sum, n) => sum + n, 0);
  const largest = Math.max(...counts, 0);

  return PIPELINE_ORDER.map((status, i) => ({
    status,
    count: counts[i] ?? 0,
    shareOfTotal: total ? ((counts[i] ?? 0) / total) * 100 : 0,
    barWidth: largest ? ((counts[i] ?? 0) / largest) * 100 : 0,
  }));
}

export const PIPELINE_STATUSES = PIPELINE_ORDER;

export type EventEconomics = {
  totalLeads: number;
  dealsWon: number;
  wonValuePaise: number;
  spendPaise: number;
  roiPercent: number | null;
  costPerLeadPaise: number | null;
  costPerWonPaise: number | null;
  conversionPercent: number | null;
  pipeline: PipelineRow[];
};

export function eventEconomics(leads: LeadEconomics[], spendPaise: number): EventEconomics {
  const won = dealsWon(leads);
  const value = wonValuePaise(leads);

  return {
    totalLeads: leads.length,
    dealsWon: won,
    wonValuePaise: value,
    spendPaise,
    roiPercent: roiPercent(value, spendPaise),
    costPerLeadPaise: costPerLeadPaise(spendPaise, leads.length),
    costPerWonPaise: costPerWonPaise(spendPaise, won),
    conversionPercent: conversionPercent(won, leads.length),
    pipeline: pipelineBreakdown(leads),
  };
}

/** `142%`, `-100%`, or the fallback when there is nothing to divide by. */
export function formatPercent(value: number | null, fallback = '—'): string {
  if (value == null) return fallback;
  // One decimal below 10 so a 4.5% conversion rate does not display as 4% or
  // 5%; whole numbers above, where a decimal is noise.
  const rounded = Math.abs(value) < 10 ? Math.round(value * 10) / 10 : Math.round(value);
  return `${rounded}%`;
}
