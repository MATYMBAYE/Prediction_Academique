/**
 * Mes Rattrapages — Espace Étudiant
 *
 * Permet à l'étudiant de :
 *  - Consulter ses demandes de séances de rattrapage et leur statut
 *  - Créer une nouvelle demande de rattrapage adressée à l'enseignant de la matière
 *  - Indiquer un motif, une date/heure souhaitée et un message explicatif
 *  - Consulter les détails d'une demande (décision de l'enseignant, créneau planifié, salle)
 *  - Annuler une demande tant qu'elle est en attente
 */
import { useEffect, useState } from "react";
import CoqueApplication from "../../components/AppShell.jsx";
import { navigationEtudiant } from "../../components/navigation.js";
import Icone from "../../components/ui/Icons.jsx";
import { Badge, Bouton, Carte, CarteStat, EtatVide, Squelette } from "../../components/ui/Primitives.jsx";
import { Modale, ModaleConfirmation, useNotifications } from "../../components/ui/Feedback.jsx";
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

const MOTIFS_SUGGERES = [
  "Difficultés de compréhension sur un chapitre",
  "Absences justifiées à rattraper",
  "Préparation et révisions avant examen",
  "Exercices et travaux dirigés non assimilés",
  "Renforcement méthodologique",
  "Autre motif spécifique",
];

