/**
 * Espace etudiant.
 *
 * Ecran le plus sensible de l'application : c'est ici qu'un etudiant apprend
 * qu'il est identifie comme a risque. Trois principes ont guide sa
 * conception :
 *
 *   1. NE JAMAIS ANNONCER UN VERDICT. Le vocabulaire evite "echec probable"
 *      au profit de "situation qui merite attention". Une prediction est une
 *      alerte destinee a declencher un accompagnement, pas une sentence.
 *
 *   2. TOUJOURS DONNER UNE PRISE. Chaque difficulte signalee est accompagnee
 *      d'une action concrete. Un diagnostic sans levier decourage.
 *
 *   3. AFFICHER L'INCERTITUDE. Quand la confiance est faible, l'etudiant
 *      doit le savoir plutot que de prendre un chiffre pour une verite.
 *
 * Consomme GET /api/student/dashboard et GET /api/student/prediction.
 */
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { navigationEtudiant } from "../../components/navigation.js";
import PanneauPrediction, { CarteRecommandation, LigneFacteur } from "../../components/PredictionPanel.jsx";
import Icone from "../../components/ui/Icons.jsx";
import { Bandeau, Modale } from "../../components/ui/Feedback.jsx";
import {
  Badge,
  BarreProgression,
  Carte,
  CarteStat,
  EtatVide,
  SqueletteCarte,
} from "../../components/ui/Primitives.jsx";
import client from "../../api/client.js";

// Numero du semestre extrait de "S6" -> 6, pour reperer le plus recent sans
// dependre d'un ordre de reception particulier des notes.
const rangSemestre = (semestre) => parseInt(String(semestre ?? "").replace(/\D/g, ""), 10) || 0;

