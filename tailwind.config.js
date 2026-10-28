/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Design tokens derivados da referência "Control AI"
        bg: "#09090B",
        surface: "#121214",
        "surface-2": "#1B1B1F",
        "surface-3": "#232328",
        border: "#27272B",
        "border-soft": "#1F1F23",
        content: "#ECECEC",
        muted: "#8A8A90",
        "muted-2": "#5E5E66",
        accent: "#FF5C00",
        "accent-hover": "#FF7A2E",
        "accent-soft": "rgba(255, 92, 0, 0.12)",
        success: "#34D399",
        "success-soft": "rgba(52, 211, 153, 0.14)",
        danger: "#F87171",
        "danger-soft": "rgba(248, 113, 113, 0.14)",
        info: "#3B82F6",
        warning: "#FBBF24",
      },
      fontFamily: {
        display: ["Inter", "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      borderRadius: {
        card: "14px",
      },
      boxShadow: {
        card: "0 1px 0 0 rgba(255,255,255,0.02) inset, 0 8px 24px -12px rgba(0,0,0,0.6)",
        glow: "0 0 0 1px rgba(255,92,0,0.4), 0 8px 24px -8px rgba(255,92,0,0.25)",
        "glow-strong": "0 0 0 1px rgba(255,92,0,0.55), 0 0 40px -6px rgba(255,92,0,0.45)",
        button: "0 8px 28px -8px rgba(255,92,0,0.75), inset 0 1px 0 rgba(255,255,255,0.18)",
      },
    },
  },
  plugins: [],
};
