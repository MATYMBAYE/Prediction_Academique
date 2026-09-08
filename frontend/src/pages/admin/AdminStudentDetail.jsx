/**
 * Fiche etudiant detaillee.
 *
 * Ecran de reference pour l'accompagnement individuel : l'administrateur ou
 * l'enseignant y trouve l'etat civil, la prediction expliquee, le plan
 * d'accompagnement propose et l'historique complet.
 *
 * Le meme composant sert les deux roles ; la propriete `role` ajuste la
 * navigation laterale et masque les actions reservees a l'administration.
 *
 * Consomme GET /api/predictions/students/<id>/detail.
 */
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import CoqueApplication from "../../components/AppShell.jsx";
import { navigationAdmin, navigationEnseignant } from "../../components/navigation.js";
import PanneauPrediction from "../../components/PredictionPanel.jsx";
import Icone from "../../components/ui/Icons.jsx";
import { Bandeau, Modale, useNotifications } from "../../components/ui/Feedback.jsx";
import {
  Badge,
  Bouton,
  Carte,
  EtatVide,
  LigneInfo,
  Squelette,
} from "../../components/ui/Primitives.jsx";
import client from "../../api/client.js";

export default function FicheEtudiant({ role = "admin" }) {
  const { id } = useParams();
  const naviguer = useNavigate();
  const notifications = useNotifications();

  const [donnees, setDonnees] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [messageErreur, setMessageErreur] = useState("");
  const [recalculEnCours, setRecalculEnCours] = useState(false);
  const [modaleDesactivationOuverte, setModaleDesactivationOuverte] = useState(false);
  const [motifDesactivation, setMotifDesactivation] = useState("");
  const [changementStatutEnCours, setChangementStatutEnCours] = useState(false);

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      const { data } = await client.get(`/predictions/students/${id}/detail`);
      setDonnees(data);
      setMessageErreur("");
    } catch (exception) {
      const reponse = exception.response;
      if (reponse?.status === 422) {
        // Cas normal, pas une erreur technique : l'etudiant existe mais son
        // dossier est vide. On charge quand meme son etat civil.
        setMessageErreur(reponse.data?.message ?? "Donnees insuffisantes.");
        try {
          const { data } = await client.get(`/admin/students/${id}`);
          setDonnees({ etudiant: data });
        } catch {
          /* l'etat civil reste indisponible : l'ecran affiche l'etat vide */
        }
      } else if (reponse?.status === 404) {
        setMessageErreur("Cet etudiant est introuvable.");
      } else {
        setMessageErreur("Impossible de charger la fiche de cet etudiant.");
      }
    } finally {
      setChargement(false);
    }
  }, [id]);

  useEffect(() => {
    charger();
  }, [charger]);

  async function recalculer() {
    setRecalculEnCours(true);
    try {
      await client.post(`/admin/predictions/students/${id}/recalculer`);
      notifications.succes("Prediction recalculee.");
      await charger();
    } catch (exception) {
      notifications.erreur(
        exception.response?.data?.error ?? "Le recalcul a echoue."
      );
    } finally {
      setRecalculEnCours(false);
    }
  }

  async function basculerStatutCompte(motif) {
    setChangementStatutEnCours(true);
    try {
      const nouveauStatut = donnees.etudiant.statut_compte === "actif" ? "inactif" : "actif";
      await client.post(`/admin/accounts/${donnees.etudiant.user_id}/toggle-status`, {
        statut: nouveauStatut,
        motif,
      });
      notifications.succes(
        nouveauStatut === "actif" ? "Compte reactive." : "Compte desactive."
      );
      setModaleDesactivationOuverte(false);
      setMotifDesactivation("");
      await charger();
    } catch (exception) {
      notifications.erreur(
        exception.response?.data?.error ?? "Impossible de modifier le statut du compte."
      );
    } finally {
      setChangementStatutEnCours(false);
    }
  }

  const etudiant = donnees?.etudiant;
  const aPrediction = Boolean(donnees?.score_reussite != null);

  const sectionsNavigation =
    role === "admin" ? navigationAdmin() : navigationEnseignant();
  const racine = role === "admin" ? "/admin" : "/enseignant";

  return (
    <CoqueApplication
      titre={
        etudiant ? `${etudiant.prenom} ${etudiant.nom}` : "Fiche etudiant"
      }
      sousTitre={etudiant?.matricule}
      sectionsNavigation={sectionsNavigation}
      actions={
        <>
          <Bouton
            variante="secondaire"
            taille="sm"
            icone={Icone.ChevronGauche}
            onClick={() => naviguer(-1)}
          >
            <span className="hidden sm:inline">Retour</span>
          </Bouton>
          <Bouton
            variante="primaire"
            taille="sm"
            icone={Icone.Actualiser}
            onClick={recalculer}
            chargement={recalculEnCours}
          >
            <span className="hidden sm:inline">Recalculer</span>
          </Bouton>
        </>
      }
    >
      {/* Fil d'ariane */}
      <nav className="mb-5 flex items-center gap-1.5 text-xs text-ardoise-500">
        <Link
          to={`${racine}${role === "admin" ? "/etudiants" : ""}`}
          className="anneau-focus rounded transition-colors hover:text-encre-800"
        >
          {role === "admin" ? "Etudiants" : "Tableau de bord"}
        </Link>
        <Icone.ChevronDroite className="h-3 w-3" />
        <span className="text-encre-800">
          {etudiant ? `${etudiant.prenom} ${etudiant.nom}` : "Fiche"}
        </span>
      </nav>

      {chargement ? (
        <div className="space-y-5">
          <Squelette className="h-40 rounded-card" />
          <Squelette className="h-72 rounded-card" />
        </div>
      ) : !etudiant ? (
        <Carte>
          <EtatVide
            icone={Icone.Etudiants}
            titre="Fiche indisponible"
            message={messageErreur || "Cet etudiant est introuvable."}
            action={
              <Bouton variante="secondaire" onClick={() => naviguer(-1)}>
                Retour
              </Bouton>
            }
          />
        </Carte>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[320px,1fr] xl:items-start">
          {/* ================================================= Etat civil */}
          <Carte titre="Informations" icone={Icone.Etudiants} className="xl:sticky xl:top-24">
            <div className="mb-4 flex flex-col items-center text-center">
              <span className="grid h-16 w-16 place-items-center rounded-full bg-encre-100 font-display text-xl font-semibold text-encre-700">
                {etudiant.prenom?.[0]}
                {etudiant.nom?.[0]}
              </span>
              <h3 className="mt-3 font-display text-base font-semibold text-encre-900">
                {etudiant.prenom} {etudiant.nom}
              </h3>
              <p className="tabulaire text-xs text-ardoise-500">{etudiant.matricule}</p>

              {etudiant.statut_compte && (
                <div className="mt-2.5">
                  <Badge
                    ton={etudiant.statut_compte === "actif" ? "succes" : "alerte"}
                    pastille
                  >
                    {etudiant.statut_compte === "actif"
                      ? "Compte actif"
                      : "Compte desactive"}
                  </Badge>
                </div>
              )}
            </div>

            <dl className="divide-y divide-ardoise-200/70 border-t border-ardoise-200 pt-1">
              <LigneInfo libelle="Classe" valeur={etudiant.classe} />
              <LigneInfo libelle="Niveau" valeur={etudiant.niveau} />
              <LigneInfo libelle="Filiere" valeur={etudiant.filiere} />
              <LigneInfo libelle="Identifiant" valeur={etudiant.identifiant} />
              <LigneInfo
                libelle="Date de naissance"
                valeur={
                  etudiant.date_naissance
                    ? new Date(etudiant.date_naissance).toLocaleDateString("fr-FR")
                    : null
                }
              />
              {aPrediction && (
                <>
                  <LigneInfo
                    libelle="Evaluations"
                    valeur={
                      <span className="tabulaire">
                        {donnees.variables?.nb_evaluations ?? 0}
                      </span>
                    }
                  />
                  <LigneInfo
                    libelle="Seances suivies"
                    valeur={
                      <span className="tabulaire">{donnees.variables?.nb_seances ?? 0}</span>
                    }
                  />
                </>
              )}
            </dl>

            {role === "admin" && (
              <div className="mt-4 space-y-2 border-t border-ardoise-200 pt-4">
                <Bouton
                  variante="secondaire"
                  taille="sm"
                  icone={Icone.Modifier}
                  className="w-full"
                  onClick={() => naviguer(`/admin/etudiants?edition=${etudiant.id}`)}
                >
                  Modifier la fiche
                </Bouton>
                {etudiant.statut_compte && (
                  <Bouton
                    variante={etudiant.statut_compte === "actif" ? "danger" : "succes"}
                    taille="sm"
                    icone={Icone.Deconnexion}
                    className="w-full"
                    chargement={changementStatutEnCours}
                    onClick={() => {
                      if (etudiant.statut_compte === "actif") {
                        setModaleDesactivationOuverte(true);
                      } else {
                        basculerStatutCompte(null);
                      }
                    }}
                  >
                    {etudiant.statut_compte === "actif" ? "Desactiver le compte" : "Reactiver le compte"}
                  </Bouton>
                )}
              </div>
            )}
          </Carte>

          {/* ================================================= Prediction */}
          <div className="min-w-0">
            {aPrediction ? (
              <PanneauPrediction prediction={donnees} />
            ) : (
              <Carte titre="Prediction" icone={Icone.Prediction}>
                <Bandeau ton="vigilance" titre="Prediction impossible">
                  {messageErreur ||
                    "Aucune note ni appel de presence n'est enregistre pour cet etudiant."}
                </Bandeau>

                <p className="mt-4 text-sm leading-relaxed text-ardoise-600">
                  Le moteur de prediction a besoin d'au moins une note ou une seance d'appel
                  pour produire une estimation. Demandez aux enseignants de la classe de
                  saisir les evaluations et les presences, puis relancez le calcul.
                </p>
              </Carte>
            )}
          </div>
        </div>
      )}

      <Modale
        ouverte={modaleDesactivationOuverte}
        onFermer={() => {
          setModaleDesactivationOuverte(false);
          setMotifDesactivation("");
        }}
        titre="Desactiver ce compte ?"
        sousTitre="L'etudiant ne pourra plus se connecter tant que le compte reste desactive."
        piedDePage={
          <>
            <Bouton
              variante="secondaire"
              onClick={() => {
                setModaleDesactivationOuverte(false);
                setMotifDesactivation("");
              }}
              disabled={changementStatutEnCours}
            >
              Annuler
            </Bouton>
            <Bouton
              variante="danger"
              onClick={() => basculerStatutCompte(motifDesactivation.trim())}
              chargement={changementStatutEnCours}
              disabled={!motifDesactivation.trim()}
            >
              Desactiver
            </Bouton>
          </>
        }
      >
        <label className="mb-1 block text-sm font-medium text-encre-900">Motif</label>
        <textarea
          value={motifDesactivation}
          onChange={(e) => setMotifDesactivation(e.target.value)}
          rows={3}
          placeholder="ex. Non-paiement des frais de scolarite"
          className="anneau-focus w-full rounded-lg border border-ardoise-300 px-3 py-2 text-sm"
        />
      </Modale>
    </CoqueApplication>
  );
}
