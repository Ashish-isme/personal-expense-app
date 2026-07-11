/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Neutral surface palette (Notion/Linear inspired).
        surface: {
          light: "#ffffff",
          subtle: "#f7f7f8",
          dark: "#191919",
          card: "#202020",
        },
        brand: {
          DEFAULT: "#5b5bd6",
          hover: "#4f4fc4",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "system-ui",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)",
      },
    },
  },
  plugins: [],
};
