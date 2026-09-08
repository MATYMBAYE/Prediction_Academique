/**
 * Jeu d'icones SVG.
 *
 * Ecrit a la main plutot que d'importer `lucide-react` ou equivalent : cela
 * evite d'ajouter 8 Mo de dependances (dont on n'utiliserait qu'une trentaine
 * d'icones) et supprime toute etape `npm install` supplementaire pour un
 * projet destine a etre installe sur les postes de l'etablissement.
 *
 * Toutes les icones partagent la meme grille 24x24, le meme trait de 1,75 px
 * et heritent de la couleur du texte parent (`currentColor`).
 *
 * Usage :
 *   <Icone.Etudiants className="h-5 w-5" />
 *   <Icone.Alerte className="h-4 w-4 text-brique-600" />
 */

function Base({ children, className = "h-5 w-5", trait = 1.75, ...reste }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={trait}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
      {...reste}
    >
      {children}
    </svg>
  );
}

/* ---------------------------------------------------------------- Navigation */

export const TableauBord = (p) => (
  <Base {...p}>
    <rect x="3" y="3" width="7.5" height="8.5" rx="1.5" />
    <rect x="13.5" y="3" width="7.5" height="5" rx="1.5" />
    <rect x="13.5" y="11" width="7.5" height="10" rx="1.5" />
    <rect x="3" y="14.5" width="7.5" height="6.5" rx="1.5" />
  </Base>
);

export const Etudiants = (p) => (
  <Base {...p}>
    <circle cx="9" cy="8" r="3.25" />
    <path d="M3 20v-1.2A4.8 4.8 0 0 1 7.8 14h2.4a4.8 4.8 0 0 1 4.8 4.8V20" />
    <path d="M16.5 5.2a3.25 3.25 0 0 1 0 6.1" />
    <path d="M18.2 14.3A4.8 4.8 0 0 1 21 18.8V20" />
  </Base>
);

export const Enseignants = (p) => (
  <Base {...p}>
    <circle cx="12" cy="7" r="3.25" />
    <path d="M5.5 20v-1.5A4.5 4.5 0 0 1 10 14h4a4.5 4.5 0 0 1 4.5 4.5V20" />
    <path d="M8.5 3.5 12 2l3.5 1.5" />
  </Base>
);

export const Classes = (p) => (
  <Base {...p}>
    <path d="M3 6.5 12 3l9 3.5-9 3.5-9-3.5Z" />
    <path d="M6.5 9v5.2c0 .6.3 1.1.8 1.4a10.5 10.5 0 0 0 9.4 0c.5-.3.8-.8.8-1.4V9" />
    <path d="M21 6.8v5.4" />
  </Base>
);

export const Matieres = (p) => (
  <Base {...p}>
    <path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H18a1 1 0 0 1 1 1v13H5.5A1.5 1.5 0 0 0 4 18.5v-14Z" />
    <path d="M4 18.5A1.5 1.5 0 0 1 5.5 17H19v4H5.5A1.5 1.5 0 0 1 4 19.5Z" />
    <path d="M8 7.5h7M8 10.5h5" />
  </Base>
);

export const Notes = (p) => (
  <Base {...p}>
    <path d="M5 3.5h9.5L19 8v12.5H5V3.5Z" />
    <path d="M14 3.5V8h5" />
    <path d="M8.5 12.5h7M8.5 16h4.5" />
  </Base>
);

export const Presence = (p) => (
  <Base {...p}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 9.5h18M8 3v4M16 3v4" />
    <path d="m9.5 14.5 1.8 1.8 3.5-3.6" />
  </Base>
);

export const Prediction = (p) => (
  <Base {...p}>
    <path d="M3 17.5 8.5 11l4 3.5L21 5" />
    <path d="M16.5 5H21v4.5" />
    <path d="M3 21h18" />
  </Base>
);

export const Alerte = (p) => (
  <Base {...p}>
    <path d="M10.6 3.6a1.6 1.6 0 0 1 2.8 0l7.2 13a1.6 1.6 0 0 1-1.4 2.4H4.8a1.6 1.6 0 0 1-1.4-2.4Z" />
    <path d="M12 9v4" />
    <circle cx="12" cy="16.2" r="0.9" fill="currentColor" stroke="none" />
  </Base>
);

export const Comptes = (p) => (
  <Base {...p}>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M4.5 20.5v-1.3A5.2 5.2 0 0 1 9.7 14h4.6a5.2 5.2 0 0 1 5.2 5.2v1.3" />
  </Base>
);

export const Rapports = (p) => (
  <Base {...p}>
    <rect x="4" y="3" width="16" height="18" rx="2" />
    <path d="M8.5 13.5v3.5M12 9.5v7.5M15.5 12v5" />
  </Base>
);

export const Reclamations = (p) => (
  <Base {...p}>
    <path d="M20.5 12.5a7.5 7.5 0 0 1-10.7 6.8L4 21l1.7-5.6A7.5 7.5 0 1 1 20.5 12.5Z" />
    <path d="M9 11h6M9 14h4" />
  </Base>
);

export const Parametres = (p) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 14.5a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.56-1.1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1-1.56V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9a1.7 1.7 0 0 0 1.56 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1.03Z" />
  </Base>
);

export const Journal = (p) => (
  <Base {...p}>
    <path d="M12 7.5v4.8l3.2 1.9" />
    <circle cx="12" cy="12.5" r="8" />
    <path d="M3.5 6.5 6 4" />
  </Base>
);

/* ------------------------------------------------------------------- Actions */

export const Recherche = (p) => (
  <Base {...p}>
    <circle cx="10.5" cy="10.5" r="6.5" />
    <path d="m20 20-4.7-4.7" />
  </Base>
);

