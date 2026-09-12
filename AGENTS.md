# Expo SDK 57 — read the versioned docs

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

Two things changed in the 54 → 57 jump that are easy to trip over again:

- **`@react-navigation/*` is not installable.** SDK 56 forked React Navigation into
  Expo Router, and the packages are no longer in `node_modules` at all. Take tab and
  stack types from the matching Expo Router entry point instead — `expo-router/tabs`
  re-exports the bottom-tabs types, which is where `BottomTabBarProps` now lives.
- **`expo-contacts` has two APIs.** The root import is the new Contact-class API; the
  old top-level functions are still declared there but **throw at runtime**. Anything
  using the old shape must import from `expo-contacts/legacy`.

# Horizontal ScrollView styling rule

Never put `className` (or `style`) directly on a horizontal `ScrollView` — with this project's NativeWind setup it makes descendant text reserve space but paint no glyphs, on both platforms. Put background/border styling on a plain wrapper `View` around the ScrollView; spacing goes in `contentContainerClassName` (that part is safe). See the fixed filter-pill row in `app/(app)/(tabs)/leads.tsx`.

# Never add a `shadow-*` class only on one branch of a conditional className

Tailwind compiles every `shadow-*` utility into CSS variables (`--tw-shadow`), and NativeWind can only set up a component as a variable provider **on its first render**. A class list that gains its first `shadow-*` later — the classic disabled→enabled button — makes react-native-css-interop try to upgrade the component mid-life. It logs a warning, and its warning printer walks the props with `Object.entries`, which trips a throwing getter on React Navigation's default context. The app then shows a completely unrelated red screen:

> Couldn't find a navigation context. Have you wrapped your app with 'NavigationContainer'?

There is no navigation problem. Chasing that message costs hours.

So keep the shadow present in **both** branches and vary only its alpha:

```tsx
// wrong — gains --tw-shadow after the first render
`${canSave ? 'bg-gold shadow-[0_10px_24px_rgba(244,176,0,0.30)]' : 'bg-surface'}`

// right — the variable exists from render one, the shadow is just invisible
`${canSave ? 'bg-gold shadow-[0_10px_24px_rgba(244,176,0,0.30)]'
           : 'bg-surface shadow-[0_10px_24px_rgba(244,176,0,0)]'}`
```

The same applies to every other variable-backed family: transforms (`scale-`, `rotate-`, `translate-`), `ring-`, gradients, filters (`blur-`, `brightness-`), `space-x/y-` and `divide-`. Toggling a plain style like `opacity-60` is fine — those carry no variables. Adding a pseudo-class (`active:`, `hover:`, `focus:`) to a `View` after the first render trips the same path, via a View→Pressable upgrade.
