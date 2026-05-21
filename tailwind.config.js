/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class",
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        ivory: "#FDFBF7",
        cream: "#FFFDF8",
        "warm-beige": "#EDE3D2",
        warmBeige: "#EDE3D2",
        "soft-beige": "#F4EFE7",
        softBeige: "#F4EFE7",
        line: "#E8DDCB",
        "deep-charcoal": "#2C2C2C",
        charcoal: {
          light: "#4B4945",
          DEFAULT: "#2C2C2C",
          dark: "#242321"
        },
        grey: {
          light: "#F4EFE7",
          medium: "#DED2BE",
          dark: "#777777"
        },
        muted: "#777777",
        "muted-gold": "#C9A961",
        gold: "#C9A961",
        "gold-light": "#E3D1A6",
        "gold-dark": "#9B7A2F",
        goldDark: "#9B7A2F",
        birthday: "#C9A961",
        waras: "#1F7A5C",
        passing: "#6F5B8F",
        hijriGreen: "#1F7A5C",
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
