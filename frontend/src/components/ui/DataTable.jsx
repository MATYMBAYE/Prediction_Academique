/**
 * Tableau de donnees.
 *
 * Composant central de l'application : il remplace les huit tableaux HTML
 * ecrits a la main dans les differents ecrans, qui dupliquaient chacun leur
 * propre logique de recherche et n'avaient ni tri ni pagination.
 *
 * Fonctionnalites : recherche instantanee, tri par colonne, filtres,
 * pagination, etats de chargement et etats vides, adaptation mobile.
 *
 * Exemple :
 *   <TableauDonnees
 *     colonnes={[
 *       { cle: "nom", titre: "Etudiant", triable: true,
 *         rendu: (l) => <b>{l.prenom} {l.nom}</b> },
 *       { cle: "moyenne", titre: "Moyenne", triable: true, alignement: "droite" },
 *     ]}
 *     lignes={etudiants}
 *     cleLigne={(l) => l.id}
 *     onClicLigne={(l) => naviguer(`/admin/etudiants/${l.id}`)}
 *   />
 */
import { useMemo, useState } from "react";
import Icone from "./Icons.jsx";
import {
  Badge,
  Bouton,
  ChampRecherche,
  EtatVide,
  Selecteur,
  SqueletteTableau,
} from "./Primitives.jsx";

const ALIGNEMENTS = {
  gauche: "text-left",
  centre: "text-center",
  droite: "text-right",
};

