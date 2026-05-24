/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class",
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        ivory: "#EFFBF4",
        cream: "#FFFFFF",
        "warm-beige": "#DFF4EA",
        warmBeige: "#DFF4EA",
        "soft-beige": "#EAF8F0",
        softBeige: "#EAF8F0",
        line: "#CFE8DC",
        "deep-charcoal": "#2C2C2C",
        charcoal: {
          light: "#4B4945",
          DEFAULT: "#2C2C2C",
          dark: "#242321"
        },
        grey: {
          light: "#F7FFFA",
          medium: "#D7E4DC",
          dark: "#777777"
        },
        muted: "#777777",
        "muted-gold": "#07835F",
        gold: "#07835F",
        "gold-light": "#BDE8D4",
        "gold-dark": "#047456",
        goldDark: "#047456",
        birthday: "#1B77C5",
        waras: "#07835F",
        passing: "#6F5B8F",
        hijriGreen: "#07835F",
        "hijri-green": "#07835F",
        passingPurple: "#6F5B8F",
        success: "#1F7A5C",
        warning: "#B98534",
        error: "#A24A43",
        info: "#476B8A"
      },
      fontFamily: {
        heading: ["Cormorant Garamond", "Georgia", "serif"],
        body: ["Didact Gothic", "Inter", "system-ui", "sans-serif"]
      },
      borderRadius: {
        card: "16px",
        button: "24px",
        input: "12px"
      },
      boxShadow: {
        soft: "0 4px 16px rgba(44, 44, 44, 0.08)",
        medium: "0 8px 24px rgba(44, 44, 44, 0.12)",
        strong: "0 12px 32px rgba(44, 44, 44, 0.16)"
      },
      spacing: {
        18: "4.5rem",
        88: "22rem"
      }
    }
  },
  plugins: []
};
