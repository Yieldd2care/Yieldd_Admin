/**
 * Which leads the phone's list shows, and in what order.
 *
 * Pulled out of `app/(app)/(tabs)/leads.tsx` so the two rules that are easy to
 * get quietly wrong — the sort key, and the order the per-show sections come
 * out in — can be checked without a renderer. See
 * `scripts/verify-lead-scope.mjs`.
 *
 * It has since taken on the rules a SCREEN would otherwise own privately, for
 * the same reason: the counters on Home are doors to these lists, so a figure
 * and the list it opens have to be the same question asked once, not two
 * filters in two files that happen to agree today.
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
 * The same narrowing `leadsInScope` applies, without the synced-only rule and
 * without the sort. `null` is every event.
 *
 * Exists because the follow-ups screen shows unsynced drafts and the leads list
 * does not, so those two cannot share `leadsInScope` — but they must share the
 * rule for what "this show" means. A figure on Home is a door to a screen, and
 * two different answers to "which leads are this show's" is exactly how a tile
 * reading 12 opens a list of 9. `verify-lead-scope.mjs` asserts the two stay one
 * rule.
 *
 * Note this drops a lead with no `eventId` when scoped, exactly as
 * `leadsInScope` does. Unfiled leads come back the moment the scope does.
 */
export function narrowToEvent<L extends { eventId: string }>(
  leads: L[],
  eventId: string | null
): L[] {
  return eventId ? leads.filter((lead) => lead.eventId === eventId) : leads;
}

/** Midnight local, so "due today" means the whole day rather than this instant. */
export function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/**
 * The follow-ups that are today's work: due today, or any day before it.
 *
 * Here rather than on the screen that lists them because three places count
 * this — Home's tile, the leads screen's cell, and the follow-ups screen itself
 * — and two of them are numbers you tap to reach the third. Three copies of a
 * date comparison is how they drift apart, and the first sign of the drift is a
 * rep tapping "3 due" and being shown four people.
 *
 * Compared at local midnight rather than at this instant, so a follow-up set for
 * this afternoon is already today's work at nine in the morning. Anything due
 * later than today is left out: next week's follow-up is not today's work and
 * would only make the list look impossible.
 *
 * Returns a NEW array, in the order it was given. The caller sorts — this screen
 * wants soonest first, which is not the newest-first rule the leads list uses.
 */
export function followUpsDue<L extends { followUpDate?: string | null }>(
  leads: L[],
  now: Date = new Date()
): L[] {
  const today = startOfDay(now);
  return leads.filter(
    (lead) => lead.followUpDate && startOfDay(new Date(lead.followUpDate)) <= today
  );
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