export default function TableauDonnees({
  colonnes,
  lignes = [],
  cleLigne = (ligne, index) => ligne.id ?? index,
  chargement = false,
  recherchable = true,
  placeholderRecherche = "Rechercher...",
  filtres = [],
  parPageDefaut = 12,
  onClicLigne,
  actionsEntete,
  messageVide = "Aucun resultat ne correspond a votre recherche.",
  titreVide = "Aucune donnee",
  densite = "confortable",
}) {
  const [recherche, setRecherche] = useState("");
  const [tri, setTri] = useState({ cle: null, sens: "asc" });
  const [valeursFiltres, setValeursFiltres] = useState({});
  const [page, setPage] = useState(1);
  const [parPage, setParPage] = useState(parPageDefaut);

  /* ------------------------------------------------------------ Recherche */
  const lignesRecherchees = useMemo(() => {
    if (!recherche.trim()) return lignes;
    const terme = recherche.toLowerCase().trim();

    return lignes.filter((ligne) =>
      colonnes.some((colonne) => {
        if (colonne.recherchable === false) return false;
        // `valeurRecherche` permet de chercher sur une donnee differente de
        // celle affichee (ex. rechercher par matricule dans une colonne qui
        // affiche le nom complet).
        const valeur = colonne.valeurRecherche
          ? colonne.valeurRecherche(ligne)
          : ligne[colonne.cle];
        return valeur != null && String(valeur).toLowerCase().includes(terme);
      })
    );
  }, [lignes, recherche, colonnes]);

  /* -------------------------------------------------------------- Filtres */
  const lignesFiltrees = useMemo(() => {
    const actifs = Object.entries(valeursFiltres).filter(
      ([, valeur]) => valeur && valeur !== "tous"
    );
    if (actifs.length === 0) return lignesRecherchees;

    return lignesRecherchees.filter((ligne) =>
      actifs.every(([cle, valeur]) => {
        const filtre = filtres.find((element) => element.cle === cle);
        if (filtre?.predicat) return filtre.predicat(ligne, valeur);
        return String(ligne[cle]) === String(valeur);
      })
    );
  }, [lignesRecherchees, valeursFiltres, filtres]);

  /* ------------------------------------------------------------------ Tri */
  const lignesTriees = useMemo(() => {
    if (!tri.cle) return lignesFiltrees;

    const colonne = colonnes.find((element) => element.cle === tri.cle);
    const extraire = colonne?.valeurTri ?? ((ligne) => ligne[tri.cle]);

    return [...lignesFiltrees].sort((a, b) => {
      const valeurA = extraire(a);
      const valeurB = extraire(b);

      // Les valeurs absentes sont systematiquement rejetees en fin de liste,
      // quel que soit le sens du tri : une ligne vide n'a pas a occuper la
      // premiere place.
      if (valeurA == null && valeurB == null) return 0;
      if (valeurA == null) return 1;
      if (valeurB == null) return -1;

      let comparaison;
      if (typeof valeurA === "number" && typeof valeurB === "number") {
        comparaison = valeurA - valeurB;
      } else {
        // `localeCompare` avec `numeric` classe correctement "L10" apres "L2".
        comparaison = String(valeurA).localeCompare(String(valeurB), "fr", {
          numeric: true,
          sensitivity: "base",
        });
      }
      return tri.sens === "asc" ? comparaison : -comparaison;
    });
  }, [lignesFiltrees, tri, colonnes]);

  /* ----------------------------------------------------------- Pagination */
  const total = lignesTriees.length;
  const nombrePages = Math.max(1, Math.ceil(total / parPage));
  const pageCourante = Math.min(page, nombrePages);
  const lignesAffichees = lignesTriees.slice(
    (pageCourante - 1) * parPage,
    pageCourante * parPage
  );

  function basculerTri(cle) {
    setTri((precedent) => {
      if (precedent.cle !== cle) return { cle, sens: "asc" };
      if (precedent.sens === "asc") return { cle, sens: "desc" };
      return { cle: null, sens: "asc" }; // troisieme clic : retour a l'ordre initial
    });
    setPage(1);
  }

  function definirFiltre(cle, valeur) {
    setValeursFiltres((precedent) => ({ ...precedent, [cle]: valeur }));
    setPage(1);
  }

  const nombreFiltresActifs = Object.values(valeursFiltres).filter(
    (valeur) => valeur && valeur !== "tous"
  ).length;

  const paddingCellule = densite === "compacte" ? "px-4 py-2" : "px-4 py-3";

  return (
    <div className="carte overflow-hidden">
      {/* ---------------------------------------------------- Barre d'outils */}
      {(recherchable || filtres.length > 0 || actionsEntete) && (
        <div className="flex flex-wrap items-center gap-3 border-b border-ardoise-200/70 px-4 py-3">
          {recherchable && (
            <ChampRecherche
              valeur={recherche}
              onChange={(valeur) => {
                setRecherche(valeur);
                setPage(1);
              }}
              placeholder={placeholderRecherche}
              className="min-w-[200px] flex-1"
            />
          )}

          {filtres.map((filtre) => (
            <Selecteur
              key={filtre.cle}
              valeur={valeursFiltres[filtre.cle] ?? "tous"}
              onChange={(valeur) => definirFiltre(filtre.cle, valeur)}
              options={[
                { valeur: "tous", libelle: filtre.libelleTous ?? `Tous — ${filtre.libelle}` },
                ...filtre.options,
              ]}
              className="min-w-[150px]"
            />
          ))}

          {nombreFiltresActifs > 0 && (
            <Bouton
              variante="discret"
              taille="sm"
              icone={Icone.Fermer}
              onClick={() => {
                setValeursFiltres({});
                setPage(1);
              }}
            >
              Reinitialiser
            </Bouton>
          )}

          {actionsEntete && <div className="ml-auto flex items-center gap-2">{actionsEntete}</div>}
        </div>
      )}

      {/* ----------------------------------------------------------- Contenu */}
      {chargement ? (
        <div className="p-5">
          <SqueletteTableau lignes={6} colonnes={Math.min(colonnes.length, 6)} />
        </div>
      ) : total === 0 ? (
        <EtatVide
          icone={Icone.Recherche}
          titre={titreVide}
          message={messageVide}
          action={
            (recherche || nombreFiltresActifs > 0) && (
              <Bouton
                variante="secondaire"
                taille="sm"
                onClick={() => {
                  setRecherche("");
                  setValeursFiltres({});
                }}
              >
                Effacer les criteres
              </Bouton>
            )
          }
        />
      ) : (
        <>
          <div className="defilement-fin overflow-x-auto">
            <table className="w-full min-w-[620px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-ardoise-200 bg-ardoise-50/60">
                  {colonnes.map((colonne) => {
                    const triActif = tri.cle === colonne.cle;
                    return (
                      <th
                        key={colonne.cle}
                        scope="col"
                        style={colonne.largeur ? { width: colonne.largeur } : undefined}
                        className={`${paddingCellule} text-xs font-semibold uppercase tracking-wide
                          text-ardoise-600 ${ALIGNEMENTS[colonne.alignement ?? "gauche"]}`}
                        aria-sort={
                          triActif
                            ? tri.sens === "asc"
                              ? "ascending"
                              : "descending"
                            : "none"
                        }
                      >
                        {colonne.triable ? (
                          <button
                            onClick={() => basculerTri(colonne.cle)}
                            className={`anneau-focus inline-flex items-center gap-1 rounded transition-colors
                              hover:text-encre-800 ${triActif ? "text-encre-800" : ""}`}
                          >
                            {colonne.titre}
                            {triActif ? (
                              tri.sens === "asc" ? (
                                <Icone.ChevronHaut className="h-3.5 w-3.5" />
                              ) : (
                                <Icone.ChevronBas className="h-3.5 w-3.5" />
                              )
                            ) : (
                              <Icone.TriHautBas className="h-3.5 w-3.5 opacity-35" />
                            )}
                          </button>
                        ) : (
                          colonne.titre
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody className="divide-y divide-ardoise-200/70">
                {lignesAffichees.map((ligne, index) => (
                  <tr
                    key={cleLigne(ligne, index)}
                    onClick={onClicLigne ? () => onClicLigne(ligne) : undefined}
                    className={`transition-colors duration-100 ${
                      onClicLigne ? "cursor-pointer hover:bg-encre-50/60" : "hover:bg-ardoise-50/60"
                    }`}
                  >
                    {colonnes.map((colonne) => (
                      <td
                        key={colonne.cle}
                        className={`${paddingCellule} text-encre-800
                          ${ALIGNEMENTS[colonne.alignement ?? "gauche"]}
                          ${colonne.tabulaire ? "tabulaire" : ""}`}
                      >
                        {colonne.rendu ? colonne.rendu(ligne) : ligne[colonne.cle] ?? "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* -------------------------------------------------- Pagination */}
          {total > parPageDefaut && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ardoise-200/70 px-4 py-3">
              <p className="text-xs text-ardoise-500">
                <span className="tabulaire font-medium text-encre-800">
                  {(pageCourante - 1) * parPage + 1}–{Math.min(pageCourante * parPage, total)}
                </span>{" "}
                sur <span className="tabulaire font-medium text-encre-800">{total}</span>
              </p>

              <div className="flex items-center gap-2">
                <Selecteur
                  valeur={String(parPage)}
                  onChange={(valeur) => {
                    setParPage(Number(valeur));
                    setPage(1);
                  }}
                  options={[12, 25, 50, 100].map((nombre) => ({
                    valeur: String(nombre),
                    libelle: `${nombre} / page`,
                  }))}
                  className="w-[110px]"
                />

                <div className="flex items-center gap-1">
                  <Bouton
                    variante="secondaire"
                    taille="icone-sm"
                    disabled={pageCourante === 1}
                    onClick={() => setPage((precedent) => precedent - 1)}
                    aria-label="Page precedente"
                  >
                    <Icone.ChevronGauche className="h-4 w-4" />
                  </Bouton>

                  <span className="tabulaire px-2 text-xs text-ardoise-600">
                    {pageCourante} / {nombrePages}
                  </span>

                  <Bouton
                    variante="secondaire"
                    taille="icone-sm"
                    disabled={pageCourante === nombrePages}
                    onClick={() => setPage((precedent) => precedent + 1)}
                    aria-label="Page suivante"
                  >
                    <Icone.ChevronDroite className="h-4 w-4" />
                  </Bouton>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** Cellule identite : nom en evidence, identifiant secondaire en dessous.
 *  Evite de consommer deux colonnes pour une seule information. */
export function CelluleIdentite({ principal, secondaire, initiales, ton = "encre" }) {
  const fonds = {
    encre: "bg-encre-100 text-encre-700",
    sauge: "bg-sauge-100 text-sauge-700",
    indigo: "bg-indigo-100 text-indigo-700",
    ambre: "bg-ambre-100 text-ambre-700",
  };

  return (
    <div className="flex items-center gap-3">
      {initiales && (
        <span
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-semibold
            ${fonds[ton]}`}
        >
          {initiales}
        </span>
      )}
      <div className="min-w-0">
        <div className="truncate font-medium text-encre-900">{principal}</div>
        {secondaire && (
          <div className="tabulaire truncate text-xs text-ardoise-500">{secondaire}</div>
        )}
      </div>
    </div>
  );
}

export { Badge };
