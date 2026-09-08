/**
 * Composants primitifs du systeme de design.
 *
 * Regle appliquee partout : aucune couleur ni aucun espacement ecrit en dur
 * dans les ecrans metier. Tout passe par ces composants, ce qui garantit
 * qu'un changement de charte se fait a un seul endroit.
 */
import Icone from "./Icons.jsx";

/* ==========================================================================
   BOUTON
   ========================================================================== */

const VARIANTES_BOUTON = {
  primaire:
    "bg-encre-800 text-white shadow-subtile hover:bg-encre-700 active:bg-encre-900 disabled:bg-ardoise-300",
  secondaire:
    "border border-ardoise-300 bg-white text-encre-800 shadow-subtile hover:border-ardoise-400 hover:bg-ardoise-50 active:bg-ardoise-100",
  discret: "text-encre-700 hover:bg-ardoise-200/60 active:bg-ardoise-200",
  danger:
    "bg-brique-600 text-white shadow-subtile hover:bg-brique-700 active:bg-brique-800 disabled:bg-ardoise-300",
  succes:
    "bg-sauge-500 text-white shadow-subtile hover:bg-sauge-600 active:bg-sauge-700 disabled:bg-ardoise-300",
  contour:
    "border border-encre-800 text-encre-800 hover:bg-encre-800 hover:text-white active:bg-encre-900",
};

const TAILLES_BOUTON = {
  sm: "h-8 gap-1.5 px-3 text-xs",
  md: "h-10 gap-2 px-4 text-sm",
  lg: "h-12 gap-2.5 px-6 text-base",
  icone: "h-10 w-10 justify-center",
  "icone-sm": "h-8 w-8 justify-center",
};

export function Bouton({
  variante = "primaire",
  taille = "md",
  chargement = false,
  icone: IconeGauche,
  iconeDroite: IconeDroite,
  className = "",
  children,
  disabled,
  ...reste
}) {
  return (
    <button
      disabled={disabled || chargement}
      className={`anneau-focus inline-flex items-center justify-center rounded-lg font-medium
        transition-all duration-150 ease-douce
        disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none
        ${VARIANTES_BOUTON[variante]} ${TAILLES_BOUTON[taille]} ${className}`}
      {...reste}
    >
      {chargement ? (
        <Rouet className="h-4 w-4" />
      ) : (
        IconeGauche && <IconeGauche className="h-4 w-4 shrink-0" />
      )}
      {children}
      {IconeDroite && !chargement && <IconeDroite className="h-4 w-4 shrink-0" />}
    </button>
  );
}

