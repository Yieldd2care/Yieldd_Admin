import { Platform } from 'react-native';

/**
 * Loads the website's two typefaces — Figtree for body, Urbanist for display —
 * by appending a Google Fonts <link> to <head> on the web, once, at import.
 *
 * Why not the two obvious places:
 *
 *   - `app/+html.tsx`. app.json leaves `expo.web.output` unset, which means
 *     "single", and under that mode a real `npx expo export --platform web`
 *     emits Expo's own default HTML shell and ignores +html.tsx completely.
 *     Verified against the export, not the dev server.
 *
 *   - `@import url(...)` at the top of global.css. Metro's CSS pipeline strips
 *     it — the exported stylesheet came back with zero @import and zero
 *     @font-face rules. Also verified against the export.
 *
 *   - `@expo-google-fonts/figtree` + `/urbanist` with useFonts. That works, but
 *     a static import ships the font binaries into the iOS and Android bundles
 *     for faces only yieldd.co ever renders. The app stays on Inter.
 *
 * Running at module scope means this fires during bundle evaluation, before
 * React renders, so the fetch overlaps the first paint rather than following
 * it. `display=swap` covers the gap.
 *
 * Pair these families with an explicit [font-weight:N] at the call site — see
 * the note in tailwind.config.js about `font-bold` owning font-family here.
 */

const LINK_ID = 'yieldd-web-fonts';

const HREF =
  'https://fonts.googleapis.com/css2' +
  '?family=Figtree:wght@400;500;600;700;800;900' +
  '&family=Urbanist:wght@600;700;800' +
  '&display=swap';

function head(): HTMLHeadElement | null {
  // Guarded rather than assumed: this module is evaluated on native too, and
  // would also run in a static-render pass if output ever moves to "static".
  if (Platform.OS !== 'web') return null;
  if (typeof document === 'undefined' || !document.head) return null;
  return document.head;
}

function preconnect(target: HTMLHeadElement, href: string, crossOrigin: boolean) {
  const link = document.createElement('link');
  link.rel = 'preconnect';
  link.href = href;
  if (crossOrigin) link.crossOrigin = 'anonymous';
  target.appendChild(link);
}

export function loadWebFonts() {
  const target = head();
  if (!target) return;
  // Fast refresh re-evaluates modules; without this the head collects a new
  // stylesheet link on every save.
  if (document.getElementById(LINK_ID)) return;

  preconnect(target, 'https://fonts.googleapis.com', false);
  preconnect(target, 'https://fonts.gstatic.com', true);

  const link = document.createElement('link');
  link.id = LINK_ID;
  link.rel = 'stylesheet';
  link.href = HREF;
  target.appendChild(link);
}

loadWebFonts();
