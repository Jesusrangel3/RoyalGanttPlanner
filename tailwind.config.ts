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
        bg: {
          primary: "#0f1117",
          secondary: "#1a1d27",
          tertiary: "#22263a",
        },
        accent: {
          blue: "#4f7cff",
          purple: "#7c5cfc",
          green: "#3ecf8e",
          yellow: "#f5a623",
          red: "#ff5c5c",
          cyan: "#38bdf8",
        },
        border: {
          DEFAULT: "#2e3352",
          subtle: "rgba(46,51,82,0.5)",
        },
        text: {
          primary: "#e8eaf6",
          secondary: "#8b93b8",
        },
      },
      fontFamily: {
        sans: ["DM Sans", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
