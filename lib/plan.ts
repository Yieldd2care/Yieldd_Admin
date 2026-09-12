/**
 * What Free does not include, and how to say so to the person looking at it.
 *
 * One catalogue rather than a sentence written at each lock, for two reasons.
 * The wording has to agree across screens — a rep who meets the same lock in
 * two places and reads two different explanations concludes the app is
 * guessing. And the split itself has to be reviewable: this file can be read
 * against MVP_PLAN's "What Free gets" in one sitting, which a dozen scattered
 * ternaries cannot.
 *
 * Deliberately NOT in here:
 *
 *   - **A price.** The number is still undecided (PENDING #11) and the one
 *     hard-coded in the old upgrade sheet is the wrong one. A lock that quotes
 *     a stale price is worse than a lock that quotes none.
 *   - **A way to pay.** Selling moves to the website only (decided 2026-09-08,
 *     PENDING #27a). An in-app purchase path for a digital subscription is the
 *     thing Play rejects builds over, so these sheets explain and point
 *     outwards. Nothing here may grow a Pay button.
 */

export type ProFeatureId =
  | 'follow-ups'
  | 'roi'
  | 'team'
  | 'custom-fields'
  | 'event-templates'
  | 'lead-status'
  | 'reassign';

export type ProFeature = {
  /** Used as the sheet's heading, so it names the thing, not the screen. */
  title: string;
  /** What it does, for someone who has never had it. One sentence. */
  what: string;
  /** What they can do instead today, on Free. Never left empty. */
  insteadOnFree: string;
};

/**
 * Every entry here is something MVP_PLAN lists under "Not included" for Free.
 *
 * Excel export is deliberately absent: it is named in "What Free gets", and
 * the terms published on the website promise it at any time. Locking it would
 * contradict both. (The pricing deck disagrees with the terms on this point —
 * that conflict is PENDING #27g and is not settled by adding a lock here.)
 *
 * The organisation-wide WhatsApp and email templates in Settings are also
 * absent, and that is the same distinction MVP_PLAN draws: one-click WhatsApp
 * and email are Free, *per-event* templates are Pro.
 */
export const PRO_FEATURES: Record<ProFeatureId, ProFeature> = {
  'follow-ups': {
    title: 'Follow-ups',
    what: 'Set a date to chase a lead, and get a list each morning of who is due today.',
    insteadOnFree: 'You can still message any lead straight from their card on the leads list.',
  },
  roi: {
    title: 'Event ROI',
    what: 'Put in what the stand cost and see your cost per lead and the value won against it.',
    insteadOnFree: 'The event dashboard still shows how many leads each event brought in.',
  },
  team: {
    title: 'Your team',
    what: 'Invite colleagues, give them roles, and see who captured what.',
    insteadOnFree: 'Free covers one person. Everything you capture is yours and stays yours.',
  },
  'custom-fields': {
    title: 'Custom fields',
    what: 'Add your own questions to the capture form, so every lead is asked the same thing.',
    insteadOnFree: 'The standard fields and a note cover most of what a card gives you.',
  },
  'event-templates': {
    title: 'Templates for this event',
    what: 'Write a different WhatsApp and email message for each event you exhibit at.',
    insteadOnFree: 'Your one WhatsApp and email template in Settings is used everywhere.',
  },
  'lead-status': {
    title: 'Lead status and deal value',
    what: 'Move a lead through qualified, won and lost, and record what the deal was worth.',
    insteadOnFree: 'A note on the lead is the place to record where a conversation got to.',
  },
  reassign: {
    title: 'Reassigning leads',
    what: 'Hand a lead to a colleague without re-typing it.',
    insteadOnFree: 'Free covers one person, so every lead already belongs to you.',
  },
};

/** Where a locked sheet sends someone. No pricing page exists yet — see the note in the sheet. */
export const PRO_SITE_URL = 'https://yieldd.co';
export const PRO_CONTACT_EMAIL = 'care@yieldd.co';

export function proFeature(id: string | undefined): ProFeature | null {
  if (!id) return null;
  return PRO_FEATURES[id as ProFeatureId] ?? null;
}

/**
 * The one place the plan is read.
 *
 * The organisation's tier wins over the copy flattened onto the profile: the
 * profile row is a snapshot taken at sign-in, so an upgrade bought on the
 * website would leave it stale until the next refresh, and a rep who has paid
 * being shown a lock is the worst version of this feature. Both being absent
 * means Free, which is the safe direction to be wrong in — it shows an
 * explanation rather than silently granting a paid feature.
 */
export function isProPlan(
  organizationTier: string | null | undefined,
  profileTier: string | null | undefined
): boolean {
  return (organizationTier ?? profileTier) === 'pro';
}
