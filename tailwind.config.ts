import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        red: {
          sportac: "#E9483B",
        },
        blue: {
          night: "#1c2b4a",
        },
        gray: {
          warm: "#f5f3f0",
          dark: "#1a1a1a",
          body: "#555555",
          sub: "#888888",
        },
      },
      fontFamily: {
        condensed: ["var(--font-barlow-condensed)", "sans-serif"],
        sans: ["var(--font-barlow)", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
