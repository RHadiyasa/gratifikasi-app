// Berkas ini dimuat lewat `@config "../tailwind.config.js"` di styles/globals.css.
// package.json tidak memakai "type": "module", jadi ekstensi .js berarti CommonJS —
// sebelumnya di sini `import` (ESM) dicampur `module.exports` (CJS), sehingga Node
// gagal mem-parsing sebagai CJS lalu mem-parsing ulang sebagai ESM dan memunculkan
// peringatan MODULE_TYPELESS_PACKAGE_JSON di setiap build.
const { heroui } = require("@heroui/theme");

/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
      },
    },
  },
  darkMode: "class",
  plugins: [heroui()],
};

module.exports = config;
