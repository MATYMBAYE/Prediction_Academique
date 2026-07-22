/** Palette et typographies definies au Cahier des Charges UI §2 */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        "encre-nocturne": "#1B2A4A",
        "brume-academique": "#EEF1F6",
        "sauge-reussite": "#4C7A64",
        "ambre-vigilance": "#D98E3F",
        "brique-alerte": "#A83E32",
        "indigo-trajectoire": "#3D5A99",
      },
      fontFamily: {
        display: ["Fraunces", "serif"],
        sans: ["Inter", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"],
      },
      fontSize: {
        xs: "12px",
        sm: "14px",
        base: "16px",
        lg: "20px",
        xl: "28px",
        "2xl": "40px",
      },
      borderRadius: {
        card: "10px",
      },
      boxShadow: {
        card: "0 2px 10px rgba(27, 42, 74, 0.08)",
      },
    },
  },
  plugins: [],
};
