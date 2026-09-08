/**
 * Mes Rattrapages — Espace Enseignant
 *
 * Permet à l'enseignant de :
 *  - Consulter toutes les demandes de rattrapage adressées par ses étudiants
 *  - Filtrer par statut (En attente, Planifiées, Terminées, Refusées)
 *  - Traiter chaque demande :
 *      - Accepter la demande
 *      - Planifier une séance (date, heure début/fin, salle)
 *      - Refuser avec motif
 *      - Marquer la séance comme terminée
 *      - Laisser un commentaire ou des consignes pour l'étudiant
 */
import { useEffect, useState } from "react";
import CoqueApplication from "../../components/AppShell.jsx";
import { navigationEnseignant } from "../../components/navigation.js";
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

export default function TeacherRattrapages() {
  const [demandes, setDemandes] = useState([]);
  const [chargement, setChargement] = useState(true);

  // Modale de traitement
  const [demandeSelectionnee, setDemandeSelectionnee] = useState(null);
  const [actionStatut, setActionStatut] = useState("planifiee"); // 'planifiee', 'acceptee', 'refusee', 'terminee'
  const [datePlanifiee, setDatePlanifiee] = useState("");
  const [heureDebut, setHeureDebut] = useState("14:00");
  const [heureFin, setHeureFin] = useState("16:00");
  const [salle, setSalle] = useState("");
  const [reponse, setReponse] = useState("");
  const [traitementEnCours, setTraitementEnCours] = useState(false);
  const [erreurTraitement, setErreurTraitement] = useState("");

  // Modale de consultation
  const [demandeDetail, setDemandeDetail] = useState(null);

  // Filtre
  const [filtreStatut, setFiltreStatut] = useState("tous");

  const notifications = useNotifications();

  const charger = async () => {
    try {
      const { data } = await client.get("/teacher/rattrapages");
      setDemandes(data);
    } catch (err) {
      console.error("Erreur chargement rattrapages enseignant :", err);
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    charger();
  }, []);

  function ouvrirTraitement(demande, actionParDefaut = null) {
    setDemandeSelectionnee(demande);
    const actionInitiale =
      actionParDefaut ||
      (demande.statut === "en_attente"
        ? "planifiee"
        : demande.statut === "planifiee"
        ? "terminee"
        : demande.statut);
    setActionStatut(actionInitiale);
    setDatePlanifiee(
      demande.date_planifiee ||
        demande.date_souhaitee ||
        new Date().toISOString().split("T")[0]
    );
    setHeureDebut(demande.heure_debut_planifiee?.substring(0, 5) || "14:00");
    setHeureFin(demande.heure_fin_planifiee?.substring(0, 5) || "16:00");
    setSalle(demande.salle_planifiee || "");
    setReponse(demande.reponse_enseignant || "");
    setErreurTraitement("");
  }

  async function soumettreTraitement(e) {
    e.preventDefault();
    if (!demandeSelectionnee) return;
    setErreurTraitement("");
    setTraitementEnCours(true);

    try {
      const payload = {
        statut: actionStatut,
        reponse_enseignant: reponse || null,
        date_planifiee: actionStatut === "planifiee" ? datePlanifiee || null : null,
        heure_debut_planifiee: actionStatut === "planifiee" ? heureDebut || null : null,
        heure_fin_planifiee: actionStatut === "planifiee" ? heureFin || null : null,
        salle_planifiee: actionStatut === "planifiee" ? salle || null : null,
      };

      await client.post(`/teacher/rattrapages/${demandeSelectionnee.id}/traiter`, payload);
      notifications.succes(
        `La demande de rattrapage a été mise à jour (${STATUT_LABELS[actionStatut]}).`
      );
      setDemandeSelectionnee(null);
      charger();
    } catch (err) {
      setErreurTraitement(err.response?.data?.error || "Impossible de traiter la demande.");
    } finally {
      setTraitementEnCours(false);
    }
  }

  // Statistiques
  const stats = {
    total: demandes.length,
    en_attente: demandes.filter((d) => d.statut === "en_attente").length,
    planifiees: demandes.filter((d) => d.statut === "planifiee" || d.statut === "programmee" || d.statut === "acceptee").length,
    terminees: demandes.filter((d) => d.statut === "terminee").length,
  };

  const demandesFiltrees = demandes.filter((d) => {
    if (filtreStatut === "tous") return true;
    if (filtreStatut === "planifiee") {
      return d.statut === "planifiee" || d.statut === "programmee" || d.statut === "acceptee";
    }
    return d.statut === filtreStatut;
  });

  return (
    <CoqueApplication
      titre="Demandes de rattrapage"
      sousTitre="Gérez les demandes de soutien et planifiez les séances de rattrapage"
      sectionsNavigation={navigationEnseignant()}
    >
      {/* ============================================================ Indicateurs Liquid Glass */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <CarteStat
          variante="sombre"
          libelle="À traiter"
          valeur={stats.en_attente}
          icone={Icone.Horloge}
          ton="vigilance"
        />
        <CarteStat
          variante="sombre"
          libelle="Planifiées / Validées"
          valeur={stats.planifiees}
          icone={Icone.Calendrier}
          ton="succes"
        />
        <CarteStat
          variante="sombre"
          libelle="Terminées"
          valeur={stats.terminees}
          icone={Icone.Valide}
          ton="info"
        />
        <CarteStat
          variante="sombre"
          libelle="Total reçues"
          valeur={stats.total}
          icone={Icone.TableauBord}
          ton="neutre"
        />
      </div>

      {/* ============================================================ Filtres */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5 rounded-xl bg-ardoise-100 p-1">
          {[
            { id: "tous", label: `Toutes (${stats.total})` },
            { id: "en_attente", label: `En attente (${stats.en_attente})` },
            { id: "planifiee", label: `Planifiées (${stats.planifiees})` },
            { id: "terminee", label: `Terminées (${stats.terminees})` },
            { id: "refusee", label: "Refusées" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFiltreStatut(tab.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                filtreStatut === tab.id
                  ? "bg-white text-encre-900 shadow-sm"
                  : "text-ardoise-600 hover:text-encre-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ============================================================ Liste */}
      <Carte>
        {chargement ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Squelette key={index} className="h-16 rounded-xl" />
            ))}
          </div>
        ) : demandesFiltrees.length === 0 ? (
          <div className="py-8">
            <EtatVide
              icone={Icone.Presence}
              titre={demandes.length === 0 ? "Aucune demande reçue" : "Aucune demande dans cette catégorie"}
              message={
                demandes.length === 0
                  ? "Vous n'avez actuellement aucune demande de séance de rattrapage en attente de traitement."
                  : "Aucune demande ne correspond au filtre actuellement actif."
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-ardoise-200 bg-ardoise-50/70 text-xs font-semibold uppercase tracking-wider text-ardoise-600">
                <tr>
                  <th className="px-5 py-3.5">Étudiant & Classe</th>
                  <th className="px-4 py-3.5">Matière & Motif</th>
                  <th className="px-4 py-3.5">Date souhaitée</th>
                  <th className="px-4 py-3.5">Séance fixée</th>
                  <th className="px-4 py-3.5">Statut</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ardoise-200/70">
                {demandesFiltrees.map((d) => (
                  <tr
                    key={d.id}
                    className="group cursor-pointer transition-colors hover:bg-ardoise-50/60"
                    onClick={() => setDemandeDetail(d)}
                  >
                    <td className="px-5 py-4">
                      <div>
                        <p className="font-semibold text-encre-900 group-hover:text-isi-bleu transition-colors">
                          {d.etudiant}
                        </p>
                        <p className="text-xs text-ardoise-500">
                          {d.classe || "Classe non renseignée"} {d.matricule ? `· ${d.matricule}` : ""}
                        </p>
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <div>
                        <p className="font-semibold text-encre-900">{d.matiere}</p>
                        <p className="mt-0.5 line-clamp-1 text-xs text-ardoise-500">
                          {d.motif || "Séance d'accompagnement"}
                        </p>
                      </div>
                    </td>

                    <td className="px-4 py-4 text-xs text-ardoise-600">
                      {d.date_souhaitee ? (
                        <div>
                          <p className="font-medium text-encre-900">
                            {new Date(d.date_souhaitee).toLocaleDateString("fr-FR", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </p>
                          {d.heure_souhaitee && (
                            <p className="text-2xs text-ardoise-500">{d.heure_souhaitee}</p>
                          )}
                        </div>
                      ) : (
                        <span className="text-ardoise-400">Flexible</span>
                      )}
                    </td>

                    <td className="px-4 py-4 text-xs">
                      {d.date_planifiee ? (
                        <div>
                          <p className="font-semibold text-sauge-700">
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
                        <span className="text-ardoise-400">—</span>
                      )}
                    </td>

                    <td className="px-4 py-4">
                      <Badge ton={STATUT_TONS[d.statut] || "neutre"}>
                        {STATUT_LABELS[d.statut] || d.statut}
                      </Badge>
                    </td>

                    <td className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <Bouton
                          variante="secondaire"
                          taille="sm"
                          onClick={() => setDemandeDetail(d)}
                        >
                          Voir
                        </Bouton>
                        <Bouton
                          variante="primaire"
                          taille="sm"
                          onClick={() => ouvrirTraitement(d)}
                        >
                          {d.statut === "en_attente"
                            ? "Traiter"
                            : d.statut === "planifiee"
                            ? "Mettre à jour"
                            : "Modifier"}
                        </Bouton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Carte>

      {/* ============================================================ Modale Détail */}
      <Modale
        ouverte={demandeDetail != null}
        onFermer={() => setDemandeDetail(null)}
        titre={demandeDetail ? `Rattrapage · ${demandeDetail.etudiant}` : "Détails de la demande"}
        sousTitre={demandeDetail ? `${demandeDetail.classe || ""} · ${demandeDetail.matiere}` : undefined}
        taille="lg"
      >
        {demandeDetail && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 rounded-xl bg-ardoise-50 p-3.5 border border-ardoise-200">
              <div>
                <p className="text-2xs font-semibold uppercase tracking-wider text-ardoise-500">
                  Statut de la demande
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <Badge ton={STATUT_TONS[demandeDetail.statut] || "neutre"}>
                    {STATUT_LABELS[demandeDetail.statut] || demandeDetail.statut}
                  </Badge>
                  <span className="text-xs text-ardoise-500">
                    Reçue le{" "}
                    {new Date(demandeDetail.date_demande).toLocaleDateString("fr-FR", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>

              <Bouton
                variante="primaire"
                taille="sm"
                onClick={() => {
                  const d = demandeDetail;
                  setDemandeDetail(null);
                  ouvrirTraitement(d);
                }}
              >
                Traiter cette demande
              </Bouton>
            </div>

            {/* Détails demandés par l'étudiant */}
            <div className="rounded-xl border border-ardoise-200 p-4 space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-ardoise-500">
                Demande de l'étudiant
              </h4>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 text-xs">
                <div>
                  <span className="text-ardoise-500">Étudiant :</span>{" "}
                  <strong className="text-encre-900">{demandeDetail.etudiant}</strong>
                </div>
                <div>
                  <span className="text-ardoise-500">Classe :</span>{" "}
                  <strong className="text-encre-900">{demandeDetail.classe || "Non assignée"}</strong>
                </div>
                <div>
                  <span className="text-ardoise-500">Motif :</span>{" "}
                  <strong className="text-encre-900">{demandeDetail.motif || "Non spécifié"}</strong>
                </div>
                <div>
                  <span className="text-ardoise-500">Créneau souhaité :</span>{" "}
                  <strong className="text-encre-900">
                    {demandeDetail.date_souhaitee
                      ? `${new Date(demandeDetail.date_souhaitee).toLocaleDateString("fr-FR")} ${
                          demandeDetail.heure_souhaitee ? `(${demandeDetail.heure_souhaitee})` : ""
                        }`
                      : demandeDetail.heure_souhaitee || "Flexible"}
                  </strong>
                </div>
              </div>

              {demandeDetail.message && (
                <div className="pt-2 border-t border-ardoise-100 text-xs">
                  <span className="text-ardoise-500 block mb-1">Message de l'étudiant :</span>
                  <p className="rounded-lg bg-ardoise-50 p-3 text-encre-900 whitespace-pre-wrap leading-relaxed">
                    {demandeDetail.message}
                  </p>
                </div>
              )}
            </div>

            {/* Planification ou réponse actuelle */}
            {(demandeDetail.date_planifiee || demandeDetail.reponse_enseignant) && (
              <div className="rounded-xl border border-ardoise-200 p-4 space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-ardoise-500">
                  Planification et Réponse
                </h4>
                {demandeDetail.date_planifiee && (
                  <div className="rounded-lg bg-sauge-50 p-3 text-xs text-sauge-900 border border-sauge-200">
                    <p className="font-semibold mb-1">Séance planifiée le :</p>
                    <p>
                      <strong>
                        {new Date(demandeDetail.date_planifiee).toLocaleDateString("fr-FR", {
                          weekday: "long",
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                        })}
                      </strong>{" "}
                      de {demandeDetail.heure_debut_planifiee?.substring(0, 5)} à{" "}
                      {demandeDetail.heure_fin_planifiee?.substring(0, 5)}
                      {demandeDetail.salle_planifiee ? ` · Salle : ${demandeDetail.salle_planifiee}` : ""}
                    </p>
                  </div>
                )}
                {demandeDetail.reponse_enseignant && (
                  <div className="rounded-lg bg-ardoise-50 p-3 text-xs text-encre-900 whitespace-pre-wrap">
                    <span className="text-ardoise-500 block font-semibold mb-1">Votre commentaire :</span>
                    {demandeDetail.reponse_enseignant}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Bouton variante="secondaire" onClick={() => setDemandeDetail(null)}>
                Fermer
              </Bouton>
            </div>
          </div>
        )}
      </Modale>

      {/* ============================================================ Modale Traitement / Planification */}
      <Modale
        ouverte={demandeSelectionnee != null}
        onFermer={() => setDemandeSelectionnee(null)}
        titre="Traiter la demande de rattrapage"
        sousTitre={
          demandeSelectionnee
            ? `Étudiant : ${demandeSelectionnee.etudiant} · ${demandeSelectionnee.matiere}`
            : undefined
        }
        taille="lg"
      >
        {demandeSelectionnee && (
          <form onSubmit={soumettreTraitement} className="space-y-4">
            {/* Rappel de la demande */}
            <div className="rounded-xl border border-ardoise-200 bg-ardoise-50/70 p-3.5 text-xs text-ardoise-700">
              <div className="flex items-center justify-between gap-2">
                <span>
                  <strong>Motif :</strong> {demandeSelectionnee.motif || "Accompagnement"}
                </span>
                <span>
                  <strong>Date souhaitée :</strong>{" "}
                  {demandeSelectionnee.date_souhaitee
                    ? new Date(demandeSelectionnee.date_souhaitee).toLocaleDateString("fr-FR")
                    : "Non spécifiée"}
                </span>
              </div>
              {demandeSelectionnee.message && (
                <p className="mt-2 text-2xs italic border-t border-ardoise-200/60 pt-1.5 text-ardoise-600">
                  « {demandeSelectionnee.message} »
                </p>
              )}
            </div>

            {/* Choix de l'action / statut */}
            <div>
              <label className="mb-2 block text-xs font-semibold text-encre-900">
                Action / Décision <span className="text-brique-600">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  {
                    id: "planifiee",
                    label: "Planifier séance",
                    desc: "Fixer date & salle",
                    border: "border-sauge-300",
                    active: "bg-sauge-50 border-sauge-600 text-sauge-950",
                  },
                  {
                    id: "acceptee",
                    label: "Accepter (principe)",
                    desc: "Valider sans créneau",
                    border: "border-indigo-200",
                    active: "bg-indigo-50 border-indigo-600 text-indigo-950",
                  },
                  {
                    id: "terminee",
                    label: "Marquer terminée",
                    desc: "Séance effectuée",
                    border: "border-ardoise-300",
                    active: "bg-ardoise-100 border-ardoise-600 text-encre-900",
                  },
                  {
                    id: "refusee",
                    label: "Refuser",
                    desc: "Indiquer un motif",
                    border: "border-brique-300",
                    active: "bg-brique-50 border-brique-600 text-brique-950",
                  },
                ].map((act) => (
                  <button
                    type="button"
                    key={act.id}
                    onClick={() => setActionStatut(act.id)}
                    className={`rounded-xl border p-3 text-left transition ${
                      actionStatut === act.id ? act.active + " shadow-sm ring-1 ring-offset-1" : "bg-white " + act.border
                    }`}
                  >
                    <p className="font-semibold text-xs">{act.label}</p>
                    <p className="text-2xs text-ardoise-500 mt-0.5">{act.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Champs de planification si action = 'planifiee' */}
            {actionStatut === "planifiee" && (
              <div className="rounded-xl border border-sauge-200 bg-sauge-50/50 p-4 space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-sauge-900">
                  Détails de la séance de rattrapage
                </h4>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-2xs font-semibold text-sauge-950">
                      Date de la séance <span className="text-brique-600">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={datePlanifiee}
                      onChange={(e) => setDatePlanifiee(e.target.value)}
                      className="anneau-focus w-full rounded-lg border border-ardoise-300 bg-white px-3 py-2 text-xs"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-2xs font-semibold text-sauge-950">
                      Heure de début <span className="text-brique-600">*</span>
                    </label>
                    <input
                      type="time"
                      required
                      value={heureDebut}
                      onChange={(e) => setHeureDebut(e.target.value)}
                      className="anneau-focus w-full rounded-lg border border-ardoise-300 bg-white px-3 py-2 text-xs"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-2xs font-semibold text-sauge-950">
                      Heure de fin <span className="text-brique-600">*</span>
                    </label>
                    <input
                      type="time"
                      required
                      value={heureFin}
                      onChange={(e) => setHeureFin(e.target.value)}
                      className="anneau-focus w-full rounded-lg border border-ardoise-300 bg-white px-3 py-2 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-2xs font-semibold text-sauge-950">
                    Salle / Lieu / Lien de visioconférence
                  </label>
                  <input
                    type="text"
                    placeholder="ex. Salle 105, Labo Info 2, ou Google Meet"
                    value={salle}
                    onChange={(e) => setSalle(e.target.value)}
                    className="anneau-focus w-full rounded-lg border border-ardoise-300 bg-white px-3 py-2 text-xs"
                  />
                </div>
              </div>
            )}

            {/* Commentaire / Consignes ou Motif de refus */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-encre-900">
                {actionStatut === "refusee"
                  ? "Motif du refus à l'étudiant *"
                  : "Message / Consignes pour l'étudiant"}
              </label>
              <textarea
                rows={3}
                required={actionStatut === "refusee"}
                value={reponse}
                onChange={(e) => setReponse(e.target.value)}
                placeholder={
                  actionStatut === "refusee"
                    ? "Expliquez la raison du refus (ex. notion déjà traitée en TD, créneaux saturés...)"
                    : "Apportez des précisions sur les chapitres à réviser avant la séance..."
                }
                className="anneau-focus w-full rounded-lg border border-ardoise-300 px-3 py-2 text-sm"
              />
            </div>

            {erreurTraitement && (
              <p className="text-xs font-medium text-brique-600">{erreurTraitement}</p>
            )}

            <div className="flex justify-end gap-2.5 pt-2">
              <Bouton
                variante="secondaire"
                type="button"
                onClick={() => setDemandeSelectionnee(null)}
              >
                Annuler
              </Bouton>
              <Bouton
                variante={actionStatut === "refusee" ? "danger" : "primaire"}
                type="submit"
                chargement={traitementEnCours}
              >
                Confirmer la décision
              </Bouton>
            </div>
          </form>
        )}
      </Modale>
    </CoqueApplication>
  );
}
