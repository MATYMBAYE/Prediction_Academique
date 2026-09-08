/**
 * Supervision des Rattrapages — Espace Administrateur
 *
 * Rôle de l'administrateur :
 *  - Supervision et consultation globale de l'ensemble des demandes de rattrapage
 *  - Filtrage multi-critères (étudiant, enseignant, matière, filière, classe, statut, période)
 *  - Ajout d'observations administratives datées (remarques, logistique, alertes)
 *  - Respect de la séparation des responsabilités : l'admin NE modifie PAS le statut
 *    et ne prend pas de décision pédagogique à la place de l'enseignant.
 */
import { useEffect, useState, useMemo } from "react";
import CoqueApplication from "../../components/AppShell.jsx";
import { navigationAdmin } from "../../components/navigation.js";
import Icone from "../../components/ui/Icons.jsx";
import { Badge, Bouton, Carte, CarteStat, EtatVide, Squelette } from "../../components/ui/Primitives.jsx";
import { Modale, useNotifications } from "../../components/ui/Feedback.jsx";
import client from "../../api/client.js";

const STATUT_LABELS = {
  en_attente: "En attente",
  acceptee: "Acceptée",
  planifiee: "Planifiée",
  terminee: "Terminée",
  refusee: "Refusée",
  programmee: "Planifiée",
};

const STATUT_TONS = {
  en_attente: "vigilance",
  acceptee: "info",
  planifiee: "succes",
  terminee: "neutre",
  refusee: "danger",
  programmee: "succes",
};

