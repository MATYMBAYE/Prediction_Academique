/**
 * Retours utilisateur : modales, notifications ephemeres, confirmations.
 *
 * Remplace les `alert()` et `confirm()` natifs utilises jusqu'ici, qui
 * bloquent le fil d'execution du navigateur, ne se stylisent pas et ne
 * permettent aucune nuance entre un succes et une erreur.
 */
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Icone from "./Icons.jsx";
import { Bouton } from "./Primitives.jsx";

/* ==========================================================================
   MODALE
   ========================================================================== */

const TAILLES_MODALE = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

export function Modale({
  ouverte,
  onFermer,
  titre,
  sousTitre,
  taille = "md",
  piedDePage,
  children,
  fermetureExterieure = true,
}) {
  const referencePanneau = useRef(null);
  const onFermerRef = useRef(onFermer);

  useEffect(() => {
    onFermerRef.current = onFermer;
  }, [onFermer]);

  // Fermeture au clavier + blocage du defilement de la page en arriere-plan.
  useEffect(() => {
    if (!ouverte) return undefined;

    function surTouche(evenement) {
      if (evenement.key === "Escape") onFermerRef.current?.();
    }

    const debordementInitial = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", surTouche);

    // Le focus est place sur le panneau a l'ouverture si le focus n'est pas deja a l'interieur
    if (
      referencePanneau.current &&
      !referencePanneau.current.contains(document.activeElement)
    ) {
      referencePanneau.current.focus();
    }

    return () => {
      document.body.style.overflow = debordementInitial;
      document.removeEventListener("keydown", surTouche);
    };
  }, [ouverte]);

  if (!ouverte) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div
        className="absolute inset-0 animate-fondu-simple bg-encre-950/45 backdrop-blur-[2px]"
        onClick={fermetureExterieure ? onFermer : undefined}
        aria-hidden="true"
      />

      <div
        ref={referencePanneau}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={titre}
        className={`relative w-full animate-apparition-modale rounded-t-panel bg-white shadow-modale
          outline-none sm:rounded-panel ${TAILLES_MODALE[taille]}`}
      >
        {(titre || onFermer) && (
          <header className="flex items-start justify-between gap-4 border-b border-ardoise-200 px-6 py-4">
            <div className="min-w-0">
              {titre && (
                <h2 className="font-display text-lg font-semibold text-encre-900">{titre}</h2>
              )}
              {sousTitre && <p className="mt-1 text-sm text-ardoise-500">{sousTitre}</p>}
            </div>
            <button
              onClick={onFermer}
              aria-label="Fermer"
              className="anneau-focus -mr-2 -mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-lg
                text-ardoise-400 transition-colors hover:bg-ardoise-100 hover:text-encre-800"
            >
              <Icone.Fermer className="h-4 w-4" />
            </button>
          </header>
        )}

        <div className="defilement-fin max-h-[65vh] overflow-y-auto px-6 py-5">{children}</div>

        {piedDePage && (
          <footer className="flex items-center justify-end gap-2 border-t border-ardoise-200 bg-ardoise-50/60 px-6 py-4">
            {piedDePage}
          </footer>
        )}
      </div>
    </div>,
    document.body
  );
}

/* ==========================================================================
   CONFIRMATION
   ========================================================================== */

