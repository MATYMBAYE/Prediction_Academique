import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  server: {
    host: true,      // Ecoute sur toutes les interfaces (localhost + IP reseau)
    port: 5173,
    cors: true,
    allowedHosts: true,
    // Le proxy evite les erreurs CORS en developpement et permet d'utiliser
    // des chemins relatifs (/api/...) identiques a ceux de la production.
    // On pointe explicitement vers 127.0.0.1 pour eviter toute ambiguite
    // IPv4/IPv6 sous Windows.
    proxy: {
      "/api": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  preview: {
    host: true,
    port: 5173,
    allowedHosts: true,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
        secure: false,
      },
    },
  },


  build: {
    // Fractionnement du bundle. Sans cela, tout part dans un seul fichier de
    // plus de 800 Ko : le navigateur doit le telecharger entierement avant
    // d'afficher le moindre pixel, ce qui est penalisant sur les connexions
    // mobiles frequentes a Dakar.
    //
    // En separant les bibliotheques tierces du code applicatif, le navigateur
    // met en cache `vendor-*` une fois pour toutes : les mises a jour de
    // l'application ne re-telechargent que le petit fichier qui a change.
    rollupOptions: {
      output: {
        manualChunks(identifiant) {
          if (!identifiant.includes("node_modules")) return undefined;

          // On isole le nom exact du paquet plutot que de chercher une
          // sous-chaine dans le chemin. Sans cette precision, `react-is`
          // (utilise par Recharts) tomberait dans le lot React et creerait
          // une dependance circulaire entre les deux lots.
          const segments = identifiant.split("node_modules/").pop().split("/");
          const paquet = segments[0].startsWith("@")
            ? `${segments[0]}/${segments[1]}`
            : segments[0];

          // Recharts et ses dependances de calcul : la plus grosse
          // bibliotheque du projet, requise seulement sur les ecrans
          // comportant des graphiques.
          if (
            paquet === "recharts" ||
            paquet.startsWith("d3-") ||
            paquet === "victory-vendor" ||
            paquet === "recharts-scale" ||
            paquet === "decimal.js-light"
          ) {
            return "vendor-graphiques";
          }

          if (paquet === "react-router" || paquet === "react-router-dom") {
            return "vendor-routage";
          }

          if (paquet === "axios") {
            return "vendor-reseau";
          }

          if (paquet === "react" || paquet === "react-dom" || paquet === "scheduler") {
            return "vendor-react";
          }

          return "vendor";
        },
      },
    },

    chunkSizeWarningLimit: 600,
  },
});