export default function TableauBordEtudiant() {
  const [tableauBord, setTableauBord] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [messagePrediction, setMessagePrediction] = useState("");
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  // Une seule modale a la fois : "notes" | "facteurs" | "recommandations" | null.
  const [modaleOuverte, setModaleOuverte] = useState(null);

  const naviguer = useNavigate();

  const charger = useCallback(async () => {
    try {
      // Les deux appels sont lances en parallele. `allSettled` plutot que
      // `all` : l'absence de prediction (dossier trop pauvre) ne doit pas
      // empecher l'affichage des notes et de l'assiduite.
      const [reponseTableau, reponsePrediction] = await Promise.allSettled([
        client.get("/student/dashboard"),
        client.get("/student/prediction"),
      ]);

      if (reponseTableau.status === "fulfilled") {
        setTableauBord(reponseTableau.value.data);
      } else if (reponseTableau.reason?.response?.status === 403) {
        naviguer("/compte-desactive", { replace: true });
        return;
      } else {
        setErreur("Impossible de charger votre tableau de bord.");
      }

      if (reponsePrediction.status === "fulfilled") {
        setPrediction(reponsePrediction.value.data);
      } else if (reponsePrediction.reason?.response?.status === 422) {
        setMessagePrediction(
          reponsePrediction.reason.response.data?.message ??
            "Votre dossier ne contient pas encore assez de donnees."
        );
      }
    } finally {
      setChargement(false);
    }
  }, [naviguer]);

  useEffect(() => {
    charger();
  }, [charger]);

  const etudiant = tableauBord?.student;
  const notes = tableauBord?.notes ?? [];
  const assiduite = tableauBord?.assiduite ?? [];

  // Moyenne par matiere, calculee cote client a partir des notes deja
  // recues : cela evite un appel supplementaire pour une agregation simple.
  const moyennesParMatiere = Object.entries(
    notes.reduce((accumulateur, note) => {
      (accumulateur[note.matiere] ??= []).push(note.note);
      return accumulateur;
    }, {})
  )
    .map(([matiere, valeurs]) => ({
      matiere,
      moyenne: Number(
        (valeurs.reduce((somme, valeur) => somme + valeur, 0) / valeurs.length).toFixed(2)
      ),
      nombre: valeurs.length,
    }))
    .sort((a, b) => a.moyenne - b.moyenne);

  // "Ma moyenne" doit annoncer clairement sa portee : une moyenne qui
  // fusionnerait plusieurs semestres sans le dire serait a la fois trompeuse
  // et associee a un nombre d'evaluations qui n'a pas de sens pour
  // l'etudiant (ex. "25 evaluations" pour une seule moyenne). On affiche
  // donc la moyenne du semestre le plus recent, semestre precise dans le
  // libelle ; la moyenne toutes periodes confondues reste consultable dans
  // le detail de la prediction.
  const dernierSemestre = notes.reduce(
    (dernier, note) => (rangSemestre(note.semestre) > rangSemestre(dernier) ? note.semestre : dernier),
    null
  );
  const notesDernierSemestre = dernierSemestre
    ? notes.filter((note) => note.semestre === dernierSemestre)
    : [];
  const moyenneSemestre = notesDernierSemestre.length
    ? notesDernierSemestre.reduce((somme, note) => somme + note.note, 0) / notesDernierSemestre.length
    : null;

  const assiduiteMoyenne = assiduite.length
    ? assiduite.reduce((somme, ligne) => somme + ligne.taux_presence, 0) / assiduite.length
    : null;

  return (
    <CoqueApplication
      titre="Mon tableau de bord"
      sousTitre={etudiant ? `${etudiant.prenom} ${etudiant.nom}` : "Espace etudiant"}
      sectionsNavigation={navigationEtudiant()}
    >
      {erreur && (
        <div className="mb-6">
          <Bandeau ton="alerte" titre="Chargement impossible">
            {erreur}
          </Bandeau>
        </div>
      )}

      {/* =============================================== En-tete personnalise */}
      {!chargement && etudiant && (
        <div className="mb-6 overflow-hidden rounded-panel bg-degrade-encre p-6 text-white">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm text-white/65">Bonjour,</p>
              {/* text-white repete explicitement : le style de base (h1/h2/h3)
                  fixe une couleur sombre directement sur la balise et gagne
                  sur l'heritage du div parent (meme cause que sur la page de
                  connexion). */}
              <h2 className="mt-0.5 font-display text-2xl font-semibold text-white">
                {etudiant.prenom} {etudiant.nom}
              </h2>
              <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs text-white/75">
                <span className="rounded-full bg-white/12 px-2.5 py-1">
                  {etudiant.matricule}
                </span>
                {etudiant.classe && (
                  <span className="rounded-full bg-white/12 px-2.5 py-1">
                    {etudiant.classe}
                  </span>
                )}
                {etudiant.filiere && (
                  <span className="rounded-full bg-white/12 px-2.5 py-1">
                    {etudiant.filiere}
                  </span>
                )}
              </div>
            </div>

            <span className="hidden shrink-0 sm:block">
              <Icone.Etablissement className="h-16 w-16 text-white/15" />
            </span>
          </div>
        </div>
      )}

      {/* ==================================================== Indicateurs */}
      <div className="cascade grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {chargement ? (
          Array.from({ length: 4 }).map((_, index) => <SqueletteCarte key={index} />)
        ) : (
          <>
            <CarteStat
              libelle={dernierSemestre ? `Ma moyenne — ${dernierSemestre}` : "Ma moyenne"}
              valeur={moyenneSemestre != null ? moyenneSemestre.toFixed(2) : "—"}
              unite={moyenneSemestre != null ? "/ 20" : undefined}
              icone={Icone.Notes}
              ton={
                moyenneSemestre == null
                  ? "neutre"
                  : moyenneSemestre >= 12
                  ? "succes"
                  : moyenneSemestre >= 10
                  ? "vigilance"
                  : "alerte"
              }
              legende={
                notesDernierSemestre.length
                  ? `${notesDernierSemestre.length} evaluation(s) ce semestre`
                  : "Aucune note ce semestre"
              }
            />
            <CarteStat
              libelle="Mon assiduite"
              valeur={assiduiteMoyenne != null ? assiduiteMoyenne.toFixed(1) : "—"}
              unite={assiduiteMoyenne != null ? "%" : undefined}
              icone={Icone.Presence}
              ton={
                assiduiteMoyenne == null
                  ? "neutre"
                  : assiduiteMoyenne >= 75
                  ? "succes"
                  : assiduiteMoyenne >= 60
                  ? "vigilance"
                  : "alerte"
              }
              legende="Taux de presence moyen"
            />
            <CarteStat
              libelle="Matieres suivies"
              valeur={moyennesParMatiere.length}
              icone={Icone.Matieres}
              ton="info"
              legende="Avec au moins une note"
            />
            <CarteStat
              libelle="Score de reussite"
              valeur={prediction ? Math.round(prediction.score_reussite) : "—"}
              unite={prediction ? "%" : undefined}
              icone={Icone.Prediction}
              ton={
                !prediction
                  ? "neutre"
                  : prediction.niveau_risque === "faible"
                  ? "succes"
                  : prediction.niveau_risque === "moyen"
                  ? "vigilance"
                  : "alerte"
              }
              legende={prediction ? "Estimation du modele" : "Pas encore calcule"}
            />
          </>
        )}
      </div>

      {/* ==================================================== Acces rapide */}
      {!chargement && (
        <div className="mt-6">
          <h2 className="mb-3 font-display text-base font-semibold text-encre-900">
            Acces rapide
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            <TuileAccesRapide
              icone={Icone.Notes}
              libelle="Mes notes"
              sousLibelle={`${notes.length} evaluation(s)`}
              classeCouleur="bg-indigo-600"
              onClick={() => setModaleOuverte("notes")}
            />
            <TuileAccesRapide
              icone={Icone.Presence}
              libelle="Mes rattrapages"
              sousLibelle="Demandes & séances"
              classeCouleur="bg-sauge-600"
              onClick={() => naviguer("/etudiant/rattrapages")}
            />
            <TuileAccesRapide
              icone={Icone.Boussole}
              libelle="Facteurs clés"
              sousLibelle={
                prediction?.explication?.contributions?.length
                  ? `${prediction.explication.contributions.length} facteur(s)`
                  : "Pas encore disponible"
              }
              classeCouleur="bg-violet-500"
              onClick={() => setModaleOuverte("facteurs")}
              desactivee={!prediction?.explication?.contributions?.length}
            />
            <TuileAccesRapide
              icone={Icone.Ampoule}
              libelle="Conseils & Plan"
              sousLibelle={
                prediction?.recommandations?.length
                  ? `${prediction.recommandations.length} action(s)`
                  : "Pas encore disponible"
              }
              classeCouleur="bg-ambre-500"
              onClick={() => setModaleOuverte("recommandations")}
              desactivee={!prediction?.recommandations?.length}
            />
          </div>
        </div>
      )}

      {/* ================================================= Ma prediction */}
      <div className="mt-6">
        {chargement ? (
          <div className="squelette h-72 rounded-card" />
        ) : prediction ? (
          <PanneauPrediction
            prediction={prediction}
            public
            afficherExplication={false}
            afficherRecommandations={false}
          />
        ) : (
          <Carte titre="Ma prediction" icone={Icone.Prediction}>
            <EtatVide
              icone={Icone.Horloge}
              titre="Prediction pas encore disponible"
              message={
                messagePrediction ||
                "Votre prediction sera calculee des que vos enseignants auront saisi des notes et des appels de presence."
              }
            />
          </Carte>
        )}
      </div>

      {/* ============================================ Moyennes par matiere */}
      <div className="mt-5 grid gap-5 lg:grid-cols-5">
        <Carte
          titre="Mes moyennes par matiere"
          sousTitre="Classees de la plus faible a la plus elevee"
          icone={Icone.Matieres}
          className="lg:col-span-3"
        >
          {chargement ? (
            <div className="squelette h-[280px] rounded-lg" />
          ) : moyennesParMatiere.length === 0 ? (
            <EtatVide
              icone={Icone.Notes}
              titre="Aucune note enregistree"
              message="Vos notes apparaitront ici des leur saisie par vos enseignants."
            />
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(240, moyennesParMatiere.length * 42)}>
              <BarChart
                data={moyennesParMatiere}
                layout="vertical"
                margin={{ top: 4, right: 28, left: 4, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E1E6EE" horizontal={false} />
                <XAxis
                  type="number"
                  domain={[0, 20]}
                  tick={{ fontSize: 11, fill: "#6E7B92" }}
                  axisLine={{ stroke: "#E1E6EE" }}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="matiere"
                  width={130}
                  tick={{ fontSize: 11, fill: "#525E73" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<InfobulleMatiere />} cursor={{ fill: "#EEF1F6" }} />
                <Bar dataKey="moyenne" radius={[0, 5, 5, 0]} maxBarSize={22}>
                  {moyennesParMatiere.map((element) => (
                    <Cell
                      key={element.matiere}
                      fill={
                        element.moyenne >= 12
                          ? "#4C7A64"
                          : element.moyenne >= 10
                          ? "#D98E3F"
                          : "#A83E32"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Carte>

        {/* Assiduite par semestre */}
        <Carte
          titre="Mon assiduite"
          sousTitre="Taux de presence par semestre"
          icone={Icone.Presence}
          className="lg:col-span-2"
        >
          {chargement ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="squelette h-12 rounded-lg" />
              ))}
            </div>
          ) : assiduite.length === 0 ? (
            <EtatVide
              icone={Icone.Presence}
              titre="Aucun appel enregistre"
              message="Votre taux de presence apparaitra une fois les appels effectues."
            />
          ) : (
            <>
              <div className="space-y-4">
                {assiduite.map((ligne) => (
                  <BarreProgression
                    key={ligne.semestre}
                    libelle={`Semestre ${ligne.semestre.replace("S", "")}`}
                    valeur={ligne.taux_presence}
                  />
                ))}
              </div>

              {assiduiteMoyenne != null && assiduiteMoyenne < 60 && (
                <div className="mt-5">
                  <Bandeau ton="alerte" titre="Assiduite insuffisante">
                    En dessous de 60 % de presence, la validation de l'annee est compromise
                    independamment de vos notes. Rapprochez-vous de votre responsable
                    pedagogique.
                  </Bandeau>
                </div>
              )}
            </>
          )}
        </Carte>
      </div>

      {/* Rappel sur la portee de la prediction. L'etudiant doit comprendre
          qu'il s'agit d'une estimation destinee a declencher un
          accompagnement, et non d'une decision de jury. */}
      {!chargement && prediction && (
        <div className="mt-5">
          <Bandeau ton="info" titre="Comment lire cette estimation">
            Ce resultat est calcule automatiquement a partir de vos notes et de votre
            assiduite. Il ne constitue en aucun cas une decision de l'etablissement ni un
            resultat definitif : son seul objectif est de vous permettre, ainsi qu'a vos
            enseignants, d'agir suffisamment tot. Une situation signalee comme fragile peut
            se redresser.
          </Bandeau>
        </div>
      )}

      {/* ============================================ Modale : Mes notes */}
      <Modale
        ouverte={modaleOuverte === "notes"}
        onFermer={() => setModaleOuverte(null)}
        titre="Detail de mes notes"
        sousTitre={`${notes.length} evaluation(s) enregistree(s)`}
        taille="lg"
      >
        {notes.length === 0 ? (
          <EtatVide icone={Icone.Notes} titre="Aucune note" />
        ) : (
          <div className="defilement-fin -mx-6 overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-ardoise-200 bg-ardoise-50/60">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ardoise-600">
                    Matiere
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ardoise-600">
                    Semestre
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ardoise-600">
                    Type
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-ardoise-600">
                    Note
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-ardoise-200/70">
                {notes.map((note) => (
                  <tr key={note.id} className="transition-colors hover:bg-ardoise-50/60">
                    <td className="px-6 py-3 font-medium text-encre-900">{note.matiere}</td>
                    <td className="px-4 py-3 text-ardoise-600">{note.semestre}</td>
                    <td className="px-4 py-3">
                      <Badge ton="neutre">
                        {note.type_evaluation === "devoir" ? "Devoir" : "Examen"}
                      </Badge>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <span
                        className={`tabulaire font-semibold ${
                          note.note >= 12
                            ? "text-sauge-600"
                            : note.note >= 10
                            ? "text-ambre-600"
                            : "text-brique-600"
                        }`}
                      >
                        {note.note.toFixed(2)}
                      </span>
                      <span className="text-xs text-ardoise-400"> / 20</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modale>

      {/* ================================== Modale : Facteurs determinants */}
      <Modale
        ouverte={modaleOuverte === "facteurs"}
        onFermer={() => setModaleOuverte(null)}
        titre="Ce qui influence mon resultat"
        sousTitre="Impact de chaque variable sur le score, toutes choses egales par ailleurs"
        taille="lg"
      >
        {prediction?.explication?.contributions?.length ? (
          <>
            <ul className="space-y-3.5">
              {prediction.explication.contributions.map((facteur) => (
                <LigneFacteur key={facteur.variable} facteur={facteur} />
              ))}
            </ul>
            <p className="mt-5 border-t border-ardoise-200 pt-4 text-xs leading-relaxed text-ardoise-500">
              Lecture : chaque barre indique de combien le score changerait si cette seule
              variable etait ramenee a celle d'un etudiant moyen de l'etablissement. Une barre
              vers la droite signifie que la variable soutient la reussite.
            </p>
          </>
        ) : (
          <EtatVide icone={Icone.Boussole} titre="Pas encore disponible" />
        )}
      </Modale>

      {/* ============================== Modale : Plan d'accompagnement */}
      <Modale
        ouverte={modaleOuverte === "recommandations"}
        onFermer={() => setModaleOuverte(null)}
        titre="Ce que je peux faire"
        sousTitre={
          prediction?.recommandations?.length
            ? `${prediction.recommandations.length} action(s) suggeree(s)`
            : undefined
        }
        taille="lg"
      >
        {prediction?.recommandations?.length ? (
          <ul className="space-y-3">
            {prediction.recommandations.map((recommandation, index) => (
              <CarteRecommandation
                key={`${recommandation.titre}-${index}`}
                recommandation={recommandation}
                modePublic
              />
            ))}
          </ul>
        ) : (
          <EtatVide icone={Icone.Ampoule} titre="Pas encore disponible" />
        )}
      </Modale>
    </CoqueApplication>
  );
}

/** Tuile coloree d'acces rapide vers le detail d'une rubrique (ouvre une
 *  modale) : evite d'empiler des cartes longues sur le tableau de bord tout
 *  en gardant l'information a un clic. */
function TuileAccesRapide({ icone: IconeTuile, libelle, sousLibelle, classeCouleur, onClick, desactivee }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={desactivee}
      className="anneau-focus group flex flex-col items-center gap-2.5 rounded-2xl border
        border-ardoise-200 bg-white p-5 text-center shadow-subtile transition-all duration-200
        ease-douce hover:-translate-y-0.5 hover:shadow-card disabled:cursor-not-allowed
        disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-subtile"
    >
      <span
        className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-white shadow-subtile
          transition-transform duration-200 ease-douce group-hover:scale-105 ${classeCouleur}`}
      >
        <IconeTuile className="h-6 w-6" />
      </span>
      <span className="text-sm font-semibold leading-tight text-encre-900">{libelle}</span>
      {sousLibelle && <span className="text-xs text-ardoise-500">{sousLibelle}</span>}
    </button>
  );
}

function InfobulleMatiere({ active, payload }) {
  if (!active || !payload?.length) return null;
  const element = payload[0].payload;

  return (
    <div className="rounded-lg border border-ardoise-200 bg-white px-3 py-2 shadow-elevee">
      <p className="text-xs font-semibold text-encre-900">{element.matiere}</p>
      <p className="tabulaire mt-1 text-xs text-ardoise-600">
        Moyenne : <span className="font-semibold text-encre-900">{element.moyenne} / 20</span>
      </p>
      <p className="text-xs text-ardoise-500">{element.nombre} evaluation(s)</p>
    </div>
  );
}