export function Rouet({ className = "h-5 w-5" }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.22" />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}


/* ==========================================================================
   CARTE
   ========================================================================== */

export function Carte({
  titre,
  sousTitre,
  actions,
  icone: IconeEntete,
  className = "",
  classeCorps = "",
  interactive = false,
  children,
  ...reste
}) {
  const aEntete = titre || actions || sousTitre;

  return (
    <section
      className={`relative overflow-hidden ${interactive ? "carte-interactive" : "carte"} ${className}`}
      {...reste}
    >
      {aEntete && (
        <header className="relative z-10 flex items-start justify-between gap-4 border-b border-white/50 px-5 py-4">
          <div className="flex min-w-0 items-start gap-3">
            {IconeEntete && (
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/70 text-encre-800 shadow-sm border border-white/80">
                <IconeEntete className="h-4 w-4" />
              </span>
            )}
            <div className="min-w-0">
              {titre && (
                <h3 className="truncate font-display text-base font-semibold text-encre-900">
                  {titre}
                </h3>
              )}
              {sousTitre && (
                <p className="mt-0.5 text-xs font-medium text-encre-700/75">{sousTitre}</p>
              )}
            </div>
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={`relative z-10 p-5 ${classeCorps}`}>{children}</div>
    </section>
  );
}

/* ==========================================================================
   CARTE STATISTIQUE (LIQUID GLASS STYLE)
   ========================================================================== */

const TONS_STAT = {
  neutre: { fond: "bg-white/80", texte: "text-encre-800", valeur: "text-encre-900" },
  succes: { fond: "bg-sauge-500/15", texte: "text-sauge-700", valeur: "text-sauge-700" },
  vigilance: { fond: "bg-ambre-500/15", texte: "text-ambre-700", valeur: "text-ambre-700" },
  alerte: { fond: "bg-brique-500/15", texte: "text-brique-700", valeur: "text-brique-700" },
  info: { fond: "bg-indigo-500/15", texte: "text-indigo-700", valeur: "text-indigo-800" },
};

export function CarteStat({
  libelle,
  valeur,
  unite,
  variation,
  legende,
  icone: IconeStat,
  ton = "neutre",
  variante = "claire",
  chargement = false,
  onClick,
}) {
  const styles = TONS_STAT[ton] ?? TONS_STAT.neutre;
  const Conteneur = onClick ? "button" : "div";

  return (
    <Conteneur
      onClick={onClick}
      className={`group relative overflow-hidden w-full p-5 text-left transition-all duration-300 ease-douce carte-glace
        ${onClick ? "anneau-focus cursor-pointer hover:-translate-y-1 hover:shadow-elevee" : "hover:-translate-y-0.5"}`}
    >

      <div className="relative z-10 flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-encre-800/80">
          {libelle}
        </p>
        {IconeStat && (
          <span
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl transition-all duration-300 ease-douce
              group-hover:scale-110 shadow-sm border border-white/70 ${styles.fond} ${styles.texte}`}
          >
            <IconeStat className="h-[18px] w-[18px]" />
          </span>
        )}
      </div>

      {chargement ? (
        <div className="mt-3 h-9 w-24 rounded-md squelette" />
      ) : (
        <div className="relative z-10 mt-2 flex items-baseline gap-1.5">
          <span className={`tabulaire font-display text-3xl font-bold ${styles.valeur}`}>
            {valeur}
          </span>
          {unite && (
            <span className="text-sm font-semibold text-encre-700/70">
              {unite}
            </span>
          )}
        </div>
      )}

      {(variation != null || legende) && !chargement && (
        <div className="relative z-10 mt-2 flex items-center gap-2">
          {variation != null && <IndicateurVariation valeur={variation} />}
          {legende && (
            <span className="truncate text-xs font-medium text-encre-700/75">
              {legende}
            </span>
          )}
        </div>
      )}
    </Conteneur>
  );
}

/** Variation chiffree avec fleche. `inverse` sert aux indicateurs ou une
 *  hausse est une mauvaise nouvelle (nombre d'etudiants a risque). */
export function IndicateurVariation({ valeur, inverse = false }) {
  if (valeur == null || valeur === 0) {
    return <span className="text-xs font-medium text-ardoise-400">stable</span>;
  }

  const monte = valeur > 0;
  const favorable = inverse ? !monte : monte;
  const Fleche = monte ? Icone.FlecheHaut : Icone.FlecheBas;

  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-semibold
        ${favorable ? "bg-sauge-50 text-sauge-600" : "bg-brique-50 text-brique-600"}`}
    >
      <Fleche className="h-3 w-3" />
      {Math.abs(valeur)}%
    </span>
  );
}

/* ==========================================================================
   BADGES
   ========================================================================== */

const TONS_BADGE = {
  neutre: "bg-ardoise-100 text-ardoise-700 ring-ardoise-200",
  succes: "bg-sauge-50 text-sauge-700 ring-sauge-200",
  vigilance: "bg-ambre-50 text-ambre-700 ring-ambre-200",
  alerte: "bg-brique-50 text-brique-700 ring-brique-200",
  info: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  encre: "bg-encre-50 text-encre-700 ring-encre-200",
};

export function Badge({ ton = "neutre", pastille = false, className = "", children }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1
        text-xs font-medium ring-1 ring-inset ${TONS_BADGE[ton]} ${className}`}
    >
      {pastille && <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />}
      {children}
    </span>
  );
}

const NIVEAUX_RISQUE = {
  faible: { ton: "succes", libelle: "Risque faible" },
  moyen: { ton: "vigilance", libelle: "Risque modere" },
  eleve: { ton: "alerte", libelle: "Risque eleve" },
  inconnu: { ton: "neutre", libelle: "Non evalue" },
};

export function BadgeRisque({ niveau, className = "" }) {
  const config = NIVEAUX_RISQUE[niveau] ?? NIVEAUX_RISQUE.inconnu;
  return (
    <Badge ton={config.ton} pastille className={className}>
      {config.libelle}
    </Badge>
  );
}

export function BadgeStatutCompte({ statut }) {
  return (
    <Badge ton={statut === "actif" ? "succes" : "alerte"} pastille>
      {statut === "actif" ? "Actif" : "Desactive"}
    </Badge>
  );
}

const NIVEAUX_CONFIANCE = {
  elevee: { ton: "succes", libelle: "Confiance elevee" },
  moyenne: { ton: "vigilance", libelle: "Confiance moyenne" },
  faible: { ton: "alerte", libelle: "Confiance faible" },
};

export function BadgeConfiance({ niveau, indice }) {
  const config = NIVEAUX_CONFIANCE[niveau] ?? NIVEAUX_CONFIANCE.moyenne;
  return (
    <Badge ton={config.ton}>
      {config.libelle}
      {indice != null && <span className="tabulaire opacity-70">{indice}%</span>}
    </Badge>
  );
}

/* ==========================================================================
   ANNEAU DE PROGRESSION
   ========================================================================== */

/**
 * Jauge circulaire animee. Utilisee pour le score de reussite : plus lisible
 * qu'une barre horizontale quand la valeur est l'information centrale de
 * l'ecran.
 */
export function AnneauProgression({
  valeur = 0,
  taille = 132,
  epaisseur = 10,
  ton = "neutre",
  libelle,
  sousLibelle,
}) {
  const rayon = (taille - epaisseur) / 2;
  const circonference = 2 * Math.PI * rayon;
  const borne = Math.max(0, Math.min(100, valeur));
  const remplissage = circonference - (borne / 100) * circonference;

  const couleurs = {
    neutre: "text-encre-600",
    succes: "text-sauge-500",
    vigilance: "text-ambre-500",
    alerte: "text-brique-600",
  };

  return (
    <div
      className="relative inline-grid place-items-center"
      style={{ width: taille, height: taille }}
    >
      <svg width={taille} height={taille} className="-rotate-90" aria-hidden="true">
        <circle
          cx={taille / 2}
          cy={taille / 2}
          r={rayon}
          fill="none"
          strokeWidth={epaisseur}
          className="stroke-ardoise-200"
        />
        <circle
          cx={taille / 2}
          cy={taille / 2}
          r={rayon}
          fill="none"
          strokeWidth={epaisseur}
          strokeLinecap="round"
          strokeDasharray={circonference}
          strokeDashoffset={remplissage}
          className={`${couleurs[ton]} transition-[stroke-dashoffset] duration-1000 ease-douce`}
          style={{ stroke: "currentColor" }}
        />
      </svg>

      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className={`tabulaire font-display text-3xl font-semibold ${couleurs[ton]}`}>
            {Math.round(borne)}
            <span className="text-lg">%</span>
          </div>
          {libelle && (
            <div className="mt-0.5 text-2xs font-medium uppercase tracking-wide text-ardoise-500">
              {libelle}
            </div>
          )}
          {sousLibelle && <div className="text-2xs text-ardoise-400">{sousLibelle}</div>}
        </div>
      </div>
    </div>
  );
}

/* ==========================================================================
   BARRE DE PROGRESSION
   ========================================================================== */

export function BarreProgression({ valeur = 0, ton, libelle, afficherValeur = true }) {
  const borne = Math.max(0, Math.min(100, valeur));

  // Ton deduit du seuil pedagogique si non impose : sous 60 % l'assiduite
  // met en peril la validation, entre 60 et 75 % elle appelle une vigilance.
  const tonEffectif = ton ?? (borne >= 75 ? "succes" : borne >= 60 ? "vigilance" : "alerte");
  const fonds = {
    neutre: "bg-encre-600",
    succes: "bg-sauge-500",
    vigilance: "bg-ambre-500",
    alerte: "bg-brique-600",
  };

  return (
    <div>
      {(libelle || afficherValeur) && (
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          {libelle && <span className="text-xs font-medium text-ardoise-600">{libelle}</span>}
          {afficherValeur && (
            <span className="tabulaire text-xs font-semibold text-encre-800">
              {borne.toFixed(1)}%
            </span>
          )}
        </div>
      )}
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-ardoise-200"
        role="progressbar"
        aria-valuenow={Math.round(borne)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={libelle}
      >
        <div
          className={`h-full rounded-full transition-[width] duration-700 ease-douce ${fonds[tonEffectif]}`}
          style={{ width: `${borne}%` }}
        />
      </div>
    </div>
  );
}

/* ==========================================================================
   ETATS DE CHARGEMENT ET ETATS VIDES
   ========================================================================== */

export function Squelette({ className = "h-4 w-full" }) {
  return <div className={`squelette rounded-md ${className}`} />;
}

export function SqueletteCarte() {
  return (
    <div className="carte p-5">
      <Squelette className="h-3 w-24" />
      <Squelette className="mt-3 h-8 w-20" />
      <Squelette className="mt-3 h-3 w-32" />
    </div>
  );
}

export function SqueletteTableau({ lignes = 5, colonnes = 5 }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: lignes }).map((_, indexLigne) => (
        <div key={indexLigne} className="flex gap-4">
          {Array.from({ length: colonnes }).map((_, indexColonne) => (
            <Squelette
              key={indexColonne}
              className={`h-9 ${indexColonne === 0 ? "w-1/4" : "flex-1"}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function EtatVide({
  icone: IconeVide = Icone.Info,
  titre = "Aucune donnee",
  message,
  action,
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-full bg-ardoise-100 text-ardoise-400">
        <IconeVide className="h-6 w-6" />
      </span>
      <h4 className="mt-4 font-display text-base font-semibold text-encre-800">{titre}</h4>
      {message && <p className="mt-1.5 max-w-sm text-sm text-ardoise-500">{message}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* ==========================================================================
   DIVERS
   ========================================================================== */

export function TitrePage({ titre, sousTitre, actions, filAriane }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {filAriane && (
          <nav className="mb-1.5 flex items-center gap-1.5 text-xs text-ardoise-500">
            {filAriane}
          </nav>
        )}
        <h1 className="font-display text-2xl font-semibold text-encre-900">{titre}</h1>
        {sousTitre && <p className="mt-1 text-sm text-ardoise-500">{sousTitre}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function ChampRecherche({
  valeur,
  onChange,
  placeholder = "Rechercher...",
  className = "",
}) {
  return (
    <div className={`relative ${className}`}>
      <Icone.Recherche className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ardoise-400" />
      <input
        type="search"
        value={valeur}
        onChange={(evenement) => onChange(evenement.target.value)}
        placeholder={placeholder}
        className="anneau-focus h-10 w-full rounded-lg border border-ardoise-300 bg-white pl-9 pr-3
          text-sm text-encre-900 placeholder:text-ardoise-400
          transition-colors hover:border-ardoise-400"
      />
    </div>
  );
}

export function Selecteur({ valeur, onChange, options, libelle, disabled = false, className = "" }) {
  return (
    <div className={className}>
      {libelle && (
        <label className="mb-1.5 block text-xs font-medium text-ardoise-600">{libelle}</label>
      )}
      <div className="relative">
        <select
          value={valeur}
          onChange={(evenement) => onChange(evenement.target.value)}
          disabled={disabled}
          className="anneau-focus h-10 w-full appearance-none rounded-lg border border-ardoise-300
            bg-white pl-3 pr-9 text-sm text-encre-900 transition-colors hover:border-ardoise-400
            disabled:cursor-not-allowed disabled:opacity-60"
        >
          {options.map((option) => (
            <option key={option.valeur} value={option.valeur}>
              {option.libelle}
            </option>
          ))}
        </select>
        <Icone.ChevronBas className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ardoise-400" />
      </div>
    </div>
  );
}

/** Deux valeurs affichees en vis-a-vis, pour les fiches de detail. */
export function LigneInfo({ libelle, valeur, className = "" }) {
  return (
    <div className={`flex items-baseline justify-between gap-4 py-2.5 ${className}`}>
      <dt className="shrink-0 text-sm text-ardoise-500">{libelle}</dt>
      <dd className="min-w-0 truncate text-right text-sm font-medium text-encre-900">
        {valeur ?? "—"}
      </dd>
    </div>
  );
}
