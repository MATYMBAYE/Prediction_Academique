/**
 * Systeme de design ISI-SUPETCH
 * ---------------------------------------------------------------------------
 * La palette d'origine (encre nocturne / brume academique) est conservee :
 * elle est coherente avec l'identite du memoire. Elle est en revanche
 * declinee en echelles completes de 50 a 900.
 *
 * Pourquoi des echelles plutot que des couleurs uniques : sans elles, chaque
 * nuance intermediaire finit ecrite en dur dans les composants sous forme
 * d'opacites (`text-encre-nocturne/60`, `bg-encre-nocturne/5`...). Le rendu
 * devient incoherent d'un ecran a l'autre et impossible a faire evoluer.
 */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // --- Couleur primaire : bleu encre academique ---
        encre: {
          50: "#F4F6FA",
          100: "#E6EBF3",
          200: "#C7D2E4",
          300: "#9AAFCE",
          400: "#6683B0",
          500: "#42618F",
          600: "#2E4874",
          700: "#233A5E",
          800: "#1B2A4A", // teinte historique du projet
          900: "#131E36",
          950: "#0B1322",
        },

        // --- Neutres chauds (evitent le gris bleute clinique) ---
        ardoise: {
          50: "#F8F9FB",
          100: "#EEF1F6", // brume academique historique
          200: "#E1E6EE",
          300: "#CBD3E0",
          400: "#9BA7BC",
          500: "#6E7B92",
          600: "#525E73",
          700: "#3D4759",
          800: "#2A3240",
          900: "#1A202B",
        },

        // --- Semantiques : reussite / vigilance / alerte ---
        sauge: {
          50: "#F1F6F3",
          100: "#DDEAE2",
          200: "#BAD5C6",
          300: "#8DB9A2",
          400: "#639A80",
          500: "#4C7A64", // sauge reussite historique
          600: "#3C6250",
          700: "#314E41",
          800: "#293F35",
          900: "#22342C",
        },
        ambre: {
          50: "#FDF7EF",
          100: "#FAEBD6",
          200: "#F4D3A8",
          300: "#EAB574",
          400: "#E19E4D",
          500: "#D98E3F", // ambre vigilance historique
          600: "#BB7128",
          700: "#985824",
          800: "#7C4823",
          900: "#663C20",
        },
        brique: {
          50: "#FCF3F2",
          100: "#FAE4E1",
          200: "#F5CDC8",
          300: "#EAAAA2",
          400: "#DB7A6E",
          500: "#C75546",
          600: "#A83E32", // brique alerte historique
          700: "#8E3227",
          800: "#762C24",
          900: "#632923",
        },
        indigo: {
          50: "#F2F5FB",
          100: "#E3EAF6",
          200: "#CCD8EE",
          300: "#A9BEE0",
          400: "#7F9CCF",
          500: "#5F7DBF",
          600: "#3D5A99", // indigo trajectoire historique
          700: "#354D82",
          800: "#2F416C",
          900: "#2B3A5B",
        },

        // Alias de compatibilite avec le code existant : les anciens noms de
        // classes continuent de fonctionner pendant la migration progressive
        // des ecrans, sans avoir a tout reecrire d'un coup.
        "encre-nocturne": "#1B2A4A",
        "brume-academique": "#EEF1F6",
        "sauge-reussite": "#4C7A64",
        "ambre-vigilance": "#D98E3F",
        "brique-alerte": "#A83E32",
        "indigo-trajectoire": "#3D5A99",

        // --- Palette glace : fonds doux pour formulaires et cartes ---
        glace: {
          50:  "#F4FBFE", // blanc glace
          100: "#E8F6FA", // glace tres clair
          200: "#DFF6FF", // bleu glace
          300: "#C9EEF7", // bleu givre
          400: "#BFEAF5", // bleu glace legerement bleute
          500: "#90D4EC", // bleu glace sature
          600: "#5BBADB", // bleu glace vif
          700: "#2A96BB", // bleu glace profond
        },
      },

      fontFamily: {
        display: ['"Fraunces"', "Georgia", "serif"],
        sans: ['"Inter"', "system-ui", "-apple-system", "sans-serif"],
        mono: ['"IBM Plex Mono"', "ui-monospace", "monospace"],
      },

      // Echelle typographique fluide : les tailles suivent un rapport
      // constant (~1.25) et embarquent leur interlignage, ce qui evite les
      // ajustements manuels de `leading-*` disperses dans les composants.
      fontSize: {
        "2xs": ["11px", { lineHeight: "16px", letterSpacing: "0.02em" }],
        xs: ["12px", { lineHeight: "18px" }],
        sm: ["13px", { lineHeight: "20px" }],
        base: ["15px", { lineHeight: "24px" }],
        lg: ["17px", { lineHeight: "26px" }],
        xl: ["21px", { lineHeight: "30px", letterSpacing: "-0.01em" }],
        "2xl": ["27px", { lineHeight: "36px", letterSpacing: "-0.02em" }],
        "3xl": ["34px", { lineHeight: "42px", letterSpacing: "-0.02em" }],
        "4xl": ["44px", { lineHeight: "52px", letterSpacing: "-0.03em" }],
      },

      borderRadius: {
        card: "14px",
        panel: "18px",
      },

      // Ombres a deux couches : une ombre de contact courte et dense, une
      // ombre de diffusion longue et douce. C'est ce qui distingue une carte
      // qui parait posee sur la page d'un simple rectangle grisatre.
      boxShadow: {
        subtile: "0 1px 2px rgba(19, 30, 54, 0.04), 0 1px 3px rgba(19, 30, 54, 0.06)",
        card: "0 1px 3px rgba(19, 30, 54, 0.05), 0 4px 12px rgba(19, 30, 54, 0.06)",
        elevee: "0 2px 6px rgba(19, 30, 54, 0.06), 0 12px 28px rgba(19, 30, 54, 0.10)",
        modale: "0 8px 20px rgba(19, 30, 54, 0.12), 0 24px 60px rgba(19, 30, 54, 0.18)",
        interieure: "inset 0 1px 2px rgba(19, 30, 54, 0.06)",
      },

      backgroundImage: {
        "degrade-encre": "linear-gradient(135deg, #233A5E 0%, #1B2A4A 55%, #131E36 100%)",
        "degrade-voile": "linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(248,249,251,0.6) 100%)",
      },

      keyframes: {
        "fondu-montant": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fondu-simple": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "glissement-droite": {
          from: { opacity: "0", transform: "translateX(16px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "apparition-modale": {
          from: { opacity: "0", transform: "translateY(12px) scale(0.98)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        chatoiement: {
          "100%": { transform: "translateX(100%)" },
        },
        pulsation: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.45" },
        },
      },

      animation: {
        "fondu-montant": "fondu-montant 0.35s cubic-bezier(0.22, 1, 0.36, 1) both",
        "fondu-simple": "fondu-simple 0.25s ease-out both",
        "glissement-droite": "glissement-droite 0.3s cubic-bezier(0.22, 1, 0.36, 1) both",
        "apparition-modale": "apparition-modale 0.22s cubic-bezier(0.22, 1, 0.36, 1) both",
        chatoiement: "chatoiement 1.6s infinite",
        pulsation: "pulsation 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },

      transitionTimingFunction: {
        douce: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [],
};
