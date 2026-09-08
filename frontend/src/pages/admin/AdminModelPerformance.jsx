/**
 * Performance du modele de prediction.
 *
 * Un systeme dont personne ne peut consulter la fiabilite ne devrait pas
 * servir a prendre des decisions concernant des etudiants. Cet ecran rend
 * publiques, aupres de l'administration, les metriques d'evaluation, le
 * comparatif des algorithmes testes et l'importance de chaque variable.
 *
 * Il sert egalement de support de demonstration en soutenance : le
 * simulateur permet de montrer en direct le comportement du modele.
 *
 * Consomme GET /api/admin/modele/metriques et POST /api/admin/predictions/simuler.
 */
import { useCallback, useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import CoqueApplication from "../../components/AppShell.jsx";
import { navigationAdmin } from "../../components/navigation.js";
import Icone from "../../components/ui/Icons.jsx";
import { Bandeau, useNotifications } from "../../components/ui/Feedback.jsx";
import {
  AnneauProgression,
  Badge,
  BadgeRisque,
  Bouton,
  Carte,
  CarteStat,
  EtatVide,
  LigneInfo,
  SqueletteCarte,
} from "../../components/ui/Primitives.jsx";
import client from "../../api/client.js";

export default function PerformanceModele() {
  const [metriques, setMetriques] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");

  const notifications = useNotifications();

  const charger = useCallback(async () => {
    try {
      const { data } = await client.get("/admin/modele/metriques");
      setMetriques(data);
      setErreur("");
    } catch (exception) {
      setErreur(
        exception.response?.status === 404
          ? "Aucune metrique disponible. Lancez `python -m app.ml.train_model` pour entrainer le modele."
          : "Impossible de charger les metriques du modele."
      );
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    charger();
  }, [charger]);

  async function rechargerLeModele() {
    try {
      const { data } = await client.post("/admin/modele/recharger");
      setMetriques(data.metriques);
      notifications.succes("Modele recharge depuis le disque.");
    } catch {
      notifications.erreur("Le rechargement du modele a echoue.");
    }
  }

  const matrice = metriques?.matrice_confusion ?? {};
  const comparatif = metriques?.comparatif_modeles ?? [];
  const importances = metriques?.importances ?? [];

  return (
    <CoqueApplication
      titre="Performance du modele"
      sousTitre="Fiabilite et transparence du moteur de prediction"
      sectionsNavigation={navigationAdmin()}
      actions={
        <Bouton
          variante="secondaire"
          taille="sm"
          icone={Icone.Actualiser}
          onClick={rechargerLeModele}
        >
          <span className="hidden sm:inline">Recharger</span>
        </Bouton>
      }
    >
      {erreur && (
        <div className="mb-6">
          <Bandeau ton="vigilance" titre="Metriques indisponibles">
            {erreur}
          </Bandeau>
        </div>
      )}

      {/* ================================================== Metriques cles */}
      <div className="cascade grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {chargement ? (
          Array.from({ length: 4 }).map((_, index) => <SqueletteCarte key={index} />)
        ) : (
          <>
            <CarteStat
              libelle="ROC-AUC"
              valeur={metriques?.roc_auc?.toFixed(3) ?? "—"}
              icone={Icone.Cible}
              ton={
                metriques?.roc_auc >= 0.85
                  ? "succes"
                  : metriques?.roc_auc >= 0.75
                  ? "vigilance"
                  : "alerte"
              }
              legende="Capacite a ordonner les etudiants"
            />
            <CarteStat
              libelle="Rappel sur l'echec"
              valeur={
                metriques?.rappel_echec != null
                  ? (metriques.rappel_echec * 100).toFixed(1)
                  : "—"
              }
              unite="%"
              icone={Icone.Alerte}
              ton={
                metriques?.rappel_echec >= 0.75
                  ? "succes"
                  : metriques?.rappel_echec >= 0.6
                  ? "vigilance"
                  : "alerte"
              }
              legende="Etudiants a risque detectes"
            />
            <CarteStat
              libelle="Exactitude"
              valeur={
                metriques?.accuracy != null ? (metriques.accuracy * 100).toFixed(1) : "—"
              }
              unite="%"
              icone={Icone.Valide}
              ton="neutre"
              legende="Predictions correctes"
            />
            <CarteStat
              libelle="Score de Brier"
              valeur={metriques?.brier_score?.toFixed(3) ?? "—"}
              icone={Icone.Boussole}
              ton={
                metriques?.brier_score <= 0.15
                  ? "succes"
                  : metriques?.brier_score <= 0.22
                  ? "vigilance"
                  : "alerte"
              }
              legende="Calibration (plus bas = meilleur)"
            />
          </>
        )}
      </div>

      {/* Rappel methodologique : le jury posera la question, autant que la
          reponse figure dans l'application elle-meme. */}
      <div className="mt-5">
        <Bandeau ton="info" titre="Pourquoi le ROC-AUC plutot que l'exactitude ?">
          En detection de risque, un modele qui predirait « tout le monde reussit »
          obtiendrait une exactitude honorable tout en ratant precisement les etudiants a
          reperer. Le ROC-AUC mesure la capacite a <strong>ordonner</strong> les etudiants du
          plus au moins fragile, ce qui correspond a l'usage reel du systeme. Le rappel sur
          l'echec est l'indicateur metier prioritaire : le cout d'un etudiant en difficulte
          non detecte depasse largement celui d'une fausse alerte.
        </Bandeau>
      </div>

      {/* ============================== Matrice de confusion + informations */}
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <Carte
          titre="Matrice de confusion"
          sousTitre={`Evaluee sur ${metriques?.n_test ?? 0} etudiants du jeu de test`}
          icone={Icone.Rapports}
        >
          {chargement ? (
            <div className="squelette h-[260px] rounded-lg" />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <CelluleMatrice
                  libelle="Echecs correctement detectes"
                  valeur={matrice.vrais_negatifs ?? 0}
                  ton="succes"
                  aide="Le systeme a signale un risque, l'etudiant etait effectivement en difficulte."
                />
                <CelluleMatrice
                  libelle="Fausses alertes"
                  valeur={matrice.faux_positifs ?? 0}
                  ton="vigilance"
                  aide="Un etudiant a ete signale alors qu'il aurait reussi. Cout : un entretien inutile."
                />
                <CelluleMatrice
                  libelle="Echecs manques"
                  valeur={matrice.faux_negatifs ?? 0}
                  ton="alerte"
                  aide="Le cas le plus couteux : un etudiant en difficulte n'a pas ete repere."
                />
                <CelluleMatrice
                  libelle="Reussites confirmees"
                  valeur={matrice.vrais_positifs ?? 0}
                  ton="succes"
                  aide="Aucune alerte declenchee, l'etudiant a effectivement reussi."
                />
              </div>

              <p className="mt-4 border-t border-ardoise-200 pt-3.5 text-xs leading-relaxed text-ardoise-500">
                Le modele est volontairement regle pour privilegier la detection des
                difficultes, quitte a produire quelques fausses alertes. Ce compromis est
                assume : une fausse alerte se resout par un entretien, un decrochage non
                detecte se solde par un abandon.
              </p>
            </>
          )}
        </Carte>

        <Carte titre="Configuration du modele" icone={Icone.Parametres}>
          {chargement ? (
            <div className="squelette h-[260px] rounded-lg" />
          ) : (
            <dl className="divide-y divide-ardoise-200/70">
              <LigneInfo
                libelle="Algorithme retenu"
                valeur={
                  <Badge ton="encre">{metriques?.algorithme_retenu ?? "—"}</Badge>
                }
              />
              <LigneInfo libelle="Calibration" valeur={metriques?.calibration} />
              <LigneInfo libelle="Source des donnees" valeur={metriques?.source_donnees} />
              <LigneInfo
                libelle="Jeu d'entrainement"
                valeur={
                  <span className="tabulaire">{metriques?.n_train ?? 0} etudiants</span>
                }
              />
              <LigneInfo
                libelle="Jeu de test"
                valeur={<span className="tabulaire">{metriques?.n_test ?? 0} etudiants</span>}
              />
              <LigneInfo
                libelle="Variables utilisees"
                valeur={<span className="tabulaire">{metriques?.variables?.length ?? 0}</span>}
              />
              <LigneInfo
                libelle="Dernier entrainement"
                valeur={
                  metriques?.date_entrainement
                    ? new Date(metriques.date_entrainement).toLocaleString("fr-FR", {
                        dateStyle: "long",
                        timeStyle: "short",
                      })
                    : "—"
                }
              />
              <LigneInfo
                libelle="Precision (reussite)"
                valeur={
                  <span className="tabulaire">
                    {metriques?.precision != null
                      ? `${(metriques.precision * 100).toFixed(1)}%`
                      : "—"}
                  </span>
                }
              />
              <LigneInfo
                libelle="Score F1"
                valeur={
                  <span className="tabulaire">{metriques?.f1_score?.toFixed(3) ?? "—"}</span>
                }
              />
            </dl>
          )}
        </Carte>
      </div>

      {/* ================================= Comparatif + importance variables */}
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Carte
          titre="Algorithmes compares"
          sousTitre="Validation croisee stratifiee, 5 plis"
          icone={Icone.Prediction}
        >
          {chargement ? (
            <div className="squelette h-[240px] rounded-lg" />
          ) : comparatif.length === 0 ? (
            <EtatVide icone={Icone.Prediction} titre="Aucun comparatif disponible" />
          ) : (
            <>
              <ul className="space-y-3">
                {comparatif.map((candidat) => {
                  const retenu = candidat.modele === metriques?.algorithme_retenu;
                  return (
                    <li
                      key={candidat.modele}
                      className={`rounded-lg border p-3.5 transition-colors ${
                        retenu
                          ? "border-encre-300 bg-encre-50"
                          : "border-ardoise-200 bg-white"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm font-medium text-encre-900">
                          {candidat.modele}
                        </span>
                        {retenu && <Badge ton="succes">Retenu</Badge>}
                      </div>

                      <div className="mt-2 flex items-center gap-3">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-ardoise-200">
                          <div
                            className={`h-full rounded-full transition-[width] duration-700 ease-douce ${
                              retenu ? "bg-encre-700" : "bg-ardoise-400"
                            }`}
                            // Echelle 0,5-1 : en dessous de 0,5 un classifieur
                            // binaire fait moins bien qu'un tirage au sort.
                            style={{
                              width: `${Math.max(
                                0,
                                (candidat.roc_auc_cv - 0.5) * 200
                              )}%`,
                            }}
                          />
                        </div>
                        <span className="tabulaire shrink-0 text-sm font-semibold text-encre-900">
                          {candidat.roc_auc_cv.toFixed(4)}
                        </span>
                      </div>

                      <p className="tabulaire mt-1.5 text-xs text-ardoise-500">
                        ecart-type sur les plis : ±{candidat.ecart_type_cv.toFixed(4)}
                      </p>
                    </li>
                  );
                })}
              </ul>

              <p className="mt-4 border-t border-ardoise-200 pt-3.5 text-xs leading-relaxed text-ardoise-500">
                La regression logistique sert de reference : un modele complexe qui ne la
                depasserait pas ne justifierait pas sa complexite.
              </p>
            </>
          )}
        </Carte>

        <Carte
          titre="Importance des variables"
          sousTitre="Mesuree par permutation sur le jeu de test"
          icone={Icone.Boussole}
        >
          {chargement ? (
            <div className="squelette h-[240px] rounded-lg" />
          ) : importances.length === 0 ? (
            <EtatVide icone={Icone.Boussole} titre="Aucune donnee d'importance" />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={Math.max(230, importances.length * 34)}>
                <BarChart
                  data={importances}
                  layout="vertical"
                  margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E1E6EE" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: "#6E7B92" }}
                    axisLine={{ stroke: "#E1E6EE" }}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="libelle"
                    width={150}
                    tick={{ fontSize: 10.5, fill: "#525E73" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<InfobulleImportance />} cursor={{ fill: "#EEF1F6" }} />
                  <Bar dataKey="importance" radius={[0, 5, 5, 0]} maxBarSize={20}>
                    {importances.map((element, index) => (
                      <Cell
                        key={element.variable}
                        fill={index === 0 ? "#1B2A4A" : index < 3 ? "#3D5A99" : "#9AAFCE"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              <p className="mt-3 border-t border-ardoise-200 pt-3.5 text-xs leading-relaxed text-ardoise-500">
                Lecture : de combien le ROC-AUC chute si l'on melange aleatoirement cette
                variable. Cette methode est preferee aux importances internes des arbres, qui
                favorisent artificiellement les variables continues.
              </p>
            </>
          )}
        </Carte>
      </div>

      {/* ====================================================== Simulateur */}
      <div className="mt-5">
        <Simulateur />
      </div>
    </CoqueApplication>
  );
}

/* ==========================================================================
   SIMULATEUR
   ========================================================================== */

/**
 * Permet de tester le modele avec des valeurs arbitraires. Deux usages :
 * demonstration en soutenance, et reponse a la question pedagogique
 * « de combien cet etudiant doit-il remonter son assiduite ? ».
 */
function Simulateur() {
  const [notesTexte, setNotesTexte] = useState("8, 9.5, 7, 11");
  const [seancesTotales, setSeancesTotales] = useState(20);
  const [seancesPresentes, setSeancesPresentes] = useState(12);
  const [resultat, setResultat] = useState(null);
  const [enCours, setEnCours] = useState(false);

  const notifications = useNotifications();

  async function simuler() {
    const notes = notesTexte
      .split(/[,;\s]+/)
      .filter(Boolean)
      .map((valeur) => Number(valeur.replace(",", ".")));

    if (notes.some((note) => Number.isNaN(note) || note < 0 || note > 20)) {
      notifications.erreur("Les notes doivent etre des nombres compris entre 0 et 20.");
      return;
    }
    if (Number(seancesPresentes) > Number(seancesTotales)) {
      notifications.erreur("Le nombre de presences ne peut pas depasser le nombre de seances.");
      return;
    }

    setEnCours(true);
    try {
      const { data } = await client.post("/admin/predictions/simuler", {
        notes,
        seances_totales: Number(seancesTotales),
        seances_presentes: Number(seancesPresentes),
      });
      setResultat(data);
    } catch (exception) {
      notifications.erreur(
        exception.response?.data?.error ?? "La simulation a echoue."
      );
    } finally {
      setEnCours(false);
    }
  }

  const tauxAssiduite =
    Number(seancesTotales) > 0
      ? (Number(seancesPresentes) / Number(seancesTotales)) * 100
      : 0;

  return (
    <Carte
      titre="Simulateur"
      sousTitre="Testez le comportement du modele sur un profil fictif"
      icone={Icone.Ampoule}
    >
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Formulaire */}
        <div className="space-y-4">
          <div>
            <label
              htmlFor="simulateur-notes"
              className="mb-1.5 block text-xs font-medium text-ardoise-600"
            >
              Notes (separees par des virgules, de la plus ancienne a la plus recente)
            </label>
            <input
              id="simulateur-notes"
              type="text"
              value={notesTexte}
              onChange={(evenement) => setNotesTexte(evenement.target.value)}
              placeholder="12, 9.5, 14, 8"
              className="anneau-focus h-10 w-full rounded-lg border border-ardoise-300 px-3 text-sm
                text-encre-900 transition-colors hover:border-ardoise-400"
            />
            <p className="mt-1.5 text-xs text-ardoise-500">
              L'ordre compte : il determine la tendance de progression.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="simulateur-total"
                className="mb-1.5 block text-xs font-medium text-ardoise-600"
              >
                Seances au total
              </label>
              <input
                id="simulateur-total"
                type="number"
                min="0"
                max="200"
                value={seancesTotales}
                onChange={(evenement) => setSeancesTotales(evenement.target.value)}
                className="anneau-focus tabulaire h-10 w-full rounded-lg border border-ardoise-300 px-3
                  text-sm text-encre-900 transition-colors hover:border-ardoise-400"
              />
            </div>

            <div>
              <label
                htmlFor="simulateur-presences"
                className="mb-1.5 block text-xs font-medium text-ardoise-600"
              >
                Seances suivies
              </label>
              <input
                id="simulateur-presences"
                type="number"
                min="0"
                max="200"
                value={seancesPresentes}
                onChange={(evenement) => setSeancesPresentes(evenement.target.value)}
                className="anneau-focus tabulaire h-10 w-full rounded-lg border border-ardoise-300 px-3
                  text-sm text-encre-900 transition-colors hover:border-ardoise-400"
              />
            </div>
          </div>

          <p className="tabulaire text-xs text-ardoise-500">
            Taux d'assiduite correspondant : {tauxAssiduite.toFixed(1)}%
          </p>

          <Bouton
            variante="primaire"
            icone={Icone.Prediction}
            onClick={simuler}
            chargement={enCours}
            className="w-full"
          >
            Lancer la simulation
          </Bouton>
        </div>

        {/* Resultat */}
        <div className="rounded-lg border border-ardoise-200 bg-ardoise-50/50 p-5">
          {!resultat ? (
            <EtatVide
              icone={Icone.Prediction}
              titre="Aucune simulation"
              message="Renseignez un profil puis lancez la simulation pour voir le resultat du modele."
            />
          ) : (
            <div className="text-center">
              <AnneauProgression
                valeur={resultat.score_reussite}
                ton={
                  resultat.niveau_risque === "faible"
                    ? "succes"
                    : resultat.niveau_risque === "moyen"
                    ? "vigilance"
                    : "alerte"
                }
                taille={128}
                libelle="Reussite"
              />

              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                <BadgeRisque niveau={resultat.niveau_risque} />
                <Badge
                  ton={
                    resultat.confiance?.niveau === "elevee"
                      ? "succes"
                      : resultat.confiance?.niveau === "moyenne"
                      ? "vigilance"
                      : "alerte"
                  }
                >
                  Confiance {resultat.confiance?.indice}%
                </Badge>
              </div>

              {resultat.explication?.synthese && (
                <p className="mt-4 text-left text-sm leading-relaxed text-ardoise-700">
                  {resultat.explication.synthese}
                </p>
              )}

              {resultat.explication?.contributions?.length > 0 && (
                <ul className="mt-4 space-y-2 text-left">
                  {resultat.explication.contributions.slice(0, 4).map((facteur) => (
                    <li
                      key={facteur.variable}
                      className="flex items-baseline justify-between gap-3 text-xs"
                    >
                      <span className="min-w-0 truncate text-ardoise-600">
                        {facteur.libelle}
                      </span>
                      <span
                        className={`tabulaire shrink-0 font-semibold ${
                          facteur.impact_points > 0 ? "text-sauge-600" : "text-brique-600"
                        }`}
                      >
                        {facteur.impact_points > 0 ? "+" : ""}
                        {facteur.impact_points.toFixed(1)} pts
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </Carte>
  );
}

/* ==========================================================================
   SOUS-COMPOSANTS
   ========================================================================== */

function CelluleMatrice({ libelle, valeur, ton, aide }) {
  const styles = {
    succes: "border-sauge-200 bg-sauge-50 text-sauge-700",
    vigilance: "border-ambre-200 bg-ambre-50 text-ambre-700",
    alerte: "border-brique-200 bg-brique-50 text-brique-700",
  };

  return (
    <div className={`rounded-lg border p-3.5 ${styles[ton]}`} title={aide}>
      <p className="tabulaire font-display text-2xl font-semibold">{valeur}</p>
      <p className="mt-0.5 text-xs font-medium leading-snug">{libelle}</p>
    </div>
  );
}

function InfobulleImportance({ active, payload }) {
  if (!active || !payload?.length) return null;
  const element = payload[0].payload;

  return (
    <div className="rounded-lg border border-ardoise-200 bg-white px-3 py-2 shadow-elevee">
      <p className="text-xs font-semibold text-encre-900">{element.libelle}</p>
      <p className="tabulaire mt-1 text-xs text-ardoise-600">
        Perte de ROC-AUC : {element.importance.toFixed(4)}
      </p>
      <p className="tabulaire text-xs text-ardoise-500">
        Poids relatif : {(element.poids_relatif * 100).toFixed(1)}%
      </p>
    </div>
  );
}