export const Filtre = (p) => (
  <Base {...p}>
    <path d="M3.5 5.5h17l-6.6 7.6v5.6l-3.8 2v-7.6L3.5 5.5Z" />
  </Base>
);

export const Ajouter = (p) => (
  <Base {...p}>
    <path d="M12 5v14M5 12h14" />
  </Base>
);

export const Modifier = (p) => (
  <Base {...p}>
    <path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Z" />
    <path d="m14.5 6 3 3" />
  </Base>
);

export const Supprimer = (p) => (
  <Base {...p}>
    <path d="M4 6.5h16M9.5 6.5V4.8A1.3 1.3 0 0 1 10.8 3.5h2.4a1.3 1.3 0 0 1 1.3 1.3v1.7" />
    <path d="M6.5 6.5 7.4 20a1.4 1.4 0 0 0 1.4 1.3h6.4a1.4 1.4 0 0 0 1.4-1.3l.9-13.5" />
    <path d="M10.5 10.5v6.5M13.5 10.5v6.5" />
  </Base>
);

export const Telecharger = (p) => (
  <Base {...p}>
    <path d="M12 3.5v11" />
    <path d="m7.5 10.5 4.5 4.5 4.5-4.5" />
    <path d="M4 17v2.5A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5V17" />
  </Base>
);

export const Actualiser = (p) => (
  <Base {...p}>
    <path d="M20 11.5A8 8 0 1 0 18 17" />
    <path d="M20 5.5v6h-6" />
  </Base>
);

export const Fermer = (p) => (
  <Base {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Base>
);

export const Menu = (p) => (
  <Base {...p}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Base>
);

export const Deconnexion = (p) => (
  <Base {...p}>
    <path d="M9.5 21H5.5A1.5 1.5 0 0 1 4 19.5v-15A1.5 1.5 0 0 1 5.5 3h4" />
    <path d="M15.5 16.5 20 12l-4.5-4.5" />
    <path d="M20 12H9" />
  </Base>
);

/* ---------------------------------------------------------------- Directions */

export const ChevronBas = (p) => (
  <Base {...p}>
    <path d="m6 9.5 6 6 6-6" />
  </Base>
);

export const ChevronHaut = (p) => (
  <Base {...p}>
    <path d="m6 14.5 6-6 6 6" />
  </Base>
);

export const ChevronGauche = (p) => (
  <Base {...p}>
    <path d="m14.5 6-6 6 6 6" />
  </Base>
);

export const ChevronDroite = (p) => (
  <Base {...p}>
    <path d="m9.5 6 6 6-6 6" />
  </Base>
);

export const FlecheHaut = (p) => (
  <Base {...p}>
    <path d="M12 20V5M6 11l6-6 6 6" />
  </Base>
);

export const FlecheBas = (p) => (
  <Base {...p}>
    <path d="M12 4v15M6 13l6 6 6-6" />
  </Base>
);

export const TriHautBas = (p) => (
  <Base {...p} trait={2}>
    <path d="m7 9.5 2.5-3 2.5 3M7 14.5l2.5 3 2.5-3" opacity="0.9" />
  </Base>
);

/* ------------------------------------------------------------------- Statuts */

export const Valide = (p) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="m8.3 12.2 2.6 2.6 4.8-5" />
  </Base>
);

export const Validation = Valide;

export const Info = (p) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 11.5v5" />
    <circle cx="12" cy="8.3" r="0.85" fill="currentColor" stroke="none" />
  </Base>
);

export const Attention = (p) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5v5.2" />
    <circle cx="12" cy="16" r="0.85" fill="currentColor" stroke="none" />
  </Base>
);

export const Boussole = (p) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="m15.2 8.8-1.9 4.4-4.4 1.9 1.9-4.4 4.4-1.9Z" />
  </Base>
);

export const Cible = (p) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <circle cx="12" cy="12" r="4.5" />
    <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
  </Base>
);

export const Ampoule = (p) => (
  <Base {...p}>
    <path d="M9.2 17.5a5.8 5.8 0 1 1 5.6 0v1.3a1.4 1.4 0 0 1-1.4 1.4h-2.8a1.4 1.4 0 0 1-1.4-1.4v-1.3Z" />
    <path d="M9.7 17.5h4.6" />
  </Base>
);

export const Horloge = (p) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5v5l3 1.8" />
  </Base>
);

export const Etablissement = (p) => (
  <Base {...p}>
    <path d="M3 20.5h18" />
    <path d="M5 20.5V9.5l7-4.5 7 4.5v11" />
    <path d="M10 20.5v-5h4v5" />
    <path d="M8.5 11.5h1.5M14 11.5h1.5" />
  </Base>
);

export const Mail = (p) => (
  <Base {...p}>
    <rect width="20" height="16" x="2" y="4" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </Base>
);

/* Regroupement pour un import unique : `import Icone from ".../Icons.jsx"` */
const Icone = {
  Mail,
  TableauBord,
  Etudiants,
  Enseignants,
  Classes,
  Matieres,
  Notes,
  Presence,
  Prediction,
  Alerte,
  Comptes,
  Rapports,
  Reclamations,
  Parametres,
  Journal,
  Recherche,
  Filtre,
  Ajouter,
  Plus: Ajouter,
  Modifier,
  Supprimer,
  Telecharger,
  Actualiser,
  Fermer,
  Menu,
  Deconnexion,
  ChevronBas,
  ChevronHaut,
  ChevronGauche,
  ChevronDroite,
  FlecheHaut,
  FlecheBas,
  TriHautBas,
  Valide,
  Validation,
  Info,
  Attention,
  Boussole,
  Cible,
  Ampoule,
  Horloge,
  Etablissement,
};

export default Icone;