export default function AdminRattrapages() {
  const [demandes, setDemandes] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    en_attente: 0,
    acceptees: 0,
    planifiees: 0,
    terminees: 0,
    refusees: 0,
  });
  const [chargement, setChargement] = useState(true);

  // Filtres
  const [recherche, setRecherche] = useState("");
  const [filtreStatut, setFiltreStatut] = useState("");
  const [filtreMatiere, setFiltreMatiere] = useState("");
  const [filtreEnseignant, setFiltreEnseignant] = useState("");
  const [filtreFiliere, setFiltreFiliere] = useState("");
  const [filtreNiveau, setFiltreNiveau] = useState("");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");

  // Modale Détail & Observation
  const [demandeSelectionnee, setDemandeSelectionnee] = useState(null);
  const [observationTexte, setObservationTexte] = useState("");
  const [enregistrementObs, setEnregistrementObs] = useState(false);
  const [erreurObs, setErreurObs] = useState("");

  const notifications = useNotifications();

  const charger = async () => {
    setChargement(true);
    try {
      const params = {};
      if (filtreStatut) params.statut = filtreStatut;
      if (filtreMatiere) params.matiere = filtreMatiere;
      if (dateDebut) params.date_debut = dateDebut;
      if (dateFin) params.date_fin = dateFin;
      if (recherche) params.recherche = recherche;

      const { data } = await client.get("/admin/rattrapages", { params });
      setDemandes(data.demandes || []);
      if (data.stats) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error("Erreur chargement supervision rattrapages :", err);
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    charger();
  }, [filtreStatut, filtreMatiere, dateDebut, dateFin]);

  // Recherche avec léger debounce ou déclenchement
  function handleRecherche(e) {
    e.preventDefault();
    charger();
  }

  function reinitialiserFiltres() {
    setRecherche("");
    setFiltreStatut("");
    setFiltreMatiere("");
    setFiltreEnseignant("");
    setFiltreFiliere("");
    setFiltreNiveau("");
    setDateDebut("");
    setDateFin("");
  }

  // Listes dynamiques pour les listes déroulantes de filtrage
  const matieresDisponibles = useMemo(() => {
    const setM = new Set();
    demandes.forEach((d) => d.matiere && setM.add(d.matiere));
    return Array.from(setM).sort();
  }, [demandes]);

  const enseignantsDisponibles = useMemo(() => {
    const setE = new Set();
    demandes.forEach((d) => d.enseignant && setE.add(d.enseignant));
    return Array.from(setE).sort();
  }, [demandes]);

  const filieresDisponibles = useMemo(() => {
    const setF = new Set();
    demandes.forEach((d) => d.filiere && setF.add(d.filiere));
    return Array.from(setF).sort();
  }, [demandes]);

  const niveauxDisponibles = useMemo(() => {
    const setN = new Set();
    demandes.forEach((d) => d.niveau && setN.add(d.niveau));
    return Array.from(setN).sort();
  }, [demandes]);

  // Filtrage local complémentaire (enseignant, filière, niveau)
  const demandesAffichees = useMemo(() => {
    return demandes.filter((d) => {
      if (filtreEnseignant && d.enseignant !== filtreEnseignant) return false;
      if (filtreFiliere && d.filiere !== filtreFiliere) return false;
      if (filtreNiveau && d.niveau !== filtreNiveau) return false;
      return true;
    });
  }, [demandes, filtreEnseignant, filtreFiliere, filtreNiveau]);

  function ouvrirDetail(demande) {
    setDemandeSelectionnee(demande);
    setObservationTexte(demande.observation_admin || "");
    setErreurObs("");
  }

  async function enregistrerObservation(e) {
    e.preventDefault();
    if (!demandeSelectionnee) return;
    setEnregistrementObs(true);
    setErreurObs("");

    try {
      const { data } = await client.post(
        `/admin/rattrapages/${demandeSelectionnee.id}/observation`,
        { observation: observationTexte }
      );
      notifications.succes("Observation administrative enregistrée.");
      setDemandeSelectionnee(data.demande);
      // Mettre à jour dans la liste locale
      setDemandes((prev) =>
        prev.map((d) => (d.id === data.demande.id ? data.demande : d))
      );
    } catch (err) {
      setErreurObs(err.response?.data?.error || "Impossible d'enregistrer l'observation.");
    } finally {
      setEnregistrementObs(false);
    }
  }

  return (
    <CoqueApplication
      titre="Supervision des rattrapages"
      sousTitre="Vue globale et suivi de l'ensemble des séances d'accompagnement de l'établissement"
      sectionsNavigation={navigationAdmin()}
      actions={
        <Bouton
          variante="secondaire"
          icone={Icone.Actualiser}
          onClick={charger}
          disabled={chargement}
        >
          Actualiser
        </Bouton>
      }
    >
      {/* ============================================================ Indicateurs KPI Liquid Glass */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <CarteStat
          variante="sombre"
          libelle="Total"
          valeur={stats.total}
          icone={Icone.TableauBord}
          ton="neutre"
        />
        <CarteStat
          variante="sombre"
          libelle="En attente"
          valeur={stats.en_attente}
          icone={Icone.Horloge}
          ton="vigilance"
        />
        <CarteStat
          variante="sombre"
          libelle="Acceptées"
          valeur={stats.acceptees}
          icone={Icone.Info}
          ton="info"
        />
        <CarteStat
          variante="sombre"
          libelle="Planifiées"
          valeur={stats.planifiees}
          icone={Icone.Calendrier}
          ton="succes"
        />
        <CarteStat
          variante="sombre"
          libelle="Terminées"
          valeur={stats.terminees}
          icone={Icone.Valide}
          ton="neutre"
        />
        <CarteStat
          variante="sombre"
          libelle="Refusées"
          valeur={stats.refusees}
          icone={Icone.Fermer}
          ton="alerte"
        />
      </div>

      {/* ============================================================ Filtres et Recherche */}
      <Carte className="mb-6 p-4">
        <form onSubmit={handleRecherche} className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Barre de recherche */}
            <div className="relative flex-1 min-w-[240px]">
              <Icone.Recherche className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ardoise-400" />
              <input
                type="text"
                placeholder="Rechercher par étudiant, matricule, matière, enseignant, motif..."
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                className="anneau-focus w-full rounded-lg border border-ardoise-300 pl-9 pr-3 py-2 text-xs text-encre-900 placeholder:text-ardoise-400"
              />
            </div>
            <Bouton variante="primaire" taille="sm" type="submit">
              Rechercher
            </Bouton>
            {(recherche || filtreStatut || filtreMatiere || filtreEnseignant || filtreFiliere || filtreNiveau || dateDebut || dateFin) && (
              <Bouton variante="secondaire" taille="sm" type="button" onClick={reinitialiserFiltres}>
                Réinitialiser
              </Bouton>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6 pt-2 border-t border-ardoise-100">
            {/* Statut */}
            <div>
              <label className="block text-2xs font-semibold text-ardoise-500 mb-1">Statut</label>
              <select
                value={filtreStatut}
                onChange={(e) => setFiltreStatut(e.target.value)}
                className="anneau-focus w-full rounded-lg border border-ardoise-300 bg-white px-2 py-1.5 text-xs text-encre-900"
              >
                <option value="">Tous les statuts</option>
                <option value="en_attente">En attente</option>
                <option value="acceptee">Acceptée</option>
                <option value="planifiee">Planifiée</option>
                <option value="terminee">Terminée</option>
                <option value="refusee">Refusée</option>
              </select>
            </div>

            {/* Matière */}
            <div>
              <label className="block text-2xs font-semibold text-ardoise-500 mb-1">Matière</label>
              <select
                value={filtreMatiere}
                onChange={(e) => setFiltreMatiere(e.target.value)}
                className="anneau-focus w-full rounded-lg border border-ardoise-300 bg-white px-2 py-1.5 text-xs text-encre-900"
              >
                <option value="">Toutes les matières</option>
                {matieresDisponibles.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            {/* Enseignant */}
            <div>
              <label className="block text-2xs font-semibold text-ardoise-500 mb-1">Enseignant</label>
              <select
                value={filtreEnseignant}
                onChange={(e) => setFiltreEnseignant(e.target.value)}
                className="anneau-focus w-full rounded-lg border border-ardoise-300 bg-white px-2 py-1.5 text-xs text-encre-900"
              >
                <option value="">Tous les enseignants</option>
                {enseignantsDisponibles.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
            </div>

            {/* Filière */}
            <div>
              <label className="block text-2xs font-semibold text-ardoise-500 mb-1">Filière</label>
              <select
                value={filtreFiliere}
                onChange={(e) => setFiltreFiliere(e.target.value)}
                className="anneau-focus w-full rounded-lg border border-ardoise-300 bg-white px-2 py-1.5 text-xs text-encre-900"
              >
                <option value="">Toutes les filières</option>
                {filieresDisponibles.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>

            {/* Niveau */}
            <div>
              <label className="block text-2xs font-semibold text-ardoise-500 mb-1">Niveau</label>
              <select
                value={filtreNiveau}
                onChange={(e) => setFiltreNiveau(e.target.value)}
                className="anneau-focus w-full rounded-lg border border-ardoise-300 bg-white px-2 py-1.5 text-xs text-encre-900"
              >
                <option value="">Tous les niveaux</option>
                {niveauxDisponibles.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>

            {/* Période début */}
            <div>
              <label className="block text-2xs font-semibold text-ardoise-500 mb-1">Depuis le</label>
              <input
                type="date"
                value={dateDebut}
                onChange={(e) => setDateDebut(e.target.value)}
                className="anneau-focus w-full rounded-lg border border-ardoise-300 bg-white px-2 py-1.5 text-xs text-encre-900"
              />
            </div>
          </div>
        </form>
      </Carte>

      {/* ============================================================ Tableau des demandes */}
      <Carte>
        {chargement ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <Squelette key={index} className="h-16 rounded-xl" />
            ))}
          </div>
        ) : demandesAffichees.length === 0 ? (
          <div className="py-8">
            <EtatVide
              icone={Icone.Presence}
              titre="Aucune demande de rattrapage trouvée"
              message="Aucune demande ne correspond aux critères de recherche ou aux filtres sélectionnés."
              action={
                (recherche || filtreStatut || filtreMatiere || filtreEnseignant || filtreFiliere || filtreNiveau || dateDebut || dateFin) && (
                  <Bouton variante="secondaire" onClick={reinitialiserFiltres}>
                    Effacer les filtres
                  </Bouton>
                )
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-ardoise-200 bg-ardoise-50/70 text-xs font-semibold uppercase tracking-wider text-ardoise-600">
                <tr>
                  <th className="px-5 py-3.5">Étudiant & Classe</th>
                  <th className="px-4 py-3.5">Matière & Enseignant</th>
                  <th className="px-4 py-3.5">Motif de la demande</th>
                  <th className="px-4 py-3.5">Date demande</th>
                  <th className="px-4 py-3.5">Planification</th>
                  <th className="px-4 py-3.5">Statut</th>
                  <th className="px-4 py-3.5 text-center">Obs. Admin</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ardoise-200/70">
                {demandesAffichees.map((d) => (
                  <tr
                    key={d.id}
                    className="group cursor-pointer transition-colors hover:bg-ardoise-50/60"
                    onClick={() => ouvrirDetail(d)}
                  >
                    {/* Étudiant & Classe */}
                    <td className="px-5 py-4">
                      <div>
                        <p className="font-semibold text-encre-900 group-hover:text-isi-bleu transition-colors">
                          {d.etudiant}
                        </p>
                        <p className="text-2xs text-ardoise-500">
                          {d.matricule ? `${d.matricule} · ` : ""}
                          <strong className="text-ardoise-700">{d.classe || "Non assigné"}</strong>
                          {d.filiere ? ` (${d.filiere})` : ""}
                        </p>
                      </div>
                    </td>

                    {/* Matière & Enseignant */}
                    <td className="px-4 py-4">
                      <div>
                        <p className="font-medium text-encre-900">{d.matiere}</p>
                        <p className="text-2xs text-ardoise-500">
                          Prof. : {d.enseignant || <span className="italic">Non assigné</span>}
                        </p>
                      </div>
                    </td>

                    {/* Motif */}
                    <td className="px-4 py-4">
                      <p className="line-clamp-2 text-xs text-ardoise-700 max-w-[200px]">
                        {d.motif || "Séance d'accompagnement"}
                      </p>
                    </td>

                    {/* Date demande */}
                    <td className="px-4 py-4 text-xs text-ardoise-600 whitespace-nowrap">
                      {new Date(d.date_demande).toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                      {d.date_souhaitee && (
                        <p className="text-2xs text-ardoise-400">
                          Souhait : {new Date(d.date_souhaitee).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                        </p>
                      )}
                    </td>

                    {/* Planification */}
                    <td className="px-4 py-4 text-xs">
                      {d.date_planifiee ? (
                        <div>
                          <p className="font-semibold text-sauge-700 whitespace-nowrap">
                            {new Date(d.date_planifiee).toLocaleDateString("fr-FR", {
                              day: "2-digit",
                              month: "short",
                            })}
                          </p>
                          <p className="text-2xs text-ardoise-500">
                            {d.heure_debut_planifiee?.substring(0, 5)} - {d.heure_fin_planifiee?.substring(0, 5)}
                            {d.salle_planifiee ? ` · ${d.salle_planifiee}` : ""}
                          </p>
                        </div>
                      ) : (
                        <span className="text-ardoise-400 italic text-2xs">Non fixée</span>
                      )}
                    </td>

                    {/* Statut */}
                    <td className="px-4 py-4">
                      <Badge ton={STATUT_TONS[d.statut] || "neutre"}>
                        {STATUT_LABELS[d.statut] || d.statut}
                      </Badge>
                    </td>

                    {/* Observation admin badge */}
                    <td className="px-4 py-4 text-center">
                      {d.observation_admin ? (
                        <span
                          className="inline-flex items-center gap-1 rounded-md bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-2xs font-semibold text-indigo-700"
                          title={`Obs : ${d.observation_admin}`}
                        >
                          <Icone.Ampoule className="h-3 w-3" />
                          Notée
                        </span>
                      ) : (
                        <span className="text-ardoise-300 text-xs">—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <Bouton
                        variante="secondaire"
                        taille="sm"
                        onClick={() => ouvrirDetail(d)}
                      >
                        Superviser
                      </Bouton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Carte>

      {/* ============================================================ Modale Supervision & Observation */}
      <Modale
        ouverte={demandeSelectionnee != null}
        onFermer={() => setDemandeSelectionnee(null)}
        titre={
          demandeSelectionnee
            ? `Supervision · ${demandeSelectionnee.matiere}`
            : "Détail du rattrapage"
        }
        sousTitre={
          demandeSelectionnee
            ? `Étudiant : ${demandeSelectionnee.etudiant} (${demandeSelectionnee.classe || "Classe non renseignée"})`
            : undefined
        }
        taille="lg"
      >
        {demandeSelectionnee && (
          <div className="space-y-5">
            {/* Bandeau d'information rôle admin */}
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-3 text-xs leading-relaxed text-indigo-950 flex items-start gap-2.5">
              <Icone.Info className="h-5 w-5 text-indigo-700 shrink-0 mt-0.5" />
              <div>
                <strong>Rôle de supervision :</strong> L'administration assure le suivi global de l'activité. Les décisions d'acceptation, de refus ou de planification relèvent de la responsabilité de l'enseignant de la matière.
              </div>
            </div>

            {/* Statut & Dates */}
            <div className="rounded-xl bg-ardoise-50 p-4 border border-ardoise-200 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-2xs font-semibold uppercase tracking-wider text-ardoise-500">
                  Statut de la demande
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <Badge ton={STATUT_TONS[demandeSelectionnee.statut] || "neutre"}>
                    {STATUT_LABELS[demandeSelectionnee.statut] || demandeSelectionnee.statut}
                  </Badge>
                  <span className="text-xs text-ardoise-500">
                    Déposée le{" "}
                    {new Date(demandeSelectionnee.date_demande).toLocaleDateString("fr-FR", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>

              {demandeSelectionnee.date_planifiee && (
                <div className="text-right">
                  <p className="text-2xs font-semibold uppercase tracking-wider text-sauge-700">
                    Séance fixée
                  </p>
                  <p className="text-xs font-bold text-sauge-900 mt-0.5">
                    {new Date(demandeSelectionnee.date_planifiee).toLocaleDateString("fr-FR")} (
                    {demandeSelectionnee.heure_debut_planifiee?.substring(0, 5)} -{" "}
                    {demandeSelectionnee.heure_fin_planifiee?.substring(0, 5)})
                  </p>
                  {demandeSelectionnee.salle_planifiee && (
                    <p className="text-2xs text-ardoise-500">Salle : {demandeSelectionnee.salle_planifiee}</p>
                  )}
                </div>
              )}
            </div>

            {/* Synthèse Acteurs & Demande */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Côté Étudiant */}
              <div className="rounded-xl border border-ardoise-200 p-3.5 space-y-2 text-xs">
                <h4 className="font-semibold text-encre-900 border-b border-ardoise-100 pb-1.5">
                  Informations Étudiant
                </h4>
                <p>
                  <span className="text-ardoise-500">Nom :</span>{" "}
                  <strong>{demandeSelectionnee.etudiant}</strong>
                </p>
                <p>
                  <span className="text-ardoise-500">Matricule :</span>{" "}
                  <strong>{demandeSelectionnee.matricule || "—"}</strong>
                </p>
                <p>
                  <span className="text-ardoise-500">Classe :</span>{" "}
                  <strong>{demandeSelectionnee.classe || "—"}</strong>{" "}
                  {demandeSelectionnee.niveau ? `(${demandeSelectionnee.niveau})` : ""}
                </p>
                <p>
                  <span className="text-ardoise-500">Filière :</span>{" "}
                  <strong>{demandeSelectionnee.filiere || "—"}</strong>
                </p>
                <p>
                  <span className="text-ardoise-500">Motif :</span>{" "}
                  <strong>{demandeSelectionnee.motif || "—"}</strong>
                </p>
                <p>
                  <span className="text-ardoise-500">Créneau souhaité :</span>{" "}
                  <strong>
                    {demandeSelectionnee.date_souhaitee
                      ? `${new Date(demandeSelectionnee.date_souhaitee).toLocaleDateString("fr-FR")} ${
                          demandeSelectionnee.heure_souhaitee ? `(${demandeSelectionnee.heure_souhaitee})` : ""
                        }`
                      : demandeSelectionnee.heure_souhaitee || "Non précisé"}
                  </strong>
                </p>
                {demandeSelectionnee.message && (
                  <div className="mt-2 rounded-lg bg-ardoise-50 p-2.5 text-2xs italic text-ardoise-700">
                    « {demandeSelectionnee.message} »
                  </div>
                )}
              </div>

              {/* Côté Enseignant */}
              <div className="rounded-xl border border-ardoise-200 p-3.5 space-y-2 text-xs">
                <h4 className="font-semibold text-encre-900 border-b border-ardoise-100 pb-1.5">
                  Informations Enseignant
                </h4>
                <p>
                  <span className="text-ardoise-500">Enseignant :</span>{" "}
                  <strong>{demandeSelectionnee.enseignant || "Non assigné"}</strong>
                </p>
                <p>
                  <span className="text-ardoise-500">Matière :</span>{" "}
                  <strong>{demandeSelectionnee.matiere}</strong>
                </p>
                <p>
                  <span className="text-ardoise-500">Décision :</span>{" "}
                  <strong className="capitalize">
                    {STATUT_LABELS[demandeSelectionnee.statut] || demandeSelectionnee.statut}
                  </strong>
                </p>
                {demandeSelectionnee.reponse_enseignant && (
                  <div className="mt-2 rounded-lg bg-indigo-50/70 border border-indigo-100 p-2.5 text-2xs text-indigo-950">
                    <span className="font-semibold block mb-0.5">Commentaire enseignant :</span>
                    {demandeSelectionnee.reponse_enseignant}
                  </div>
                )}
              </div>
            </div>

            {/* Observations de l'Administrateur */}
            <div className="rounded-xl border border-ardoise-200 p-4 space-y-3 bg-ardoise-50/50">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-ardoise-700">
                  Observation administrative & Suivi
                </h4>
                {demandeSelectionnee.date_observation_admin && (
                  <span className="text-2xs text-ardoise-500">
                    Dernière note :{" "}
                    {new Date(demandeSelectionnee.date_observation_admin).toLocaleString("fr-FR")}{" "}
                    {demandeSelectionnee.auteur_observation_admin ? `par ${demandeSelectionnee.auteur_observation_admin}` : ""}
                  </span>
                )}
              </div>

              <form onSubmit={enregistrerObservation} className="space-y-3">
                <textarea
                  rows={3}
                  value={observationTexte}
                  onChange={(e) => setObservationTexte(e.target.value)}
                  placeholder="Ajouter une observation administrative (ex. vérification salle effectuée, convocation étudiant, note logistique...)..."
                  className="anneau-focus w-full rounded-lg border border-ardoise-300 bg-white p-2.5 text-xs text-encre-900 placeholder:text-ardoise-400"
                />

                {erreurObs && <p className="text-xs font-medium text-brique-600">{erreurObs}</p>}

                <div className="flex justify-end gap-2">
                  <Bouton
                    variante="primaire"
                    taille="sm"
                    type="submit"
                    chargement={enregistrementObs}
                  >
                    Enregistrer l'observation
                  </Bouton>
                </div>
              </form>
            </div>

            <div className="flex justify-end pt-2">
              <Bouton variante="secondaire" onClick={() => setDemandeSelectionnee(null)}>
                Fermer
              </Bouton>
            </div>
          </div>
        )}
      </Modale>
    </CoqueApplication>
  );
}
