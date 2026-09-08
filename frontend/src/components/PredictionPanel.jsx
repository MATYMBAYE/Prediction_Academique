/**
 * Panneau de prediction.
 *
 * Composant central du memoire : c'est ici que le resultat du modele devient
 * lisible pour un humain. Partage entre la fiche administrateur, la vue
 * enseignant et l'espace etudiant, avec un mode `public` qui adoucit le
 * vocabulaire quand l'etudiant est le lecteur.
 *
 * Quatre blocs, dans l'ordre de lecture :
 *   1. Scores        reussite, risque, confiance
 *   2. Explication   quels facteurs pesent, et dans quel sens
 *   3. Recommandations
 *   4. Historique    evolution de la prediction dans le temps
 */
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import Icone from "./ui/Icons.jsx";
import {
  AnneauProgression,
  Badge,
  BadgeConfiance,
  BadgeRisque,
  Carte,
  EtatVide,
  LigneInfo,
} from "./ui/Primitives.jsx";
import { Bandeau } from "./ui/Feedback.jsx";

const TONS_PAR_RISQUE = {
  faible: "succes",
  moyen: "vigilance",
  eleve: "alerte",
};

const PRIORITES = {
  1: { libelle: "Urgent", ton: "alerte", delai: "sous 48 h" },
  2: { libelle: "Important", ton: "vigilance", delai: "sous 2 semaines" },
  3: { libelle: "Preventif", ton: "info", delai: "a surveiller" },
};

