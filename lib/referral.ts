// "Where did you hear about us?" — the options, and what gets stored (#33b).
//
// One file so the screen, the database constraint and the verify script cannot
// drift apart. The lists below were decided by the user on 2026-09-14; the
// order is theirs and is not alphabetical, so do not tidy it.
//
// IMPORTANT: the ids here are mirrored by a CHECK constraint in
// supabase/migrations/20260914120000_org_referral_source.sql. Adding an option
// means editing BOTH — `npm run verify:referral` compares the two and fails if
// they disagree, because the failure otherwise surfaces as a rejected write on
// an onboarding screen.

export type ReferralSourceId =
  | 'google'
  | 'social'
  | 'ai'
  | 'friends'
  | 'colleague'
  | 'event'
  | 'other'
  | 'skipped'
  | 'predates';

export type ReferralOption = {
  id: ReferralSourceId;
  label: string;
};

/**
 * The seven tappable answers, in the order they are shown.
 *
 * `skipped` and `predates` are deliberately NOT here. Both are storable values
 * but neither is an answer a person can choose, and leaving them out of this
 * list is what guarantees they can never be rendered as an option.
 */
export const REFERRAL_SOURCES: readonly ReferralOption[] = [
  { id: 'google', label: 'Google' },
  { id: 'social', label: 'Social media' },
  { id: 'ai', label: 'AI discovery' },
  { id: 'friends', label: 'Friends' },
  { id: 'colleague', label: 'Colleague' },
  { id: 'event', label: 'Event or conference' },
  { id: 'other', label: 'Other' },
];

/** Stored in `referral_detail` verbatim, so these are labels and not ids. */
export const SOCIAL_PLATFORMS: readonly string[] = [
  'LinkedIn',
  'Instagram',
  'YouTube',
  'WhatsApp',
  'Facebook',
  'X',
];

export const AI_PLATFORMS: readonly string[] = [
  'ChatGPT',
  'Gemini',
  'Perplexity',
  'Claude',
  'Copilot',
];

/** What the Skip link writes. A skip has to record something, or the question returns. */
export const REFERRAL_SKIPPED: ReferralSourceId = 'skipped';

/**
 * Backfilled by the migration onto organisations that existed before the
 * question did. Never written by the app — it is here so the verify script can
 * assert it is a real value and still absent from REFERRAL_SOURCES.
 */
export const REFERRAL_PREDATES: ReferralSourceId = 'predates';

/** The second list an answer opens, or null when it opens none. */
export function detailOptionsFor(id: string | null | undefined): readonly string[] | null {
  if (id === 'social') return SOCIAL_PLATFORMS;
  if (id === 'ai') return AI_PLATFORMS;
  return null;
}

/**
 * True when there is enough to save.
 *
 * Social media and AI discovery are not answers on their own — "social media"
 * tells marketing nothing without the platform — so the Continue button stays
 * disabled until the second list has been answered too.
 */
export function isCompleteAnswer(
  source: string | null | undefined,
  detail: string | null | undefined
): boolean {
  if (!source) return false;
  if (!REFERRAL_SOURCES.some((o) => o.id === source)) return false;
  if (detailOptionsFor(source) === null) return true;
  return Boolean(detail && detailOptionsFor(source)?.includes(detail));
}
