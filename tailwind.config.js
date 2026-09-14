/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  /**
   * Not a dark-mode feature. This app has no dark palette and not one `dark:`
   * class anywhere — it is set to stop NativeWind throwing on the web.
   *
   * react-native-css-interop reads the darkMode flag out of the compiled CSS.
   * When the stylesheet has not arrived by the time its runtime initialises —
   * a cold `expo start -c`, a slow first paint — it installs a MutationObserver
   * on <head> and, the moment the CSS lands, calls `colorScheme.set(...)`. That
   * setter's first line throws when darkMode is 'media', which is Tailwind's
   * default. So the library trips over its own feet, and the app dies on
   * "Cannot manually set color scheme, as dark mode is type 'media'" — a red
   * screen about theming in an app that has no theming.
   *
   * It is a race, so it appears intermittently and looks like something else.
   * With 'class' the flag is present at init, that observer is never installed,
   * and the setter is legal anyway. Nothing renders differently: the variant
   * only ever activates on a `dark` class we never add.
   */
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: '#0B132B', elevated: '#101C3E' },
        blue: { DEFAULT: '#1D3F8A' },
        gold: { DEFAULT: '#F4B000', hover: '#FFC53D' },
        slate: '#5A6B87',
        hairline: '#E3E7EF',
        section: '#F5F7FB',
        surface: '#EEF1F7',
        label: '#8A98B0',
        ink: { muted: '#3C4C68' },
        success: '#4ED17F',
        placeholder: '#97A3B8',
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '16px',
        xl: '24px',
      },
      fontFamily: {
        regular: ['Inter_400Regular'],
        medium: ['Inter_500Medium'],
        semibold: ['Inter_600SemiBold'],
        bold: ['Inter_700Bold'],
        extrabold: ['Inter_800ExtraBold'],
      },
    },
  },
  plugins: [],
};
