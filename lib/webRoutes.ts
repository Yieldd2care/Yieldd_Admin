import { Platform } from 'react-native';

/**
 * Which phone screens a browser should not be looking at.
 *
 * Every `(app)` route is reachable in a browser by URL — the group has no
 * platform guard, only `(dash)` guards the other direction. So the phone's ROI
 * screen, say, opens on a monitor stretched across 1900px with a full-width
 * "Share as image" bar whose two export paths (`react-native-view-shot` and
 * `expo-media-library`) have no web implementation at all, failing into an
 * `Alert.alert` that react-native-web ships as an empty function. A button that
 * does nothing and says nothing.
 *
 * The dashboard already has proper versions of those screens, so this maps a
 * phone route to its web equivalent.
 *
 * `usePathname()` strips the group segments, so every key here is the
 * de-grouped form — `/events/123/roi`, never `/(app)/events/123/roi`.
 */

/** Exact paths, and their dashboard equivalent. */
const EXACT: Record<string, string> = {
  '/': '/(dash)',
  '/leads': '/(dash)/leads',
  '/events': '/(dash)/events',
  '/profile': '/(dash)/settings',
  // The phone's Your QR tab is a code held up at a stall. The dashboard's
  // version is the same card with the link, the published switch and what a
  // visitor actually sees — which is the half you cannot check on a phone
  // while someone is scanning it.
  '/qr': '/(dash)/card',
  '/follow-ups': '/(dash)/follow-ups',
  // The phone's Reports tile opens a list of events to pick a report from. The
  // dashboard's equivalent of "reports across every show" is the portfolio ROI
  // page, which already has the picker built into it.
  '/events/reports': '/(dash)/roi',
  '/settings/team': '/(dash)/team',
  '/settings/export': '/(dash)/export',
  '/settings/email-template': '/(dash)/templates',
  '/settings/whatsapp-template': '/(dash)/templates',
  '/settings/delete-account': '/(web)/delete-account',
};

/**
 * Patterns with an id in them. The dashboard's create-event route is one page
 * rather than the phone's six-step wizard, so the whole `events/new` subtree
 * collapses onto it.
 */
const PATTERNS: { test: RegExp; to: (m: RegExpMatchArray) => string }[] = [
  { test: /^\/events\/new(\/.*)?$/, to: () => '/(dash)/events/new' },
  /**
   * A lead's own page. The negative lookahead matters: `/leads/review`,
   * `/leads/drafts`, `/leads/bulk-send` and `/leads/send-queue` are sibling
   * screens, not lead ids, and none of them has a dashboard equivalent.
   */
  {
    test: /^\/leads\/(?!review$|drafts$|bulk-send$|send-queue$)([^/]+)$/,
    to: (m) => `/(dash)/leads/${m[1]}`,
  },
  { test: /^\/events\/([^/]+)\/roi$/, to: (m) => `/(dash)/events/${m[1]}/roi` },
  { test: /^\/events\/([^/]+)\/edit$/, to: (m) => `/(dash)/events/${m[1]}/edit` },
  { test: /^\/events\/([^/]+)\/dashboard$/, to: (m) => `/(dash)/events/${m[1]}` },
  { test: /^\/events\/([^/]+)\/export$/, to: () => '/(dash)/export' },
  { test: /^\/events\/([^/]+)\/templates$/, to: () => '/(dash)/templates' },
];

/**
 * Screens a browser must be allowed to keep, even though they live in `(app)`.
 *
 * - onboarding: the layout above actively redirects *into* complete-profile, so
 *   swallowing it would strand anyone whose profile is incomplete. The fork is
 *   where a fresh web signup lands.
 * - card: these were made web-friendly deliberately; `card/share` already has
 *   its own `Platform.OS === 'web'` download branch.
 * - payment: a gateway returns a *browser* to these URLs. Redirecting away
 *   loses the outcome the customer needs to see.
 * - capture: needs a camera or a microphone. Left alone rather than redirected,
 *   because there is no dashboard equivalent to send anyone to.
 */
const KEEP = [
  '/onboarding/',
  '/card/',
  '/payment/',
  '/capture/',
];

/**
 * Where a browser should be sent instead of `pathname`, or null to stay put.
 * Always null on native — the phone belongs in `(app)`.
 */
export function webRedirectFor(pathname: string): string | null {
  if (Platform.OS !== 'web') return null;
  if (KEEP.some((prefix) => pathname.startsWith(prefix))) return null;

  const exact = EXACT[pathname];
  if (exact) return exact;

  for (const { test, to } of PATTERNS) {
    const m = pathname.match(test);
    if (m) return to(m);
  }

  return null;
}
