/**
 * Tableau de bord enseignant.
 *
 * L'ancienne version se limitait a une grille de cartes de classes avec deux
 * boutons. Un enseignant qui se connecte a besoin de savoir immediatement :
 * combien d'etudiants il suit, lesquels decrochent, et ou en est chacune de
 * ses classes.
 *
 * Consomme GET /api/teacher/dashboard.
 */
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import CoqueApplication from "../../components/AppShell.jsx";
import { navigationEnseignant } from "../../components/navigation.js";
import Icone from "../../components/ui/Icons.jsx";
import TableauDonnees, { CelluleIdentite } from "../../components/ui/DataTable.jsx";
import { Bandeau } from "../../components/ui/Feedback.jsx";
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

export default function TableauBordEnseignant() {
  const [donnees, setDonnees] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const naviguer = useNavigate();

  const charger = useCallback(async () => {
    try {
      const { data } = await client.get("/teacher/dashboard");
      setDonnees(data);
      setErreur("");
    } catch (exception) {
      if (exception.response?.status === 403) {
        naviguer("/compte-desactive", { replace: true });
        return;
      }
      setErreur("Impossible de charger votre tableau de bord.");
    } finally {
      setChargement(false);
    }
  }, [naviguer]);

  useEffect(() => {
    charger();
  }, [charger]);

  const statistiques = donnees?.statistiques ?? {};
  const repartition = donnees?.repartition_risque ?? {};
  const affectations = donnees?.affectations ?? [];
  const etudiantsASuivre = donnees?.etudiants_a_suivre ?? [];

  const donneesCamembert = Object.entries(repartition)
    .filter(([, valeur]) => valeur > 0)
    .map(([niveau, valeur]) => ({
      niveau,
      libelle: LIBELLES_RISQUE[niveau] ?? niveau,
      valeur,
    }));

  const prenom = donnees?.enseignant?.prenom ?? "";

  // Les raccourcis d'en-tete ne peuvent pas deviner quelle classe/matiere
  // l'enseignant vise : avec une seule affectation on y va directement,
  // sinon on renvoie vers la liste des affectations pour qu'il choisisse
  // (naviguer vers /enseignant/appel sans parametres provoque l'erreur
  // "Classe ou matiere manquante").
  const irVersAppelOuNotes = (chemin) => {
    if (affectations.length === 1) {
      const a = affectations[0];
      naviguer(`${chemin}?classe=${a.classe_id}&matiere=${encodeURIComponent(a.matiere)}&niveau=${a.niveau}`);
      return;
    }
    document.getElementById("mes-classes")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <CoqueApplication
      titre="Tableau de bord"
      sousTitre={prenom ? `Bonjour ${prenom}` : "Espace enseignant"}
      sectionsNavigation={navigationEnseignant({
        alertes: statistiques.etudiants_a_risque,
      })}
      actions={
        <>
          <Bouton
            variante="secondaire"
            taille="sm"
            icone={Icone.Presence}
            onClick={() => irVersAppelOuNotes("/enseignant/appel")}
          >
            <span className="hidden sm:inline">Faire l'appel</span>
          </Bouton>
          <Bouton
            variante="primaire"
            taille="sm"
            icone={Icone.Notes}
            onClick={() => irVersAppelOuNotes("/enseignant/notes")}
          >
            <span className="hidden sm:inline">Saisir des notes</span>
          </Bouton>
        </>
      }
    >
      {erreur && (
        <div className="mb-6">
          <Bandeau ton="alerte" titre="Chargement impossible">
            {erreur}
          </Bandeau>
        </div>
      )}

      {/* ================================================ Indicateurs cles */}
      <div className="cascade grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {chargement ? (
          Array.from({ length: 4 }).map((_, index) => <SqueletteCarte key={index} />)
        ) : (
          <>
            <CarteStat
              variante="sombre"
              libelle="Etudiants suivis"
              valeur={statistiques.total_etudiants ?? 0}
              icone={Icone.Etudiants}
              legende={`Reparties sur ${statistiques.total_classes ?? 0} classe(s)`}
            />
            <CarteStat
              variante="sombre"
              libelle="A risque"
              valeur={statistiques.etudiants_a_risque ?? 0}
              icone={Icone.Alerte}
              legende={
                statistiques.total_etudiants
                  ? `${Math.round(
                      ((statistiques.etudiants_a_risque ?? 0) /
                        statistiques.total_etudiants) *
                        100
                    )}% de vos effectifs`
                  : "Aucune donnee"
              }
            />
            <CarteStat
              variante="sombre"
              libelle="Classes"
              valeur={statistiques.total_classes ?? 0}
              icone={Icone.Classes}
              legende="Classes affectees"
            />
            <CarteStat
              variante="sombre"
              libelle="Matieres"
              valeur={statistiques.total_matieres ?? 0}
              icone={Icone.Matieres}
              legende="Matieres enseignees"
            />
          </>
        )}
      </div>

      {!chargement && statistiques.etudiants_a_risque > 0 && (
        <div className="mt-6">
          <Bandeau
            ton="vigilance"
            titre={`${statistiques.etudiants_a_risque} etudiant(s) en difficulte dans vos classes`}
          >
            Consultez la liste ci-dessous pour identifier les situations prioritaires et les
            actions proposees.
          </Bandeau>
        </div>
      )}

      {/* ==================================== Repartition de vos etudiants */}
      <div className="mt-6">
        <Carte
          titre="Repartition de vos etudiants"
          sousTitre="Selon leur derniere prediction"
          icone={Icone.Cible}
        >
          {chargement ? (
            <div className="squelette h-[240px] rounded-lg" />
          ) : donneesCamembert.length === 0 ? (
            <EtatVide
              icone={Icone.Prediction}
              titre="Aucune prediction"
              message="Saisissez des notes et des appels pour generer les predictions."
            />
          ) : (
            <div className="grid items-center gap-6 md:grid-cols-[minmax(0,280px),1fr]">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={donneesCamembert}
                    dataKey="valeur"
                    nameKey="libelle"
                    cx="50%"
                    cy="50%"
                    innerRadius={58}
                    outerRadius={90}
                    paddingAngle={2}
                    strokeWidth={0}
                  >
                    {donneesCamembert.map((element) => (
                      <Cell
                        key={element.niveau}
                        fill={COULEURS_RISQUE[element.niveau] ?? COULEURS_RISQUE.inconnu}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<InfobulleSimple suffixe=" etudiant(s)" />} />
                </PieChart>
              </ResponsiveContainer>

              <ul className="grid gap-2.5 sm:grid-cols-2">
                {donneesCamembert.map((element) => (
                  <li
                    key={element.niveau}
                    className="flex items-center gap-2.5 rounded-lg border border-ardoise-200/70 px-3.5 py-2.5 text-sm"
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{
                        backgroundColor:
                          COULEURS_RISQUE[element.niveau] ?? COULEURS_RISQUE.inconnu,
                      }}
                    />
                    <span className="flex-1 text-ardoise-600">{element.libelle}</span>
                    <span className="tabulaire font-semibold text-encre-900">
                      {element.valeur}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Carte>
      </div>

      {/* ==================================================== Mes classes */}
      <div id="mes-classes" className="mt-6 scroll-mt-24">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-encre-900">
              Mes classes et matieres
            </h2>
            <p className="text-sm text-ardoise-500">Acces rapide a l'appel et a la saisie des notes</p>
          </div>
        </div>

        {chargement ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="squelette h-40 rounded-card" />
            ))}
          </div>
        ) : affectations.length === 0 ? (
          <Carte>
            <EtatVide
              icone={Icone.Classes}
              titre="Aucune affectation"
              message="Aucune classe ne vous est affectee. Rapprochez-vous de l'administration."
            />
          </Carte>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {affectations.map((affectation) => (
              <div
                key={affectation.id}
                className="group flex flex-col rounded-2xl border border-ardoise-200 bg-white p-5
                  shadow-subtile transition-all duration-300 ease-douce hover:-translate-y-1
                  hover:border-indigo-300 hover:shadow-elevee"
              >
                <div className="flex items-start justify-between gap-3">
                  <span
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-indigo-50
                      text-indigo-trajectoire transition-all duration-300 ease-douce
                      group-hover:scale-110 group-hover:bg-indigo-trajectoire group-hover:text-white"
                  >
                    <Icone.Matieres className="h-5 w-5" />
                  </span>
                  {affectation.etudiants_a_risque > 0 && (
                    <Badge ton="alerte" pastille>
                      {affectation.etudiants_a_risque} a risque
                    </Badge>
                  )}
                </div>

                <h3 className="mt-3.5 truncate font-display text-base font-semibold text-encre-900">
                  {affectation.matiere}
                </h3>
                <p className="mt-1 truncate text-sm text-ardoise-600">
                  {affectation.classe} · {affectation.niveau}
                </p>
                <p className="mt-0.5 text-xs text-ardoise-400">
                  {affectation.effectif} etudiant(s)
                </p>

                <div className="mt-4 flex gap-2 border-t border-ardoise-100 pt-4">
                  <Link
                    to={`/enseignant/appel?classe=${affectation.classe_id}&matiere=${encodeURIComponent(
                      affectation.matiere
                    )}&niveau=${affectation.niveau}`}
                    className="flex-1"
                  >
                    <Bouton variante="secondaire" taille="sm" icone={Icone.Presence} className="w-full">
                      Appel
                    </Bouton>
                  </Link>
                  <Link
                    to={`/enseignant/notes?classe=${affectation.classe_id}&matiere=${encodeURIComponent(
                      affectation.matiere
                    )}&niveau=${affectation.niveau}`}
                    className="flex-1"
                  >
                    <Bouton variante="secondaire" taille="sm" icone={Icone.Notes} className="w-full">
                      Notes
                    </Bouton>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ============================================ Etudiants a accompagner */}
      <div className="mt-6">
        <div className="mb-3">
          <h2 className="font-display text-lg font-semibold text-encre-900">
            Etudiants a accompagner
          </h2>
          <p className="text-sm text-ardoise-500">
            Classes du plus fragile au moins fragile. Cliquez pour consulter le detail et les
            actions proposees.
          </p>
        </div>

        <TableauDonnees
          chargement={chargement}
          lignes={etudiantsASuivre}
          cleLigne={(ligne) => ligne.id}
          onClicLigne={(ligne) => naviguer(`/enseignant/etudiants/${ligne.id}`)}
          placeholderRecherche="Rechercher un etudiant..."
          parPageDefaut={10}
          titreVide="Aucun etudiant en difficulte"
          messageVide="Aucun de vos etudiants ne presente actuellement de risque eleve ou modere."
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
                <span className="text-ardoise-600">{ligne.classe ?? "—"}</span>
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
              largeur: "150px",
              rendu: (ligne) =>
                ligne.taux_assiduite != null ? (
                  <BarreProgression valeur={ligne.taux_assiduite} />
                ) : (
                  "—"
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
    </CoqueApplication>
  );
}

function InfobulleSimple({ active, payload, suffixe = "" }) {
  if (!active || !payload?.length) return null;
  const element = payload[0];

  return (
    <div className="rounded-lg border border-ardoise-200 bg-white px-3 py-2 shadow-elevee">
      <div className="flex items-center gap-2 text-xs">
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: element.payload?.fill ?? element.color }}
        />
        <span className="text-ardoise-600">{element.name}</span>
        <span className="tabulaire ml-auto font-semibold text-encre-900">
          {element.value}
          {suffixe}
        </span>
      </div>
    </div>
  );
}
