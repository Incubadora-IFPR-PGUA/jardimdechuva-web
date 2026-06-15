/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary:        "#10b981",
        "primary-dark": "#059669",
        "primary-light":"#d1fae5",
        "dark-green":   "#064e3b",
        "mid-green":    "#047857",
        "bg-app":       "#f0f4f2",
      },
      fontFamily: {
        sans:    ["Inter", "system-ui", "sans-serif"],
        heading: ["Outfit", "Inter", "sans-serif"],
      },
      borderRadius: {
        sm:   "8px",
        md:   "12px",
        lg:   "16px",
        xl:   "20px",
        "2xl":"24px",
      },
      boxShadow: {
        sm: "0 1px 4px rgba(6,78,59,0.06)",
        md: "0 4px 20px rgba(6,78,59,0.08)",
        lg: "0 12px 40px rgba(6,78,59,0.13)",
        xl: "0 20px 60px rgba(6,78,59,0.16)",
      },
    },
  },
  plugins: [],
}
