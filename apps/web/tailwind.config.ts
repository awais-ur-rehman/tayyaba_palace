import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        heading: ["'Old Standard TT'", "serif"],
        sans: ["'IBM Plex Sans'", "sans-serif"],
      },
      colors: {
        background: "#FAF7F2",
        foreground: "#241C15",
        card: "#FFFFFF",
        "card-foreground": "#241C15",
        muted: "#F0EAE1",
        "muted-foreground": "#7A6F60",
        border: "#E4DBCC",
        primary: "#7A2331",
        "primary-foreground": "#FFFFFF",
        secondary: "#4A4034",
        "secondary-foreground": "#FFFFFF",
        accent: "#B8863B",
        "accent-foreground": "#241C15",
        destructive: "#B3261E",
        "destructive-foreground": "#FFFFFF",
        success: "#3D7A4F",
        "success-foreground": "#FFFFFF",
        warning: "#B8863B",
        "warning-foreground": "#241C15",
        ring: "#7A2331",
        sidebar: "#241C15",
        "sidebar-foreground": "#EFE7DA",
        "sidebar-muted": "#B8AC98",
        "sidebar-active": "#7A2331",
      },
      borderRadius: {
        sm: "4px",
        DEFAULT: "6px",
        md: "8px",
        lg: "10px",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
