import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0D1B2A",
        accent: "#00B4D8",
        highlight: "#06D6A0",
        warn: "#FF6B35",
      },
    },
  },
  plugins: [],
};
export default config;
