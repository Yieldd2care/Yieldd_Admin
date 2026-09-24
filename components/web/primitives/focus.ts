/**
 * The keyboard focus ring for every interactive element on the site.
 *
 * Written as arbitrary `outline` properties rather than Tailwind's `ring-*`
 * utilities on purpose: `ring-` is one of the variable-backed families
 * (--tw-ring-*), and AGENTS.md records that a component gaining one of those
 * after its first render trips react-native-css-interop's upgrade path and
 * throws a bogus "Couldn't find a navigation context" red screen. An outline
 * carries no variables, so it stays safe even if a class list changes.
 *
 * focus-visible, not focus: a mouse click should not leave a ring behind.
 */
export const FOCUS =
  '[outline:none] focus-visible:[outline:2px_solid_#F4B000] focus-visible:[outline-offset:3px]';
