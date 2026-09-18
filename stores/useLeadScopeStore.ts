import { create } from 'zustand';

/**
 * Which event the LEADS LIST is narrowed to. `null` — the default — is every
 * event the rep can see.
 *
 * Three different "which event?" questions live in this app, and collapsing any
 * two of them is a data error rather than a cosmetic one:
 *
 *   - `useCurrentEventStore` — "which show am I WORKING IN". It decides where
 *     the NEXT captured card is filed, and is persisted because a rep works one
 *     stall for four days. This store exists precisely so that looking someone
 *     up never touches it: a rep who narrows the list to a show in March must
 *     not discover that the camera is now filing new cards into March.
 *   - `useEventSelectionStore` — "which shows am I COMPARING". A multi-select
 *     reporting question asked from a desk, read by the dashboard's
 *     across-events figures in `app/(dash)/index.tsx` and
 *     `app/(dash)/leads/index.tsx`.
 *   - this one — "which show am I LOOKING AT". One event or all of them, never
 *     a subset: the control is a single-choice sheet and the list has no way to
 *     say "these three".
 *
 * Only the id is kept, never a copy of the event — the row comes from the query
 * cache, so a renamed event is right everywhere at once. An id that no longer
 * resolves (event deleted, rep removed from it) is NOT repaired here; it falls
 * back to all events in `useLeadScope`, which is the same stale-selection rule
 * `useEventSelection` already follows.
 *
 * NOT persisted, unlike both siblings, and that is deliberate. The tab is
 * required to open showing every lead captured. A narrowing that survived a
 * cold start would be an invisible filter hiding leads days later — which is
 * the exact complaint this change answers. It does survive navigating away and
 * back within a session, which is the only span a "look this person up" scope
 * means anything over.
 */
type LeadScopeState = {
  scopedEventId: string | null;
  /** Pass null for "all events". */
  scopeToEvent: (id: string | null) => void;
};

export const useLeadScopeStore = create<LeadScopeState>((set) => ({
  scopedEventId: null,
  scopeToEvent: (scopedEventId) => set({ scopedEventId }),
}));
