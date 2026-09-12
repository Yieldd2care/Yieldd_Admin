/// <reference types="nativewind/types" />

// Also pulls in Expo's ambient module declarations, the relevant one being
// `declare module '*.css'` for the `import '../global.css'` in app/_layout.tsx.
//
// Expo normally ships these via a generated `expo-env.d.ts`, but that file is
// gitignored and only appears once the dev server has been run, so `npm run
// typecheck` on a fresh clone could not see it. TypeScript 6 (SDK 56+) reports
// an undeclared side-effect import as an error rather than ignoring it, which
// is how a missing reference that was harmless under TS 5.9 started failing.
/// <reference types="expo/types" />
