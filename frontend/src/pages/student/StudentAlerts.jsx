/**
 * Alertes de l'etudiant.
 *
 * Historique des alertes precoces declenchees par le systeme de prediction :
 * risque d'echec (modele de ML), notes faibles, absences repetees. Chaque
 * alerte est accompagnee des recommandations pertinentes pour ce facteur
 * precis, filtrees a partir du meme moteur que la fiche de prediction
 * (§app/ml/recommendations.py) mais restreintes a ce que l'etudiant peut
 * lui-meme mettre en oeuvre.
 *
 * Consomme GET /api/student/alertes.
 */
import { useEffect, useState } from "react";

import CoqueApplication from "../../components/AppShell.jsx";
import { navigationEtudiant } from "../../components/navigation.js";
import Icone from "../../components/ui/Icons.jsx";
import { useNotifications } from "../../components/ui/Feedback.jsx";
import { Badge, BadgeRisque, Bouton, Carte, EtatVide, Squelette } from "../../components/ui/Primitives.jsx";
import client from "../../api/client.js";

const ICONES_TYPE = {
  risque_echec: Icone.Prediction,
  notes_faibles: Icone.Notes,
  absences_repetees: Icone.Presence,
};

const LIBELLES_STATUT_TRAITEMENT = {
  nouvelle: null, // rien a ajouter : c'est l'etat par defaut, deja porte par le badge "Non lue"
  en_cours: "Prise en charge en cours",
  traitee: "Cloturee",
};

const PRIORITES = {
  1: { libelle: "Urgent", ton: "alerte" },
  2: { libelle: "Important", ton: "vigilance" },
  3: { libelle: "Preventif", ton: "info" },
};

export default function AlertesEtudiant() {
  const [alertes, setAlertes] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [ouvertes, setOuvertes] = useState(() => new Set());
  const [traitementEnCours, setTraitementEnCours] = useState(false);
  const notifications = useNotifications();

  useEffect(() => {
    client
      .get("/student/alertes")
      .then(({ data }) => {
        setAlertes(data);
        setErreur("");
      })
      .catch(() => setErreur("Impossible de charger vos alertes."))
      .finally(() => setChargement(false));
  }, []);

  const nombreNonLues = alertes.filter((a) => !a.vue_par_etudiant).length;

  async function marquerLue(id) {
    setAlertes((precedent) =>
      precedent.map((a) => (a.id === id ? { ...a, vue_par_etudiant: true } : a))
    );
    try {
      await client.post(`/student/alertes/${id}/marquer-lue`);
    } catch {
      /* echec silencieux : la pastille se remettra a jour au prochain chargement */
    }
  }

  function basculerOuverture(alerte) {
    setOuvertes((precedent) => {
      const suivant = new Set(precedent);
      if (suivant.has(alerte.id)) {
        suivant.delete(alerte.id);
      } else {
        suivant.add(alerte.id);
        if (!alerte.vue_par_etudiant) marquerLue(alerte.id);
      }
      return suivant;
    });
  }

  async function marquerToutLu() {
    setTraitementEnCours(true);
    try {
      await client.post("/student/alertes/tout-marquer-lu");
      setAlertes((precedent) => precedent.map((a) => ({ ...a, vue_par_etudiant: true })));
      notifications.succes("Toutes les alertes sont marquees comme lues.");
    } catch {
      notifications.erreur("Impossible de marquer les alertes comme lues.");
    } finally {
      setTraitementEnCours(false);
    }
  }

  return (
    <CoqueApplication
      titre="Alertes"
      sousTitre="Historique de vos alertes de risque academique"
      sectionsNavigation={navigationEtudiant()}
      actions={
        nombreNonLues > 0 && (
          <Bouton
            variante="secondaire"
            taille="sm"
            icone={Icone.Valide}
            onClick={marquerToutLu}
            chargement={traitementEnCours}
          >
            <span className="hidden sm:inline">Tout marquer comme lu</span>
          </Bouton>
        )
      }
    >
      {erreur && (
        <Carte className="mb-5">
          <p className="text-brique-600">{erreur}</p>
        </Carte>
      )}

      {chargement ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Squelette key={index} className="h-24 rounded-card" />
          ))}
        </div>
      ) : alertes.length === 0 ? (
        <Carte>
          <EtatVide
            icone={Icone.Valide}
            titre="Aucune alerte"
            message="Aucun facteur de risque n'est actuellement detecte sur votre dossier. Continuez ainsi !"
          />
        </Carte>
      ) : (
        <div className="space-y-3">
          {alertes.map((alerte) => (
            <CarteAlerte
              key={alerte.id}
              alerte={alerte}
              ouverte={ouvertes.has(alerte.id)}
              onBasculer={() => basculerOuverture(alerte)}
            />
          ))}
        </div>
      )}
    </CoqueApplication>
  );
}

function CarteAlerte({ alerte, ouverte, onBasculer }) {
  const IconeType = ICONES_TYPE[alerte.type_alerte] ?? Icone.Alerte;
  const libelleStatut = LIBELLES_STATUT_TRAITEMENT[alerte.statut_traitement];
  const date = alerte.date_declenchement ? new Date(alerte.date_declenchement) : null;

  return (
    <Carte className="overflow-hidden" classeCorps="p-0">
      <button
        type="button"
        onClick={onBasculer}
        className="anneau-focus flex w-full items-start gap-3 px-5 py-4 text-left transition-colors hover:bg-ardoise-50"
      >
        <span
          className={`mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-lg ${
            alerte.niveau_risque === "eleve"
              ? "bg-brique-50 text-brique-600"
              : "bg-ambre-50 text-ambre-600"
          }`}
        >
          <IconeType className="h-5 w-5" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-sm font-semibold text-encre-900">
              {alerte.libelle_type}
            </h3>
            {!alerte.vue_par_etudiant && (
              <Badge ton="alerte" pastille>
                Non lue
              </Badge>
            )}
            <BadgeRisque niveau={alerte.niveau_risque} />
            {libelleStatut && <Badge ton="neutre">{libelleStatut}</Badge>}
          </div>
          <p className="mt-1 text-xs text-ardoise-500">
            {date
              ? date.toLocaleString("fr-FR", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "Date inconnue"}
          </p>
        </div>

        <Icone.ChevronBas
          className={`mt-1 h-4 w-4 shrink-0 text-ardoise-400 transition-transform duration-200 ${
            ouverte ? "rotate-180" : ""
          }`}
        />
      </button>

      {ouverte && (
        <div className="border-t border-ardoise-200/70 bg-ardoise-50/40 px-5 py-4">
          {alerte.recommandations.length === 0 ? (
            <p className="text-sm text-ardoise-500">
              Aucune recommandation specifique pour le moment.
            </p>
          ) : (
            <ul className="space-y-3">
              {alerte.recommandations.map((recommandation, index) => {
                const priorite = PRIORITES[recommandation.priorite] ?? PRIORITES[3];
                return (
                  <li key={index} className="rounded-lg border border-ardoise-200 bg-white p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge ton={priorite.ton}>{priorite.libelle}</Badge>
                      <p className="text-sm font-semibold text-encre-900">
                        {recommandation.titre}
                      </p>
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed text-ardoise-600">
                      {recommandation.description}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </Carte>
  );
}
