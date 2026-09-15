/**
 * The names handle_new_user() falls back to when signup supplied no metadata,
 * and the one rule for showing them: don't.
 *
 * THIS MODULE IMPORTS NOTHING, DELIBERATELY. lib/messageText.ts needs
 * realCompanyName(), and scripts/verify-messaging.mjs compiles that file
 * standalone — no tsconfig, no type roots. An import chain reaching
 * types/session.ts drags in lib/supabase.ts, and the verifier dies on
 * `Cannot find name 'process'`. Keep this file a leaf.
 *
 * types/session.ts re-exports all three, so existing imports still resolve
 * there and the pair stays documented next to the session shape.
 */

/** What `profiles.full_name` says until complete-profile replaces it. */
export const PLACEHOLDER_NAME = 'New user';

/** What `organizations.name` says until the card editor replaces it. */
export const PLACEHOLDER_ORG = 'My workspace';

/**
 * The organisation's name, or null while it is still the database placeholder.
 *
 * NOTHING SHOWN TO A PERSON MAY PRINT `PLACEHOLDER_ORG`. It is a default the
 * database writes, not a name anyone chose, and since #58 moved the company
 * question to the card editor an admin can reach the app — and invite their
 * first rep — before replacing it.
 *
 * The one that mattered enough to cause this: app/invite.tsx puts the
 * organisation's name in the largest text on the screen, and that screen
 * belongs to someone who does not work there yet. "Priya invited you to join My
 * workspace" is not a first impression worth having. Close behind it,
 * card/scan-confirm.tsx would prefill it into a field that is saved to
 * `business_cards.company_name`, which is a public page.
 *
 * So every render site goes through here and falls back to copy that needs no
 * company name. The one deliberate exception is the dashboard's Company field,
 * which is the screen for fixing it and should show honestly what is stored.
 */
export function realCompanyName(company: string | null | undefined): string | null {
  const trimmed = company?.trim();
  return trimmed && trimmed !== PLACEHOLDER_ORG ? trimmed : null;
}