export default function PanneauPrediction({
  prediction,
  public: modePublic = false,
  afficherExplication = true,
  afficherRecommandations = true,
}) {
  if (!prediction) return null;

  const {
    score_reussite: scoreReussite,
    score_risque: scoreRisque,
    niveau_risque: niveauRisque,
    confiance,
    explication,
    recommandations = [],
    variables = {},
    contexte = {},
    modele = {},
    positionnement,
  } = prediction;

  const ton = TONS_PAR_RISQUE[niveauRisque] ?? "neutre";
  const historique = contexte.historique_predictions ?? [];

  return (
    <div className="space-y-5">
      {/* ============================================================ Scores */}
      <Carte
        titre={modePublic ? "Ou en suis-je ?" : "Resultat de la prediction"}
        sousTitre={
          modele.date_entrainement
            ? `Modele ${modele.algorithme ?? ""} — derniere mise a jour du calcul`
            : undefined
        }
        icone={Icone.Prediction}
      >
        <div className="grid gap-6 md:grid-cols-[auto,1fr] md:items-center">
          <div className="flex justify-center">
            <AnneauProgression
              valeur={scoreReussite}
              ton={ton}
              taille={156}
              epaisseur={12}
              libelle="Reussite"
            />
          </div>

          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <BadgeRisque niveau={niveauRisque} />
              <BadgeConfiance niveau={confiance?.niveau} indice={confiance?.indice} />
              {positionnement?.percentile_estime != null && !modePublic && (
                <Badge ton="neutre">
                  {positionnement.percentile_estime}e percentile de la promotion
                </Badge>
              )}
            </div>

            {explication?.synthese && (
              <p className="text-sm leading-relaxed text-ardoise-700">
                {explication.synthese}
              </p>
            )}

            <dl className="grid gap-x-6 sm:grid-cols-2">
              <LigneInfo
                libelle="Score de reussite"
                valeur={<span className="tabulaire">{scoreReussite}%</span>}
              />
              <LigneInfo
                libelle="Score de risque"
                valeur={<span className="tabulaire">{scoreRisque}%</span>}
              />
              <LigneInfo
                libelle="Moyenne generale"
                valeur={
                  <span className="tabulaire">
                    {variables.moyenne_generale?.toFixed(2)} / 20
                  </span>
                }
              />
              <LigneInfo
                libelle="Taux d'assiduite"
                valeur={
                  <span className="tabulaire">{variables.taux_assiduite?.toFixed(1)}%</span>
                }
              />
            </dl>
          </div>
        </div>

        {/* Avertissement quand la prediction est peu fiable. Il serait
            malhonnete d'afficher un chiffre precis sans signaler qu'il
            repose sur trop peu de donnees. */}
        {confiance && confiance.niveau !== "elevee" && (
          <div className="mt-5">
            <Bandeau
              ton={confiance.niveau === "faible" ? "alerte" : "vigilance"}
              titre={`Indice de confiance : ${confiance.indice}%`}
            >
              <p>{confiance.message}</p>
              {confiance.facteurs?.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {confiance.facteurs.map((facteur) => (
                    <li key={facteur} className="flex items-start gap-1.5 text-xs">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-current opacity-60" />
                      {facteur}
                    </li>
                  ))}
                </ul>
              )}
            </Bandeau>
          </div>
        )}
      </Carte>

      {/* ======================================================= Explication */}
      {afficherExplication && explication?.contributions?.length > 0 && (
        <Carte
          titre={modePublic ? "Ce qui influence mon resultat" : "Facteurs determinants"}
          sousTitre="Impact de chaque variable sur le score, toutes choses egales par ailleurs"
          icone={Icone.Boussole}
        >
          <ul className="space-y-3.5">
            {explication.contributions.map((facteur) => (
              <LigneFacteur key={facteur.variable} facteur={facteur} />
            ))}
          </ul>

          <p className="mt-5 border-t border-ardoise-200 pt-4 text-xs leading-relaxed text-ardoise-500">
            Lecture : chaque barre indique de combien le score changerait si cette seule
            variable etait ramenee a celle d'un etudiant moyen de l'etablissement. Une barre
            vers la droite signifie que la variable soutient la reussite.
          </p>
        </Carte>
      )}

      {/* ==================================================== Recommandations */}
      {afficherRecommandations && recommandations.length > 0 && (
        <Carte
          titre={modePublic ? "Ce que je peux faire" : "Plan d'accompagnement propose"}
          sousTitre={`${recommandations.length} action(s) suggeree(s)`}
          icone={Icone.Ampoule}
        >
          <ul className="space-y-3">
            {recommandations.map((recommandation, index) => (
              <CarteRecommandation
                key={`${recommandation.titre}-${index}`}
                recommandation={recommandation}
                modePublic={modePublic}
              />
            ))}
          </ul>
        </Carte>
      )}

      {/* ========================================== Matieres en difficulte */}
      {contexte.matieres_en_difficulte?.length > 0 && (
        <Carte
          titre="Matieres sous la moyenne"
          sousTitre="Moyenne inferieure a 10 / 20"
          icone={Icone.Matieres}
        >
          <ul className="space-y-2.5">
            {contexte.matieres_en_difficulte.map((matiere) => (
              <li
                key={matiere.matiere}
                className="flex items-center gap-3 rounded-lg border border-ardoise-200 px-3.5 py-2.5"
              >
                <span
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-xs font-semibold
                    ${
                      matiere.moyenne < 7
                        ? "bg-brique-50 text-brique-700"
                        : "bg-ambre-50 text-ambre-700"
                    }`}
                >
                  <Icone.Notes className="h-4 w-4" />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-encre-900">
                    {matiere.matiere}
                  </p>
                  <p className="text-xs text-ardoise-500">
                    {matiere.nb_notes} evaluation(s)
                  </p>
                </div>

                <span
                  className={`tabulaire text-sm font-semibold
                    ${matiere.moyenne < 7 ? "text-brique-600" : "text-ambre-600"}`}
                >
                  {matiere.moyenne.toFixed(2)} / 20
                </span>
              </li>
            ))}
          </ul>
        </Carte>
      )}

      {/* ========================================================= Historique */}
      <Carte
        titre="Evolution de la prediction"
        sousTitre="Chaque point correspond a un recalcul apres une nouvelle note ou un appel"
        icone={Icone.Horloge}
      >
        {historique.length < 2 ? (
          <EtatVide
            icone={Icone.Horloge}
            titre="Historique insuffisant"
            message="La courbe apparaitra des que plusieurs predictions successives auront ete enregistrees."
          />
        ) : (
          <ResponsiveContainer width="100%" height={230}>
            <AreaChart
              data={historique.map((point) => ({
                ...point,
                date_courte: point.date
                  ? new Date(point.date).toLocaleDateString("fr-FR", {
                      day: "2-digit",
                      month: "short",
                    })
                  : "",
              }))}
              margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="degradeScore" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3D5A99" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="#3D5A99" stopOpacity={0.02} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#E1E6EE" vertical={false} />
              <XAxis
                dataKey="date_courte"
                tick={{ fontSize: 11, fill: "#6E7B92" }}
                axisLine={{ stroke: "#E1E6EE" }}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: "#6E7B92" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(valeur) => `${valeur}%`}
              />
              <Tooltip content={<InfobulleHistorique />} />
              <Area
                type="monotone"
                dataKey="score"
                name="Score de reussite"
                stroke="#3D5A99"
                strokeWidth={2.5}
                fill="url(#degradeScore)"
                dot={{ r: 3, strokeWidth: 0, fill: "#3D5A99" }}
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Carte>
    </div>
  );
}

/* ==========================================================================
   LIGNE DE FACTEUR
   ========================================================================== */

/**
 * Barre divergente centree : la moitie gauche represente un effet negatif,
 * la moitie droite un effet positif. Plus lisible qu'une barre classique
 * pour comparer des contributions de signes opposes.
 */
export function LigneFacteur({ facteur }) {
  const impact = facteur.impact_points ?? 0;
  const positif = impact > 0;

  // 30 points d'impact occupent toute la demi-largeur : au-dela, la barre
  // sature plutot que d'ecraser visuellement toutes les autres.
  const largeur = Math.min(50, (Math.abs(impact) / 30) * 50);

  return (
    <li>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium text-encre-900">{facteur.libelle}</span>
        <span
          className={`tabulaire shrink-0 text-xs font-semibold
            ${positif ? "text-sauge-600" : "text-brique-600"}`}
        >
          {positif ? "+" : ""}
          {impact.toFixed(1)} pts
        </span>
      </div>

      {/* Barre divergente */}
      <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-ardoise-200/70">
        <div className="absolute left-1/2 top-0 h-full w-px bg-ardoise-400/70" />
        <div
          className={`absolute top-0 h-full transition-[width] duration-700 ease-douce
            ${positif ? "left-1/2 rounded-r-full bg-sauge-500" : "rounded-l-full bg-brique-500"}`}
          style={
            positif
              ? { width: `${largeur}%` }
              : { width: `${largeur}%`, right: "50%" }
          }
        />
      </div>

      <p className="mt-1.5 text-xs leading-relaxed text-ardoise-600">{facteur.texte}</p>
    </li>
  );
}

/* ==========================================================================
   CARTE DE RECOMMANDATION
   ========================================================================== */

export function CarteRecommandation({ recommandation, modePublic }) {
  const priorite = PRIORITES[recommandation.priorite] ?? PRIORITES[3];

  const bordures = {
    alerte: "border-l-brique-500",
    vigilance: "border-l-ambre-500",
    info: "border-l-indigo-500",
  };

  return (
    <li
      className={`rounded-lg border border-ardoise-200 border-l-4 bg-white p-4
        ${bordures[priorite.ton]}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h4 className="text-sm font-semibold text-encre-900">{recommandation.titre}</h4>
        <div className="flex shrink-0 items-center gap-1.5">
          <Badge ton={priorite.ton}>{priorite.libelle}</Badge>
          {!modePublic && <Badge ton="neutre">{recommandation.categorie}</Badge>}
        </div>
      </div>

      <p className="mt-2 text-sm leading-relaxed text-ardoise-700">
        {recommandation.description}
      </p>

      {/* Le declencheur rend la recommandation contestable, donc utile :
          l'equipe pedagogique voit sur quel critere elle repose. */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-ardoise-200 pt-2.5 text-xs text-ardoise-500">
        <span className="inline-flex items-center gap-1.5">
          <Icone.Cible className="h-3.5 w-3.5" />
          {recommandation.declencheur}
        </span>
        {!modePublic && recommandation.acteur && (
          <span className="inline-flex items-center gap-1.5">
            <Icone.Enseignants className="h-3.5 w-3.5" />
            {recommandation.acteur}
          </span>
        )}
        <span className="inline-flex items-center gap-1.5">
          <Icone.Horloge className="h-3.5 w-3.5" />
          {priorite.delai}
        </span>
      </div>
    </li>
  );
}

function InfobulleHistorique({ active, payload }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;

  const libelles = {
    faible: "Risque faible",
    moyen: "Risque modere",
    eleve: "Risque eleve",
  };

  return (
    <div className="rounded-lg border border-ardoise-200 bg-white px-3 py-2 shadow-elevee">
      <p className="text-xs font-semibold text-encre-900">
        {point.date
          ? new Date(point.date).toLocaleDateString("fr-FR", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })
          : ""}
      </p>
      <p className="tabulaire mt-1 text-xs text-ardoise-600">
        Score de reussite :{" "}
        <span className="font-semibold text-encre-900">{point.score}%</span>
      </p>
      <p className="mt-0.5 text-xs text-ardoise-600">
        {libelles[point.niveau_risque] ?? point.niveau_risque}
        {point.semestre ? ` · ${point.semestre}` : ""}
      </p>
    </div>
  );
}