export default function StudentRattrapages() {
  const [demandes, setDemandes] = useState([]);
  const [matieres, setMatieres] = useState([]);
  const [chargement, setChargement] = useState(true);

  // Modale création
  const [modaleCreationOuverte, setModaleCreationOuverte] = useState(false);
  const [form, setForm] = useState({
    matiere: "",
    motif: MOTIFS_SUGGERES[0],
    motifPersonnalise: "",
    date_souhaitee: "",
    heure_souhaitee: "",
    message: "",
  });
  const [erreurForm, setErreurForm] = useState("");
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  // Modale détail
  const [demandeOuverte, setDemandeOuverte] = useState(null);
  const [chargementDetail, setChargementDetail] = useState(false);

  // Modale confirmation annulation
  const [demandeAAnnuler, setDemandeAAnnuler] = useState(null);
  const [annulationEnCours, setAnnulationEnCours] = useState(false);

  // Filtre statut
  const [filtreStatut, setFiltreStatut] = useState("tous");

  const notifications = useNotifications();

  const charger = async () => {
    try {
      const [resDemandes, resMatieres] = await Promise.all([
        client.get("/student/rattrapages"),
        client.get("/student/matieres"),
      ]);
      setDemandes(resDemandes.data);
      setMatieres(resMatieres.data);
    } catch (err) {
      console.error("Erreur chargement rattrapages :", err);
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    charger();
  }, []);

  function ouvrirCreation() {
    setForm({
      matiere: matieres[0]?.matiere ?? "",
      motif: MOTIFS_SUGGERES[0],
      motifPersonnalise: "",
      date_souhaitee: "",
      heure_souhaitee: "",
      message: "",
    });
    setErreurForm("");
    setModaleCreationOuverte(true);
  }

  async function soumettreCreation(e) {
    e.preventDefault();
    setErreurForm("");
    setEnvoiEnCours(true);

    const motifFinal =
      form.motif === "Autre motif spécifique" && form.motifPersonnalise.trim()
        ? form.motifPersonnalise.trim()
        : form.motif;

    try {
      await client.post("/student/rattrapages", {
        matiere: form.matiere,
        motif: motifFinal,
        date_souhaitee: form.date_souhaitee || null,
        heure_souhaitee: form.heure_souhaitee || null,
        message: form.message || null,
      });
      setModaleCreationOuverte(false);
      notifications.succes("Votre demande de rattrapage a été envoyée avec succès à l'enseignant.");
      charger();
    } catch (err) {
      setErreurForm(err.response?.data?.error || "Impossible d'envoyer la demande.");
    } finally {
      setEnvoiEnCours(false);
    }
  }

  async function ouvrirDetail(demande) {
    setDemandeOuverte(demande);
    setChargementDetail(true);
    try {
      const { data } = await client.get(`/student/rattrapages/${demande.id}`);
      setDemandeOuverte(data);
      // Remettre la pastille locale à jour
      setDemandes((prev) =>
        prev.map((d) => (d.id === demande.id ? { ...d, a_nouvelle_reponse: false } : d))
      );
    } catch (err) {
      console.error(err);
    } finally {
      setChargementDetail(false);
    }
  }

  async function confirmerAnnulation() {
    if (!demandeAAnnuler) return;
    setAnnulationEnCours(true);
    try {
      await client.delete(`/student/rattrapages/${demandeAAnnuler.id}`);
      notifications.succes("Demande de rattrapage annulée.");
      setDemandeAAnnuler(null);
      if (demandeOuverte?.id === demandeAAnnuler.id) {
        setDemandeOuverte(null);
      }
      charger();
    } catch (err) {
      notifications.erreur(err.response?.data?.error || "Impossible d'annuler la demande.");
    } finally {
      setAnnulationEnCours(false);
    }
  }

  // Statistiques rapides
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

  const matiereSelectionnee = matieres.find((m) => m.matiere === form.matiere);

  return (
    <CoqueApplication
      titre="Mes séances de rattrapage"
      sousTitre="Demandez et suivez vos séances d'accompagnement et de soutien pédagogique"
      sectionsNavigation={navigationEtudiant()}
      actions={
        <Bouton
          variante="primaire"
          icone={Icone.Ajouter}
          onClick={ouvrirCreation}
          disabled={chargement || matieres.length === 0}
        >
          Demander un rattrapage
        </Bouton>
      }
    >
      {/* ============================================================ Indicateurs Liquid Glass */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <CarteStat
          variante="sombre"
          libelle="Total demandes"
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
      </div>

      {/* ============================================================ Filtres */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5 rounded-xl bg-ardoise-100 p-1">
          {[
            { id: "tous", label: "Toutes" },
            { id: "en_attente", label: "En attente" },
            { id: "planifiee", label: "Planifiées / Validées" },
            { id: "terminee", label: "Terminées" },
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
              titre={demandes.length === 0 ? "Aucune demande de rattrapage" : "Aucune demande dans ce statut"}
              message={
                demandes.length === 0
                  ? "Vous n'avez pas encore formulé de demande de rattrapage. En cas de difficulté sur un cours ou une révision, cliquez sur « Demander un rattrapage »."
                  : "Aucune demande ne correspond au filtre sélectionné."
              }
              action={
                demandes.length === 0 && (
                  <Bouton variante="primaire" icone={Icone.Ajouter} onClick={ouvrirCreation}>
                    Créer ma première demande
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
                  <th className="px-5 py-3.5">Matière & Motif</th>
                  <th className="px-4 py-3.5">Enseignant</th>
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
                    onClick={() => ouvrirDetail(d)}
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-start gap-2.5">
                        {d.a_nouvelle_reponse && (
                          <span
                            className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-isi-bleu animate-pulse"
                            title="Nouvelle réponse de l'enseignant"
                          />
                        )}
                        <div>
                          <p className="font-semibold text-encre-900 group-hover:text-isi-bleu transition-colors">
                            {d.matiere}
                          </p>
                          <p className="mt-0.5 line-clamp-1 text-xs text-ardoise-500">
                            {d.motif || "Séance de renforcement"}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-4 text-xs font-medium text-ardoise-700">
                      {d.enseignant ?? <span className="text-ardoise-400 italic">Non assigné</span>}
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
                        <span className="text-ardoise-400">—</span>
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
                          onClick={() => ouvrirDetail(d)}
                        >
                          Détails
                        </Bouton>
                        {d.statut === "en_attente" && (
                          <Bouton
                            variante="danger"
                            taille="sm"
                            onClick={() => setDemandeAAnnuler(d)}
                          >
                            Annuler
                          </Bouton>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Carte>

      {/* ============================================================ Modale Création */}
      <Modale
        ouverte={modaleCreationOuverte}
        onFermer={() => setModaleCreationOuverte(false)}
        titre="Demander une séance de rattrapage"
        sousTitre="Adressez directement votre demande à l'enseignant concerné"
        taille="lg"
      >
        {matieres.length === 0 ? (
          <EtatVide
            icone={Icone.Matieres}
            titre="Aucune matière disponible"
            message="Aucun enseignant n'est encore affecté à votre classe. Rapprochez-vous de l'administration."
          />
        ) : (
          <form onSubmit={soumettreCreation} className="space-y-4">
            <div className="rounded-xl border border-isi-bleu/20 bg-isi-bleu/5 p-3.5 text-xs leading-relaxed text-isi-bleu">
              <p className="font-semibold mb-0.5">ℹ️ Accompagnement pédagogique ISI-SUPTECH</p>
              Votre demande sera transmise à l'enseignant de la matière sélectionnée. Il pourra la valider, définir une date de séance ou vous apporter des explications.
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-encre-900">
                Matière concernée <span className="text-brique-600">*</span>
              </label>
              <select
                required
                value={form.matiere}
                onChange={(e) => setForm((f) => ({ ...f, matiere: e.target.value }))}
                className="anneau-focus w-full rounded-lg border border-ardoise-300 bg-white px-3 py-2 text-sm text-encre-900"
              >
                {matieres.map((m) => (
                  <option key={m.matiere} value={m.matiere}>
                    {m.matiere} — {m.enseignant ?? "enseignant non assigné"}
                  </option>
                ))}
              </select>
              {matiereSelectionnee?.enseignant && (
                <p className="mt-1 text-2xs text-ardoise-500">
                  Enseignant destinataire : <strong>{matiereSelectionnee.enseignant}</strong>
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-encre-900">
                Motif de la demande <span className="text-brique-600">*</span>
              </label>
              <select
                required
                value={form.motif}
                onChange={(e) => setForm((f) => ({ ...f, motif: e.target.value }))}
                className="anneau-focus w-full rounded-lg border border-ardoise-300 bg-white px-3 py-2 text-sm text-encre-900"
              >
                {MOTIFS_SUGGERES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            {form.motif === "Autre motif spécifique" && (
              <div>
                <label className="mb-1 block text-xs font-semibold text-encre-900">
                  Précisez votre motif <span className="text-brique-600">*</span>
                </label>
                <input
                  required
                  value={form.motifPersonnalise}
                  onChange={(e) => setForm((f) => ({ ...f, motifPersonnalise: e.target.value }))}
                  placeholder="ex. Révision sur le chapitre Réseaux TCP/IP"
                  className="anneau-focus w-full rounded-lg border border-ardoise-300 px-3 py-2 text-sm"
                />
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-encre-900">
                  Date souhaitée <span className="text-xs font-normal text-ardoise-400">(optionnel)</span>
                </label>
                <input
                  type="date"
                  min={new Date().toISOString().split("T")[0]}
                  value={form.date_souhaitee}
                  onChange={(e) => setForm((f) => ({ ...f, date_souhaitee: e.target.value }))}
                  className="anneau-focus w-full rounded-lg border border-ardoise-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-encre-900">
                  Créneau ou heure souhaitée <span className="text-xs font-normal text-ardoise-400">(optionnel)</span>
                </label>
                <input
                  type="text"
                  placeholder="ex. 14h - 16h ou Mercredi après-midi"
                  value={form.heure_souhaitee}
                  onChange={(e) => setForm((f) => ({ ...f, heure_souhaitee: e.target.value }))}
                  className="anneau-focus w-full rounded-lg border border-ardoise-300 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-encre-900">
                Informations complémentaires / Message
              </label>
              <textarea
                rows={3}
                value={form.message}
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                placeholder="Détaillez les points ou exercices que vous souhaitez aborder..."
                className="anneau-focus w-full rounded-lg border border-ardoise-300 px-3 py-2 text-sm"
              />
            </div>

            {erreurForm && <p className="text-xs font-medium text-brique-600">{erreurForm}</p>}

            <div className="flex justify-end gap-2.5 pt-2">
              <Bouton
                variante="secondaire"
                type="button"
                onClick={() => setModaleCreationOuverte(false)}
              >
                Annuler
              </Bouton>
              <Bouton variante="primaire" type="submit" chargement={envoiEnCours}>
                Envoyer la demande
              </Bouton>
            </div>
          </form>
        )}
      </Modale>

      {/* ============================================================ Modale Détail */}
      <Modale
        ouverte={demandeOuverte != null}
        onFermer={() => setDemandeOuverte(null)}
        titre={demandeOuverte ? `Rattrapage · ${demandeOuverte.matiere}` : "Détail du rattrapage"}
        sousTitre={
          demandeOuverte?.enseignant
            ? `Enseignant : ${demandeOuverte.enseignant}`
            : "Détails de la demande"
        }
        taille="lg"
      >
        {demandeOuverte && (
          <div className="space-y-5">
            {/* Statut header */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-ardoise-50 p-4 border border-ardoise-200">
              <div>
                <p className="text-2xs font-semibold uppercase tracking-wider text-ardoise-500">
                  État de la demande
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <Badge ton={STATUT_TONS[demandeOuverte.statut] || "neutre"}>
                    {STATUT_LABELS[demandeOuverte.statut] || demandeOuverte.statut}
                  </Badge>
                  <span className="text-xs text-ardoise-500">
                    Demandé le{" "}
                    {new Date(demandeOuverte.date_demande).toLocaleDateString("fr-FR", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>

              {demandeOuverte.statut === "en_attente" && (
                <Bouton
                  variante="danger"
                  taille="sm"
                  onClick={() => setDemandeAAnnuler(demandeOuverte)}
                >
                  Annuler la demande
                </Bouton>
              )}
            </div>

            {/* Séance planifiée si planifiée */}
            {(demandeOuverte.statut === "planifiee" || demandeOuverte.statut === "programmee" || demandeOuverte.date_planifiee) && (
              <div className="rounded-xl border border-sauge-200 bg-sauge-50 p-4 text-sm text-sauge-900">
                <div className="flex items-center gap-2 font-semibold">
                  <Icone.Presence className="h-5 w-5 text-sauge-700" />
                  <span>Séance de rattrapage confirmée et planifiée</span>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-3 text-xs">
                  <div>
                    <span className="text-sauge-600 block">Date de la séance :</span>
                    <strong className="text-sm">
                      {demandeOuverte.date_planifiee
                        ? new Date(demandeOuverte.date_planifiee).toLocaleDateString("fr-FR", {
                            weekday: "long",
                            day: "2-digit",
                            month: "long",
                            year: "numeric",
                          })
                        : "À confirmer"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-sauge-600 block">Horaire :</span>
                    <strong className="text-sm">
                      {demandeOuverte.heure_debut_planifiee?.substring(0, 5) ?? "—"} à{" "}
                      {demandeOuverte.heure_fin_planifiee?.substring(0, 5) ?? "—"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-sauge-600 block">Lieu / Salle :</span>
                    <strong className="text-sm">{demandeOuverte.salle_planifiee || "Salle non définie"}</strong>
                  </div>
                </div>
              </div>
            )}

            {/* Motif et message de l'étudiant */}
            <div className="rounded-xl border border-ardoise-200 p-4 space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-ardoise-500">
                Votre demande
              </h4>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 text-xs">
                <div>
                  <span className="text-ardoise-500">Motif :</span>{" "}
                  <strong className="text-encre-900">{demandeOuverte.motif || "Non spécifié"}</strong>
                </div>
                <div>
                  <span className="text-ardoise-500">Créneau souhaité :</span>{" "}
                  <strong className="text-encre-900">
                    {demandeOuverte.date_souhaitee
                      ? `${new Date(demandeOuverte.date_souhaitee).toLocaleDateString("fr-FR")} ${
                          demandeOuverte.heure_souhaitee ? `(${demandeOuverte.heure_souhaitee})` : ""
                        }`
                      : demandeOuverte.heure_souhaitee || "Flexible"}
                  </strong>
                </div>
              </div>
              {demandeOuverte.message && (
                <div className="pt-2 border-t border-ardoise-100 text-xs">
                  <span className="text-ardoise-500 block mb-1">Message d'accompagnement :</span>
                  <p className="rounded-lg bg-ardoise-50 p-2.5 text-encre-900 whitespace-pre-wrap leading-relaxed">
                    {demandeOuverte.message}
                  </p>
                </div>
              )}
            </div>

            {/* Réponse / Consignes de l'enseignant */}
            <div className="rounded-xl border border-ardoise-200 p-4 space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-ardoise-500">
                Retour de l'enseignant
              </h4>
              {demandeOuverte.reponse_enseignant ? (
                <div
                  className={`rounded-lg p-3 text-xs leading-relaxed whitespace-pre-wrap ${
                    demandeOuverte.statut === "refusee"
                      ? "bg-brique-50 text-brique-900 border border-brique-200"
                      : "bg-indigo-50 text-indigo-950 border border-indigo-100"
                  }`}
                >
                  <p className="font-semibold mb-1">
                    {demandeOuverte.statut === "refusee" ? "Motif du refus :" : "Commentaire / Consignes :"}
                  </p>
                  {demandeOuverte.reponse_enseignant}
                </div>
              ) : (
                <p className="text-xs italic text-ardoise-500">
                  {demandeOuverte.statut === "en_attente"
                    ? "En attente de retour de votre enseignant."
                    : "Aucun commentaire supplémentaire laissé par l'enseignant."}
                </p>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Bouton variante="secondaire" onClick={() => setDemandeOuverte(null)}>
                Fermer
              </Bouton>
            </div>
          </div>
        )}
      </Modale>

      {/* ============================================================ Confirmation Annulation */}
      <ModaleConfirmation
        ouverte={demandeAAnnuler != null}
        onFermer={() => setDemandeAAnnuler(null)}
        onConfirmer={confirmerAnnulation}
        titre="Annuler la demande de rattrapage"
        message={
          demandeAAnnuler
            ? `Êtes-vous sûr de vouloir annuler votre demande de rattrapage en ${demandeAAnnuler.matiere} ?`
            : ""
        }
        libelleConfirmer="Oui, annuler"
        danger
        chargement={annulationEnCours}
      />
    </CoqueApplication>
  );
}
