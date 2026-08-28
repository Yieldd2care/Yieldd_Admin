import { useEffect } from 'react';

import { useLeadsStore } from '../stores/useLeadsStore';
import { useSessionStore } from '../stores/useSessionStore';

/**
 * Keeps the on-device lead cache in step with the server.
 *
 * Mounted once, high in the signed-in tree, rather than in each screen: the
 * lead list, the home counters, follow-ups and the drafts badge all read the
 * same store, and four screens each firing their own fetch on mount is four
 * requests over hall wifi for one answer.
 *
 * Both halves run on every sign-in: push what is queued, then pull what is
 * new. Push first — otherwise a pull could arrive before an offline capture
 * has been sent and briefly make it look as though it had vanished.
 */
export function useLeadsSync() {
  const userId = useSessionStore((s) => s.user?.id);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    void (async () => {
      await useLeadsStore.getState().syncDrafts(userId);
      if (!cancelled) await useLeadsStore.getState().refresh();
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);
}
