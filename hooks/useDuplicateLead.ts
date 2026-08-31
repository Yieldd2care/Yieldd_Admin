import { useEffect, useState } from 'react';

import { findDuplicateLead, type DuplicateMatch } from '../lib/api/leads';
import { phoneMatchKey } from '../lib/phone';
import { useSessionStore } from '../stores/useSessionStore';

export type DuplicateCheck = {
  match: DuplicateMatch | null;
  /** True when the earlier capture is the signed-in rep's own. */
  isSelf: boolean;
};

const NONE: DuplicateCheck = { match: null, isSelf: false };

/**
 * Watches a phone number being typed and reports whether this person is already
 * at this event.
 *
 * Checked as the number is typed, not on blur. On the confirm screen the phone
 * arrives from the card scan filling the field — no focus, so no blur — and that
 * OCR path is exactly the case this feature exists for. On manual entry the
 * phone is the last field before Save, so a blur may never happen either.
 *
 * Two things keep that cheap. `phoneMatchKey` returns null under 8 digits, so a
 * half-typed number never reaches the network; and the effect is keyed on the
 * KEY rather than the raw text, so retyping `9820441720` as `+91 98204 41720`
 * does not re-fire — it is the same number.
 *
 * Never throws and never blocks: findDuplicateLead swallows its errors, so
 * offline the answer is simply "no duplicate" and the capture carries on.
 */
export function useDuplicateLead(
  eventId: string | undefined,
  phone: string
): DuplicateCheck {
  const userId = useSessionStore((s) => s.user?.id);
  const [check, setCheck] = useState<DuplicateCheck>(NONE);

  const key = phoneMatchKey(phone);

  useEffect(() => {
    if (!eventId || !key) {
      setCheck(NONE);
      return;
    }

    let cancelled = false;
    // 500ms: a phone number is typed faster than it is deliberated over, and
    // there is no per-keystroke feedback to render in the meantime.
    const timer = setTimeout(async () => {
      const match = await findDuplicateLead(eventId, phone);
      if (cancelled) return;
      setCheck(match ? { match, isSelf: match.capturedById === userId } : NONE);
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // `phone` is deliberately not a dependency: `key` is derived from it and is
    // the thing that actually changes the answer. Depending on the raw text
    // would re-run the check when only the formatting changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, key, userId]);

  return check;
}
