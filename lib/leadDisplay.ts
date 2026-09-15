import type { ExtractionStatus } from '../data/leads';

/**
 * What to show for a lead whose card has not been read yet.
 *
 * The capture flow saves a card-scan lead before the AI has read it, so between
 * Submit and a successful extraction there is genuinely no name, no company and
 * no initial. `initialOf('')` already answers `'?'`, so nothing crashes — it
 * just reads as though the lead were broken, when in fact it is mid-flight.
 *
 * ---------------------------------------------------------------------------
 * DISPLAY ONLY. Never write these anywhere.
 *
 * Every one of these strings is a lie told to a human who is looking at a
 * screen, and it stays on the screen. The CSV export, the WhatsApp and email
 * merge fields, the weekly digest and the edit-screen prefill must all keep
 * seeing the raw `''`:
 *
 *   - a CSV cell reading "Unnamed lead" is worse than an empty one, because a
 *     spreadsheet full of them looks like data rather than like work to do;
 *   - a template greeting `Hi {{name}},` would send "Hi Reading card…," to a
 *     customer, which is the same class of bug as the blank `{{event}}` that
 *     already went out once;
 *   - prefilling the edit screen with a placeholder would have the rep save it
 *     as the person's actual name.
 *
 * If you need the value for anything other than rendering, use `lead.name`.
 * ---------------------------------------------------------------------------
 */

type Displayable = {
  name: string;
  company?: string;
  initial?: string;
  extractionStatus?: ExtractionStatus;
};

/** Still waiting on the AI, as opposed to having been told it failed. */
function isPending(lead: Displayable): boolean {
  return (lead.extractionStatus ?? 'completed') === 'pending';
}

export function displayName(lead: Displayable): string {
  const name = lead.name?.trim();
  if (name) return name;
  return isPending(lead) ? 'Reading card…' : 'Unnamed lead';
}

export function displayCompany(lead: Displayable): string {
  const company = lead.company?.trim();
  if (company) return company;
  return isPending(lead) ? 'Card being read' : 'No company';
}

/**
 * The letter in the avatar square.
 *
 * Note that a card-scan lead almost never reaches this: `CardThumb` prefers the
 * card photo, and a card-scan capture always has one. It matters for the manual
 * path and for the moment before a thumbnail resolves.
 */
export function displayInitial(lead: Displayable): string {
  const initial = lead.initial?.trim() || lead.name?.trim()?.[0];
  return (initial || '?').toUpperCase();
}

/**
 * Whether to show the rep that this card could not be read.
 *
 * `failed` is the AI having tried and got nothing. `pending` on a lead that has
 * already reached the server means extraction ran out of attempts — different
 * cause, identical consequence for the rep, so they read the same on screen.
 */
export function cardNeedsAttention(lead: {
  source?: string;
  syncStatus?: string;
  extractionStatus?: ExtractionStatus;
}): boolean {
  if (lead.source !== 'card_scan') return false;
  if (lead.syncStatus !== 'synced') return false;
  return lead.extractionStatus === 'failed' || lead.extractionStatus === 'pending';
}
