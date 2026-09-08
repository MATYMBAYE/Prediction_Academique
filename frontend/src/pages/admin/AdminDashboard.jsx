/**
 * Tableau de bord administrateur.
 *
 * Reprend l'ancien ecran `AdminOverview` (3 compteurs + un tableau brut) et
 * le structure en quatre niveaux de lecture :
 *
 *   1. Indicateurs cles      lecture en 2 secondes
 *   2. Repartition du risque ou en est la promotion
 *   3. Evolution & filieres  d'ou vient le probleme
 *   4. Alertes & etudiants   sur qui agir maintenant
 *
 * Consomme l'endpoint GET /api/admin/dashboard.
 */
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import CoqueApplication from "../../components/AppShell.jsx";
import { navigationAdmin } from "../../components/navigation.js";
import Icone from "../../components/ui/Icons.jsx";
import TableauDonnees, { CelluleIdentite } from "../../components/ui/DataTable.jsx";
import { Bandeau, Modale, useNotifications } from "../../components/ui/Feedback.jsx";
import {
  Badge,
  BadgeRisque,
  BarreProgression,
  Bouton,
  Carte,
  CarteStat,
  EtatVide,
  SqueletteCarte,
} from "../../components/ui/Primitives.jsx";
import client from "../../api/client.js";

const COULEURS_RISQUE = {
  faible: "#4C7A64",
  moyen: "#D98E3F",
  eleve: "#A83E32",
  inconnu: "#9BA7BC",
};

const LIBELLES_RISQUE = {
  faible: "Risque faible",
  moyen: "Risque modere",
  eleve: "Risque eleve",
  inconnu: "Non evalue",
};

