/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
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
