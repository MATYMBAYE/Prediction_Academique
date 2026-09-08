/**
 * Ecran de selection classe -> matiere, affiche quand l'enseignant accede a
 * l'appel de presence ou a la saisie des notes depuis la barre laterale
 * (donc sans classe/matiere deja choisie dans l'URL). Remplace l'ancien
 * message d'erreur "Classe ou matiere manquante" par un parcours guide.
 *
 * Consomme GET /api/teacher/me/classes.
 */
import { useEffect, useState } from "react";
import Icone from "../ui/Icons.jsx";
import { Carte, EtatVide, Squelette } from "../ui/Primitives.jsx";
import client from "../../api/client.js";

export default function SelecteurClasseMatiere({ titre, onSelectionner }) {
  const [affectations, setAffectations] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [classeChoisie, setClasseChoisie] = useState(null);

  useEffect(() => {
    client
      .get("/teacher/me/classes")
      .then(({ data }) => setAffectations(data))
      .finally(() => setChargement(false));
  }, []);

  if (chargement) {
    return (
      <Carte>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Squelette key={index} className="h-16 rounded-lg" />
          ))}
        </div>
      </Carte>
    );
  }

  if (affectations.length === 0) {
    return (
      <Carte>
        <EtatVide
          icone={Icone.Classes}
          titre="Aucune affectation"
          message="Aucune classe ne vous est affectee. Rapprochez-vous de l'administration."
        />
      </Carte>
    );
  }

  const classes = [];
  const vues = new Set();
  affectations.forEach((a) => {
    if (vues.has(a.classe_id)) return;
    vues.add(a.classe_id);
    classes.push({
      classe_id: a.classe_id,
      classe: a.classe,
      niveau: a.niveau,
      nbMatieres: affectations.filter((x) => x.classe_id === a.classe_id).length,
    });
  });

  if (classeChoisie == null) {
    return (
      <Carte titre={titre} sousTitre="Etape 1 sur 2 — choisissez une classe" icone={Icone.Classes}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {classes.map((c) => (
            <button
              key={c.classe_id}
              onClick={() => setClasseChoisie(c.classe_id)}
              className="anneau-focus group flex flex-col rounded-2xl border border-ardoise-200 bg-white
                p-5 text-left shadow-subtile transition-all duration-200 ease-douce
                hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-card"
            >
              <span
                className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-indigo-50
                  text-indigo-trajectoire transition-all duration-200 ease-douce
                  group-hover:bg-indigo-trajectoire group-hover:text-white"
              >
                <Icone.Classes className="h-5 w-5" />
              </span>
              <h3 className="mt-3.5 truncate font-display text-base font-semibold text-encre-900">
                {c.classe}
              </h3>
              <p className="mt-1 text-sm text-ardoise-600">{c.niveau}</p>
              <p className="mt-0.5 text-xs text-ardoise-400">
                {c.nbMatieres} matiere{c.nbMatieres > 1 ? "s" : ""}
              </p>
            </button>
          ))}
        </div>
      </Carte>
    );
  }

  const classe = classes.find((c) => c.classe_id === classeChoisie);
  const matieres = affectations.filter((a) => a.classe_id === classeChoisie);

  return (
    <Carte
      titre={titre}
      sousTitre={`Etape 2 sur 2 — choisissez une matiere pour ${classe?.classe ?? "cette classe"}`}
      icone={Icone.Matieres}
    >
      <button
        onClick={() => setClasseChoisie(null)}
        className="anneau-focus mb-4 flex items-center gap-1 text-sm text-indigo-trajectoire hover:underline"
      >
        <Icone.ChevronGauche className="h-4 w-4" />
        Changer de classe
      </button>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {matieres.map((m) => (
          <button
            key={m.id}
            onClick={() => onSelectionner(m.classe_id, m.matiere, m.niveau)}
            className="anneau-focus group flex flex-col rounded-2xl border border-ardoise-200 bg-white
              p-5 text-left shadow-subtile transition-all duration-200 ease-douce
              hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-card"
          >
            <span
              className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-indigo-50
                text-indigo-trajectoire transition-all duration-200 ease-douce
                group-hover:bg-indigo-trajectoire group-hover:text-white"
            >
              <Icone.Matieres className="h-5 w-5" />
            </span>
            <h3 className="mt-3.5 truncate font-display text-base font-semibold text-encre-900">
              {m.matiere}
            </h3>
          </button>
        ))}
      </div>
    </Carte>
  );
}