export default function TableauBordAdmin() {
  const [donnees, setDonnees] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [recalculEnCours, setRecalculEnCours] = useState(false);
  const [modaleAlertesOuverte, setModaleAlertesOuverte] = useState(false);

  const naviguer = useNavigate();
  const notifications = useNotifications();

  const charger = useCallback(async () => {
    try {
      const { data } = await client.get("/admin/dashboard");
      setDonnees(data);
      setErreur("");
    } catch {
      setErreur("Impossible de charger le tableau de bord. Verifiez que le serveur est demarre.");
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    charger();
  }, [charger]);

  async function recalculerToutesLesPredictions() {
    setRecalculEnCours(true);
    try {
      const { data } = await client.post("/admin/predictions/recalculer");
      notifications.succes(
        `${data.nombre_predictions} prediction(s) recalculee(s) avec succes.`
      );
      await charger();
    } catch {
      notifications.erreur("Le recalcul des predictions a echoue.");
    } finally {
      setRecalculEnCours(false);
    }
  }

  const statistiques = donnees?.statistiques ?? {};
  const repartition = donnees?.repartition_risque ?? [];
  const evolution = donnees?.evolution ?? [];
  const parFiliere = donnees?.par_filiere ?? [];
  const alertes = donnees?.alertes_recentes ?? [];
  const etudiantsARisque = donnees?.etudiants_a_risque ?? [];

  const nombreAlertesNouvelles = statistiques.alertes_nouvelles ?? 0;

  return (
    <CoqueApplication
      titre="Vue d'ensemble"
      sousTitre="Pilotage de la reussite academique"
      sectionsNavigation={navigationAdmin({
        alertes: nombreAlertesNouvelles,
        reclamations: statistiques.reclamations_ouvertes,
      })}
      actions={
        <>
          {/* Alertes en modale plutot qu'en banniere + carte permanentes :
              l'info reste a un clic, sans occuper en continu un tiers de
              l'ecran sur un tableau de bord deja dense. */}
          <div className="relative">
            <Bouton
              variante="secondaire"
              taille="sm"
              icone={Icone.Alerte}
              onClick={() => setModaleAlertesOuverte(true)}
            >
              <span className="hidden sm:inline">Alertes</span>
            </Bouton>
            {nombreAlertesNouvelles > 0 && (
              <span
                className="tabulaire pointer-events-none absolute -right-1.5 -top-1.5 grid h-5
                  min-w-[20px] place-items-center rounded-full bg-brique-500 px-1 text-2xs
                  font-semibold text-white ring-2 ring-white"
              >
                {nombreAlertesNouvelles > 99 ? "99+" : nombreAlertesNouvelles}
              </span>
            )}
          </div>
          <Bouton
            variante="secondaire"
            taille="sm"
            icone={Icone.Actualiser}
            onClick={recalculerToutesLesPredictions}
            chargement={recalculEnCours}
          >
            <span className="hidden sm:inline">Recalculer</span>
          </Bouton>
          <Bouton
            variante="primaire"
            taille="sm"
            icone={Icone.Telecharger}
            onClick={() => naviguer("/admin/rapports")}
          >
            <span className="hidden sm:inline">Rapports</span>
          </Bouton>
        </>
      }
    >
      {erreur && (
        <div className="mb-6">
          <Bandeau ton="alerte" titre="Connexion au serveur impossible">
            {erreur}
          </Bandeau>
        </div>
      )}

      {/* ============================================== 1. Indicateurs cles */}
      <div className="cascade grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {chargement ? (
          Array.from({ length: 4 }).map((_, index) => <SqueletteCarte key={index} />)
        ) : (
          <>
            <CarteStat
              variante="sombre"
              libelle="Etudiants inscrits"
              valeur={statistiques.total_etudiants ?? 0}
              icone={Icone.Etudiants}
              legende={`${statistiques.total_classes ?? 0} classes actives`}
              onClick={() => naviguer("/admin/etudiants")}
            />
            <CarteStat
              variante="sombre"
              libelle="Etudiants a risque"
              valeur={statistiques.etudiants_a_risque ?? 0}
              icone={Icone.Alerte}
              legende={
                statistiques.total_etudiants
                  ? `${Math.round(
                      ((statistiques.etudiants_a_risque ?? 0) / statistiques.total_etudiants) * 100
                    )}% de l'effectif`
                  : "Aucune donnee"
              }
              onClick={() => naviguer("/admin/etudiants?risque=eleve")}
            />
            <CarteStat
              variante="sombre"
              libelle="Moyenne generale"
              valeur={(statistiques.moyenne_generale ?? 0).toFixed(2)}
              unite="/ 20"
              icone={Icone.Notes}
              legende="Toutes filieres confondues"
            />
            <CarteStat
              variante="sombre"
              libelle="Assiduite moyenne"
              valeur={(statistiques.assiduite_moyenne ?? 0).toFixed(1)}
              unite="%"
              icone={Icone.Presence}
              legende={`${statistiques.seances_enregistrees ?? 0} seances enregistrees`}
            />
          </>
        )}
      </div>

      {/* ====================================== 2 & 3. Repartition et tendances */}
      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        {/* Repartition du risque */}
        <Carte
          titre="Repartition du risque"
          sousTitre="Derniere prediction de chaque etudiant"
          icone={Icone.Cible}
        >
          {chargement ? (
            <div className="squelette h-[240px] rounded-lg" />
          ) : repartition.every((element) => element.valeur === 0) ? (
            <EtatVide
              icone={Icone.Prediction}
              titre="Aucune prediction"
              message="Saisissez des notes et des presences pour generer les premieres predictions."
            />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={210}>
                <PieChart>
                  <Pie
                    data={repartition}
                    dataKey="valeur"
                    nameKey="libelle"
                    cx="50%"
                    cy="50%"
                    innerRadius={58}
                    outerRadius={88}
                    paddingAngle={2}
                    strokeWidth={0}
                  >
                    {repartition.map((element) => (
                      <Cell
                        key={element.niveau}
                        fill={COULEURS_RISQUE[element.niveau] ?? COULEURS_RISQUE.inconnu}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<InfobulleGraphique suffixe=" etudiant(s)" />} />
                </PieChart>
              </ResponsiveContainer>

              <ul className="mt-3 space-y-2">
                {repartition.map((element) => (
                  <li
                    key={element.niveau}
                    className="flex items-center gap-2.5 rounded-lg border border-ardoise-200/70 px-3.5 py-2 text-sm"
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{
                        backgroundColor:
                          COULEURS_RISQUE[element.niveau] ?? COULEURS_RISQUE.inconnu,
                      }}
                    />
                    <span className="flex-1 text-ardoise-600">
                      {LIBELLES_RISQUE[element.niveau] ?? element.libelle}
                    </span>
                    <span className="tabulaire font-semibold text-encre-900">
                      {element.valeur}
                    </span>
                    <span className="tabulaire w-11 text-right text-xs text-ardoise-500">
                      {element.pourcentage}%
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Carte>

        {/* Evolution */}
        <Carte
          titre="Evolution du risque"
          sousTitre="Nombre d'etudiants a risque eleve par semaine"
          icone={Icone.Prediction}
          className="lg:col-span-2"
        >
          {chargement ? (
            <div className="squelette h-[280px] rounded-lg" />
          ) : evolution.length < 2 ? (
            <EtatVide
              icone={Icone.Horloge}
              titre="Historique insuffisant"
              message="La courbe apparaitra une fois que plusieurs series de predictions auront ete enregistrees."
            />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={evolution} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E1E6EE" vertical={false} />
                <XAxis
                  dataKey="periode"
                  tick={{ fontSize: 11, fill: "#6E7B92" }}
                  axisLine={{ stroke: "#E1E6EE" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#6E7B92" }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<InfobulleGraphique />} />
                <Legend
                  wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
                  iconType="circle"
                  iconSize={8}
                />
                <Line
                  type="monotone"
                  dataKey="risque_eleve"
                  name="Risque eleve"
                  stroke={COULEURS_RISQUE.eleve}
                  strokeWidth={2.5}
                  dot={{ r: 3, strokeWidth: 0, fill: COULEURS_RISQUE.eleve }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="risque_moyen"
                  name="Risque modere"
                  stroke={COULEURS_RISQUE.moyen}
                  strokeWidth={2.5}
                  dot={{ r: 3, strokeWidth: 0, fill: COULEURS_RISQUE.moyen }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Carte>
      </div>

      {/* ================================================ Analyse par filiere */}
      <div className="mt-5">
        <Carte
          titre="Situation par filiere"
          sousTitre="Moyenne et part d'etudiants a risque"
          icone={Icone.Classes}
        >
          {chargement ? (
            <div className="squelette h-[260px] rounded-lg" />
          ) : parFiliere.length === 0 ? (
            <EtatVide icone={Icone.Classes} titre="Aucune filiere renseignee" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={parFiliere} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E1E6EE" vertical={false} />
                <XAxis
                  dataKey="filiere"
                  tick={{ fontSize: 11, fill: "#6E7B92" }}
                  axisLine={{ stroke: "#E1E6EE" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#6E7B92" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<InfobulleGraphique />} cursor={{ fill: "#EEF1F6" }} />
                <Legend
                  wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
                  iconType="circle"
                  iconSize={8}
                />
                <Bar
                  dataKey="moyenne"
                  name="Moyenne / 20"
                  fill="#3D5A99"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={38}
                />
                <Bar
                  dataKey="taux_risque"
                  name="% a risque"
                  fill="#D98E3F"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={38}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Carte>
      </div>

      {/* ================================== 4. Etudiants prioritaires */}
      <div className="mt-5">
        <div className="mb-3 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-encre-900">
              Etudiants prioritaires
            </h2>
            <p className="text-sm text-ardoise-500">
              Classes par probabilite de reussite croissante
            </p>
          </div>
          <Bouton variante="secondaire" taille="sm" onClick={() => naviguer("/admin/etudiants")}>
            Tous les etudiants
          </Bouton>
        </div>

        <TableauDonnees
          chargement={chargement}
          lignes={etudiantsARisque}
          cleLigne={(ligne) => ligne.id}
          onClicLigne={(ligne) => naviguer(`/admin/etudiants/${ligne.id}`)}
          placeholderRecherche="Rechercher un etudiant, un matricule..."
          parPageDefaut={8}
          titreVide="Aucun etudiant a risque"
          messageVide="Aucun etudiant ne presente actuellement de risque eleve ou modere."
          filtres={[
            {
              cle: "niveau_risque",
              libelle: "Risque",
              options: [
                { valeur: "eleve", libelle: "Risque eleve" },
                { valeur: "moyen", libelle: "Risque modere" },
              ],
            },
          ]}
          colonnes={[
            {
              cle: "nom",
              titre: "Etudiant",
              triable: true,
              valeurTri: (ligne) => `${ligne.nom} ${ligne.prenom}`,
              valeurRecherche: (ligne) =>
                `${ligne.prenom} ${ligne.nom} ${ligne.matricule} ${ligne.classe ?? ""}`,
              rendu: (ligne) => (
                <CelluleIdentite
                  principal={`${ligne.prenom} ${ligne.nom}`}
                  secondaire={ligne.matricule}
                  initiales={`${ligne.prenom?.[0] ?? ""}${ligne.nom?.[0] ?? ""}`}
                  ton={ligne.niveau_risque === "eleve" ? "ambre" : "encre"}
                />
              ),
            },
            {
              cle: "classe",
              titre: "Classe",
              triable: true,
              rendu: (ligne) => (
                <span className="text-ardoise-600">{ligne.classe ?? "Non affecte"}</span>
              ),
            },
            {
              cle: "moyenne_generale",
              titre: "Moyenne",
              triable: true,
              alignement: "droite",
              tabulaire: true,
              rendu: (ligne) =>
                ligne.moyenne_generale != null ? (
                  <span
                    className={
                      ligne.moyenne_generale < 10
                        ? "font-semibold text-brique-600"
                        : "text-encre-800"
                    }
                  >
                    {ligne.moyenne_generale.toFixed(2)}
                  </span>
                ) : (
                  "—"
                ),
            },
            {
              cle: "taux_assiduite",
              titre: "Assiduite",
              triable: true,
              largeur: "148px",
              rendu: (ligne) =>
                ligne.taux_assiduite != null ? (
                  <BarreProgression valeur={ligne.taux_assiduite} afficherValeur />
                ) : (
                  "—"
                ),
            },
            {
              cle: "probabilite_reussite",
              titre: "Reussite",
              triable: true,
              alignement: "droite",
              tabulaire: true,
              rendu: (ligne) => (
                <span className="font-semibold text-encre-900">
                  {Math.round((ligne.probabilite_reussite ?? 0) * 100)}%
                </span>
              ),
            },
            {
              cle: "niveau_risque",
              titre: "Niveau",
              triable: true,
              rendu: (ligne) => <BadgeRisque niveau={ligne.niveau_risque} />,
            },
          ]}
        />
      </div>

      {/* ================================== 5. Vue globale : Pilotage & Structure technique */}
      <div className="mt-8 border-t border-ardoise-200/80 pt-6">
        <div className="mb-4">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-isi-bleu" />
            <h2 className="font-display text-lg font-semibold text-encre-900">
              Vue globale : Structure académique & Gestion technique
            </h2>
          </div>
          <p className="text-sm text-ardoise-500">
            Accès direct aux modules d'exploitation, de vérification des affectations et de suivi pédagogique (généralisation des rôles Technicien et Assistante).
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {/* Carte Structure & Gestion technique (Technicien) */}
          <Carte
            titre="Structure & Gestion technique"
            sousTitre="Affectations des charges d'enseignement, maquettes et catalogue"
            icone={Icone.Classes}
          >
            <div className="space-y-3 pt-1">
              <div
                onClick={() => naviguer("/admin/affectations")}
                className="group flex cursor-pointer items-center justify-between rounded-lg border border-ardoise-200/70 p-3.5 transition hover:border-isi-bleu hover:bg-ardoise-50/70"
              >
                <div className="flex items-center gap-3">
                  <span className="grid h-8 w-8 place-items-center rounded-md bg-ardoise-100 text-ardoise-700 group-hover:bg-isi-bleu group-hover:text-white transition">
                    <Icone.Classes className="h-4 w-4" />
                  </span>
                  <div>
                    <h4 className="text-sm font-medium text-encre-900">
                      Affectations & Enseignements
                    </h4>
                    <p className="text-xs text-ardoise-500">
                      Enseignants, matières, classes et filières
                    </p>
                  </div>
                </div>
                <Icone.ChevronDroite className="h-4 w-4 text-ardoise-400 group-hover:text-isi-bleu transition" />
              </div>

              <div
                onClick={() => naviguer("/admin/audit-affectations")}
                className="group flex cursor-pointer items-center justify-between rounded-lg border border-ardoise-200/70 p-3.5 transition hover:border-isi-bleu hover:bg-ardoise-50/70"
              >
                <div className="flex items-center gap-3">
                  <span className="grid h-8 w-8 place-items-center rounded-md bg-ardoise-100 text-ardoise-700 group-hover:bg-isi-bleu group-hover:text-white transition">
                    <Icone.Valide className="h-4 w-4" />
                  </span>
                  <div>
                    <h4 className="text-sm font-medium text-encre-900">
                      Vérification & Audit d'intégrité
                    </h4>
                    <p className="text-xs text-ardoise-500">
                      Détection des doublons, conflits et charge horaire
                    </p>
                  </div>
                </div>
                <Icone.ChevronDroite className="h-4 w-4 text-ardoise-400 group-hover:text-isi-bleu transition" />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <Bouton
                  variante="secondaire"
                  taille="sm"
                  icone={Icone.Matieres}
                  onClick={() => naviguer("/admin/matieres")}
                  className="w-full justify-start text-xs"
                >
                  Catalogue Matières
                </Bouton>
                <Bouton
                  variante="secondaire"
                  taille="sm"
                  icone={Icone.Horloge}
                  onClick={() => naviguer("/admin/annees-academiques")}
                  className="w-full justify-start text-xs"
                >
                  Années académiques
                </Bouton>
              </div>
            </div>
          </Carte>

          {/* Carte Pédagogie & Vie scolaire (Assistante Pédagogique) */}
          <Carte
            titre="Pédagogie & Vie scolaire"
            sousTitre="Surveillance du décrochage, alertes et saisie des évaluations"
            icone={Icone.Etudiants}
          >
            <div className="space-y-3 pt-1">
              <div
                onClick={() => naviguer("/admin/etudiants-risque")}
                className="group flex cursor-pointer items-center justify-between rounded-lg border border-ardoise-200/70 p-3.5 transition hover:border-brique-500 hover:bg-brique-50/30"
              >
                <div className="flex items-center gap-3">
                  <span className="grid h-8 w-8 place-items-center rounded-md bg-brique-50 text-brique-600 group-hover:bg-brique-600 group-hover:text-white transition">
                    <Icone.Alerte className="h-4 w-4" />
                  </span>
                  <div>
                    <h4 className="text-sm font-medium text-encre-900">
                      Étudiants à Risque & Suivi ciblé
                    </h4>
                    <p className="text-xs text-ardoise-500">
                      Actions pédagogiques, entretiens et plans d'aide
                    </p>
                  </div>
                </div>
                <Icone.ChevronDroite className="h-4 w-4 text-ardoise-400 group-hover:text-brique-600 transition" />
              </div>

              <div
                onClick={() => naviguer("/admin/alertes")}
                className="group flex cursor-pointer items-center justify-between rounded-lg border border-ardoise-200/70 p-3.5 transition hover:border-isi-bleu hover:bg-ardoise-50/70"
              >
                <div className="flex items-center gap-3">
                  <span className="grid h-8 w-8 place-items-center rounded-md bg-ardoise-100 text-ardoise-700 group-hover:bg-isi-bleu group-hover:text-white transition">
                    <Icone.Prediction className="h-4 w-4" />
                  </span>
                  <div>
                    <h4 className="text-sm font-medium text-encre-900">
                      Alertes & Signalements
                    </h4>
                    <p className="text-xs text-ardoise-500">
                      Traitement des alertes académiques automatiques
                    </p>
                  </div>
                </div>
                <Icone.ChevronDroite className="h-4 w-4 text-ardoise-400 group-hover:text-isi-bleu transition" />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <Bouton
                  variante="secondaire"
                  taille="sm"
                  icone={Icone.Notes}
                  onClick={() => naviguer("/admin/notes")}
                  className="w-full justify-start text-xs"
                >
                  Saisie des Notes
                </Bouton>
                <Bouton
                  variante="secondaire"
                  taille="sm"
                  icone={Icone.Classes}
                  onClick={() => naviguer("/admin/classes")}
                  className="w-full justify-start text-xs"
                >
                  Classes & Effectifs
                </Bouton>
              </div>
            </div>
          </Carte>
        </div>
      </div>

      <Modale
        ouverte={modaleAlertesOuverte}
        onFermer={() => setModaleAlertesOuverte(false)}
        titre="Alertes recentes"
        sousTitre={
          nombreAlertesNouvelles > 0
            ? `${nombreAlertesNouvelles} alerte(s) en attente de traitement`
            : "Aucune alerte en attente"
        }
        taille="md"
        piedDePage={
          <Bouton
            variante="primaire"
            onClick={() => {
              setModaleAlertesOuverte(false);
              naviguer("/admin/alertes");
            }}
          >
            Voir toutes les alertes
          </Bouton>
        }
      >
        {alertes.length === 0 ? (
          <EtatVide
            icone={Icone.Valide}
            titre="Aucune alerte"
            message="Aucun etudiant n'est actuellement signale a risque eleve."
          />
        ) : (
          <ul className="-mx-6 divide-y divide-ardoise-200/70">
            {alertes.map((alerte) => (
              <li key={alerte.id}>
                <button
                  onClick={() => {
                    setModaleAlertesOuverte(false);
                    naviguer(`/admin/etudiants/${alerte.student_id}`);
                  }}
                  className="anneau-focus flex w-full items-center gap-3 px-6 py-3 text-left
                    transition-colors hover:bg-ardoise-50"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brique-50 text-brique-600">
                    <Icone.Alerte className="h-4 w-4" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-encre-900">
                      {alerte.etudiant}
                    </p>
                    <p className="truncate text-xs text-ardoise-500">
                      {alerte.libelle_type ?? "Risque d'echec academique"} ·{" "}
                      {alerte.classe ?? "Sans classe"} ·{" "}
                      {new Date(alerte.date_declenchement).toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </p>
                  </div>

                  <Badge ton={alerte.statut_traitement === "nouvelle" ? "alerte" : "neutre"}>
                    {alerte.statut_traitement === "nouvelle" ? "Nouvelle" : "En cours"}
                  </Badge>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Modale>
    </CoqueApplication>
  );
}

/** Infobulle unifiee pour tous les graphiques Recharts. L'infobulle par
 *  defaut ne respecte ni la typographie ni les couleurs du systeme. */
function InfobulleGraphique({ active, payload, label, suffixe = "" }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-ardoise-200 bg-white px-3 py-2 shadow-elevee">
      {label && (
        <p className="mb-1.5 text-xs font-semibold text-encre-900">{label}</p>
      )}
      {payload.map((element) => (
        <div key={element.name} className="flex items-center gap-2 text-xs">
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: element.color ?? element.payload?.fill }}
          />
          <span className="text-ardoise-600">{element.name}</span>
          <span className="tabulaire ml-auto font-semibold text-encre-900">
            {element.value}
            {suffixe}
          </span>
        </div>
      ))}
    </div>
  );
}
