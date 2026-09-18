/**
 * Which leads the phone's list shows, and in what order.
 *
 * Pulled out of `app/(app)/(tabs)/leads.tsx` so the two rules that are easy to
 * get quietly wrong — the sort key, and the order the per-show sections come
 * out in — can be checked without a renderer. See
 * `scripts/verify-lead-scope.mjs`.
 */

/** Only the fields scoping and ordering actually read. */
export type ScopableLead = {
  eventId: string;
  /**
   * ISO. The time on the DEVICE when the card was taken, not when the row
   * reached the server — see `leadsInScope`.
   */
  capturedAt: string;
  syncStatus: 'draft' | 'synced';
};

/**
 * The synced leads for one show — or for every show, when `eventId` is null —
 * newest capture first.
 *
 * `null` is the default and costs nothing: the store already holds every
 * event's rows, because `refresh()` is never called with an `eventId`. Scoping
 * is a filter over what is already on the device, never a narrower query.
 *
 * SORTED HERE rather than trusted from the store. `fetchLeads` orders
 * `created_at desc` and `refresh` prepends unsynced drafts to the front
 * wholesale, so the array only happens to be newest-first today. Nothing
 * enforces it, and once every show shares one list the order matters far more
 * than it did when every row came from the same stall.
 *
 * `capturedAt` is `created_at`, which `createLead` writes as the device time
 * the card was taken. A stack captured offline on Saturday and synced on Monday
 * therefore sorts into Saturday. That is correct and deliberate — do not "fix"
 * it by letting the column default.
 *
 * Compared with `Date.parse`, never as strings. `capturedAt` is not one format
 * — a device draft is `toISOString()`'s `…Z`, a server row is whatever
 * PostgREST renders the timestamptz as (`+00:00` on a UTC project, but that
 * follows the database's timezone setting). A text sort is only right while
 * every row shares one offset, and nothing in this app guarantees that:
 * `14:30:00+05:30` is 09:00Z but sorts above a `10:00Z` that really came later.
 * `Date.parse` does not care, so the question never has to be revisited.
 *
 * Drafts are excluded: they live on the drafts screen, and a lead the server
 * has not accepted yet is not in anyone's list of leads.
 *
 * Returns a NEW array. `.sort` mutates, and the input is zustand state.
 */
export function leadsInScope<L extends ScopableLead>(leads: L[], eventId: string | null): L[] {
  const at = (lead: L) => Date.parse(lead.capturedAt) || 0;
  return leads
    .filter((lead) => lead.syncStatus === 'synced' && (!eventId || lead.eventId === eventId))
    .sort((a, b) => at(b) - at(a));
}

/**
 * The list broken into one section per show, in the order their newest lead
 * appears.
 *
 * Relies on the input already being newest-first and on `Map` keeping insertion
 * order, so the show with the newest lead comes first for free. That is the
 * whole trick: there is no second sort to drift out of step with the first one,
 * and "newest first" still reads true from the top of the screen to the bottom.
 *
 * A section exists only because a lead is in it, so a show whose leads were all
 * filtered out disappears rather than leaving an empty heading behind.
 */
export function groupLeadsByEvent<L extends { eventId: string }>(
  leads: L[]
): { eventId: string; rows: L[] }[] {
  const byEvent = new Map<string, L[]>();
  for (const lead of leads) {
    const rows = byEvent.get(lead.eventId);
    if (rows) rows.push(lead);
    else byEvent.set(lead.eventId, [lead]);
  }
  return Array.from(byEvent, ([eventId, rows]) => ({ eventId, rows }));
}
