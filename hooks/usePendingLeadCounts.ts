import { useMemo } from 'react';

import { useLeadsStore } from '../stores/useLeadsStore';

/**
 * Captures still in the outbox, per event.
 *
 * `event.leads` is counted by the server and is right, but for a few seconds
 * after a scan — or for as long as there is no signal — it is legitimately
 * behind what the rep just did. Shown separately rather than added in: a
 * single merged total would be a number the server does not agree with, and
 * a lead that was inserted just as the response was lost would briefly be
 * counted twice.
 *
 * Selected raw and grouped here, never inside the selector — deriving in a
 * zustand selector returns a new object every render and loops.
 */
export function usePendingLeadCounts(): Record<string, number> {
  const allLeads = useLeadsStore((s) => s.leads);

  return useMemo(() => {
    const counts: Record<string, number> = {};
    for (const lead of allLeads) {
      if (lead.syncStatus !== 'draft') continue;
      counts[lead.eventId] = (counts[lead.eventId] ?? 0) + 1;
    }
    return counts;
  }, [allLeads]);
}