export function ModaleConfirmation({
  ouverte,
  onFermer,
  onConfirmer,
  titre = "Confirmer l'action",
  message,
  libelleConfirmer = "Confirmer",
  libelleAnnuler = "Annuler",
  danger = false,
  chargement = false,
}) {
  return (
    <Modale
      ouverte={ouverte}
      onFermer={onFermer}
      taille="sm"
      titre={titre}
      piedDePage={
        <>
          <Bouton variante="secondaire" onClick={onFermer} disabled={chargement}>
            {libelleAnnuler}
          </Bouton>
          <Bouton
            variante={danger ? "danger" : "primaire"}
            onClick={onConfirmer}
            chargement={chargement}
          >
            {libelleConfirmer}
          </Bouton>
        </>
      }
    >
      <div className="flex gap-4">
        <span
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-full
            ${danger ? "bg-brique-50 text-brique-600" : "bg-ambre-50 text-ambre-600"}`}
        >
          <Icone.Attention className="h-5 w-5" />
        </span>
        <p className="pt-1.5 text-sm leading-relaxed text-ardoise-700">{message}</p>
      </div>
    </Modale>
  );
}

/* ==========================================================================
   NOTIFICATIONS EPHEMERES
   ========================================================================== */

const ContexteNotifications = createContext(null);

const STYLES_NOTIFICATION = {
  succes: {
    icone: Icone.Valide,
    bordure: "border-l-sauge-500",
    fondIcone: "bg-sauge-50 text-sauge-600",
  },
  erreur: {
    icone: Icone.Attention,
    bordure: "border-l-brique-600",
    fondIcone: "bg-brique-50 text-brique-600",
  },
  info: {
    icone: Icone.Info,
    bordure: "border-l-indigo-600",
    fondIcone: "bg-indigo-50 text-indigo-600",
  },
  vigilance: {
    icone: Icone.Alerte,
    bordure: "border-l-ambre-500",
    fondIcone: "bg-ambre-50 text-ambre-600",
  },
};

export function FournisseurNotifications({ children }) {
  const [notifications, setNotifications] = useState([]);
  const compteur = useRef(0);

  const retirer = useCallback((identifiant) => {
    setNotifications((precedentes) =>
      precedentes.filter((notification) => notification.id !== identifiant)
    );
  }, []);

  const notifier = useCallback(
    (message, type = "info", duree = 4500) => {
      const identifiant = ++compteur.current;
      setNotifications((precedentes) => [
        ...precedentes,
        { id: identifiant, message, type },
      ]);
      if (duree > 0) setTimeout(() => retirer(identifiant), duree);
      return identifiant;
    },
    [retirer]
  );

  // Raccourcis pour les cas les plus frequents.
  const valeur = {
    notifier,
    succes: useCallback((message, duree) => notifier(message, "succes", duree), [notifier]),
    erreur: useCallback((message, duree) => notifier(message, "erreur", duree ?? 7000), [notifier]),
    info: useCallback((message, duree) => notifier(message, "info", duree), [notifier]),
    vigilance: useCallback((message, duree) => notifier(message, "vigilance", duree), [notifier]),
    retirer,
  };

  return (
    <ContexteNotifications.Provider value={valeur}>
      {children}

      {createPortal(
        <div
          className="sans-impression pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(94vw,380px)] flex-col gap-2.5"
          role="status"
          aria-live="polite"
        >
          {notifications.map((notification) => {
            const styles = STYLES_NOTIFICATION[notification.type] ?? STYLES_NOTIFICATION.info;
            const IconeNotification = styles.icone;

            return (
              <div
                key={notification.id}
                className={`pointer-events-auto flex animate-glissement-droite items-start gap-3
                  rounded-lg border border-ardoise-200 border-l-4 bg-white p-3.5 shadow-elevee
                  ${styles.bordure}`}
              >
                <span
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${styles.fondIcone}`}
                >
                  <IconeNotification className="h-4 w-4" />
                </span>

                <p className="flex-1 pt-1 text-sm leading-snug text-encre-800">
                  {notification.message}
                </p>

                <button
                  onClick={() => retirer(notification.id)}
                  aria-label="Fermer la notification"
                  className="anneau-focus -mr-1 -mt-0.5 grid h-7 w-7 shrink-0 place-items-center
                    rounded-md text-ardoise-400 transition-colors hover:bg-ardoise-100"
                >
                  <Icone.Fermer className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>,
        document.body
      )}
    </ContexteNotifications.Provider>
  );
}

export function useNotifications() {
  const contexte = useContext(ContexteNotifications);
  if (!contexte) {
    throw new Error(
      "useNotifications doit etre utilise a l'interieur d'un <FournisseurNotifications>"
    );
  }
  return contexte;
}

/* ==========================================================================
   BANDEAU D'ALERTE
   ========================================================================== */

const STYLES_BANDEAU = {
  info: "border-indigo-200 bg-indigo-50 text-indigo-800",
  succes: "border-sauge-200 bg-sauge-50 text-sauge-800",
  vigilance: "border-ambre-200 bg-ambre-50 text-ambre-800",
  alerte: "border-brique-200 bg-brique-50 text-brique-800",
};

const ICONES_BANDEAU = {
  info: Icone.Info,
  succes: Icone.Valide,
  vigilance: Icone.Alerte,
  alerte: Icone.Attention,
};

export function Bandeau({ ton = "info", titre, children, action, onFermer }) {
  const IconeBandeau = ICONES_BANDEAU[ton];

  return (
    <div
      className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${STYLES_BANDEAU[ton]}`}
      role={ton === "alerte" ? "alert" : "status"}
    >
      <IconeBandeau className="mt-0.5 h-[18px] w-[18px] shrink-0" />

      <div className="min-w-0 flex-1">
        {titre && <p className="text-sm font-semibold">{titre}</p>}
        {children && (
          <div className={`text-sm leading-relaxed ${titre ? "mt-0.5 opacity-90" : ""}`}>
            {children}
          </div>
        )}
      </div>

      {action && <div className="shrink-0">{action}</div>}

      {onFermer && (
        <button
          onClick={onFermer}
          aria-label="Fermer"
          className="anneau-focus -mr-1 -mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md
            opacity-60 transition-opacity hover:opacity-100"
        >
          <Icone.Fermer className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
