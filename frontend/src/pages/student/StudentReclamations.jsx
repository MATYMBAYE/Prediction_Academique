/**
 * Reclamations de l'etudiant.
 *
 * Depuis la refonte du module, une reclamation est adressee directement a
 * l'enseignant de la matiere concernee (plutot qu'a l'administration) : le
 * formulaire de creation demande donc la matiere en premier, ce qui
 * determine automatiquement le destinataire.
 *
 * Consomme GET/POST /api/student/reclamations, GET /api/student/matieres.
 */
import { useEffect, useState } from "react";
import CoqueApplication from "../../components/AppShell.jsx";
import { navigationEtudiant } from "../../components/navigation.js";
import Icone from "../../components/ui/Icons.jsx";
import { Modale, useNotifications } from "../../components/ui/Feedback.jsx";
import { Badge, Bouton, Carte, EtatVide, Squelette } from "../../components/ui/Primitives.jsx";
import client from "../../api/client.js";

const STATUT_LABELS = { nouvelle: "En attente", en_cours: "En cours de traitement", resolue: "Traitee" };
const STATUT_TONS = { nouvelle: "vigilance", en_cours: "info", resolue: "succes" };

export default function StudentReclamations() {
  const [reclamations, setReclamations] = useState([]);
  const [matieres, setMatieres] = useState([]);
  const [chargement, setChargement] = useState(true);

  const [modaleCreationOuverte, setModaleCreationOuverte] = useState(false);
  const [form, setForm] = useState({ matiere: "", sujet: "", message: "" });
  const [erreurForm, setErreurForm] = useState("");
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  const [reclamationOuverte, setReclamationOuverte] = useState(null);
  const [chargementDetail, setChargementDetail] = useState(false);
  const [reponse, setReponse] = useState("");
  const [envoiReponseEnCours, setEnvoiReponseEnCours] = useState(false);

  const notifications = useNotifications();

  const charger = () =>
    client.get("/student/reclamations").then(({ data }) => {
      setReclamations(data);
      setChargement(false);
    });

  useEffect(() => {
    charger();
    client.get("/student/matieres").then(({ data }) => setMatieres(data));
  }, []);

  async function ouvrirCreation() {
    setForm({ matiere: matieres[0]?.matiere ?? "", sujet: "", message: "" });
    setErreurForm("");
    setModaleCreationOuverte(true);
  }

  async function soumettreCreation(e) {
    e.preventDefault();
    setErreurForm("");
    setEnvoiEnCours(true);
    try {
      await client.post("/student/reclamations", form);
      setModaleCreationOuverte(false);
      notifications.succes("Reclamation envoyee a l'enseignant concerne.");
      charger();
    } catch (exception) {
      setErreurForm(exception.response?.data?.error || "Impossible d'envoyer la reclamation.");
    } finally {
      setEnvoiEnCours(false);
    }
  }

  async function ouvrirDetail(reclamation) {
    setReclamationOuverte({ ...reclamation, messages: [] });
    setChargementDetail(true);
    setReponse("");
    try {
      const { data } = await client.get(`/student/reclamations/${reclamation.id}`);
      setReclamationOuverte(data);
      // La lecture marque la reponse comme vue cote serveur ; on reflete
      // immediatement l'etat dans la liste sans recharger tout le monde.
      setReclamations((precedent) =>
        precedent.map((r) => (r.id === reclamation.id ? { ...r, a_nouvelle_reponse: false } : r))
      );
    } finally {
      setChargementDetail(false);
    }
  }

  async function envoyerReponse(e) {
    e.preventDefault();
    if (!reponse.trim()) return;
    setEnvoiReponseEnCours(true);
    try {
      await client.post(`/student/reclamations/${reclamationOuverte.id}/messages`, { message: reponse });
      const { data } = await client.get(`/student/reclamations/${reclamationOuverte.id}`);
      setReclamationOuverte(data);
      setReponse("");
      charger();
    } finally {
      setEnvoiReponseEnCours(false);
    }
  }

  const nombreNonLues = reclamations.filter((r) => r.a_nouvelle_reponse).length;

  return (
    <CoqueApplication
      titre="Mes reclamations"
      sousTitre="Echangez directement avec l'enseignant de la matiere concernee"
      sectionsNavigation={navigationEtudiant()}
      actions={
        <Bouton variante="primaire" taille="sm" icone={Icone.Ajouter} onClick={ouvrirCreation}>
          Nouvelle reclamation
        </Bouton>
      }
    >
      {chargement ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Squelette key={index} className="h-24 rounded-card" />
          ))}
        </div>
      ) : reclamations.length === 0 ? (
        <Carte>
          <EtatVide
            icone={Icone.Reclamations}
            titre="Aucune reclamation"
            message="En cas de probleme sur une note, une absence ou tout autre sujet lie a un cours, adressez-vous directement a l'enseignant concerne."
            action={
              <Bouton variante="secondaire" onClick={ouvrirCreation}>
                Soumettre une reclamation
              </Bouton>
            }
          />
        </Carte>
      ) : (
        <div className="space-y-3">
          {nombreNonLues > 0 && (
            <p className="text-sm text-ardoise-500">
              {nombreNonLues} reclamation(s) avec une nouvelle reponse de l'enseignant.
            </p>
          )}
          {reclamations.map((r) => (
            <button
              key={r.id}
              onClick={() => ouvrirDetail(r)}
              className="anneau-focus flex w-full items-start gap-4 rounded-2xl border border-ardoise-200
                bg-white p-5 text-left shadow-subtile transition-all duration-200 ease-douce
                hover:-translate-y-0.5 hover:shadow-card"
            >
              <span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-trajectoire">
                <Icone.Reclamations className="h-5 w-5" />
                {r.a_nouvelle_reponse && (
                  <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-brique-500 ring-2 ring-white" />
                )}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-semibold text-encre-900">{r.sujet}</p>
                  <Badge ton={STATUT_TONS[r.statut]}>{STATUT_LABELS[r.statut]}</Badge>
                  {r.a_nouvelle_reponse && (
                    <Badge ton="alerte" pastille>
                      Nouvelle reponse
                    </Badge>
                  )}
                </div>
                <p className="mt-1 truncate text-xs text-ardoise-500">
                  {r.matiere ? `${r.matiere} · ` : ""}
                  {r.enseignant ?? "Enseignant non assigne"} ·{" "}
                  {new Date(r.date_creation).toLocaleDateString("fr-FR", { day: "2-digit", month: "long" })}
                </p>
              </div>

              <Icone.ChevronDroite className="mt-3 h-4 w-4 shrink-0 text-ardoise-400" />
            </button>
          ))}
        </div>
      )}

      {/* ================================================== Nouvelle reclamation */}
      <Modale
        ouverte={modaleCreationOuverte}
        onFermer={() => setModaleCreationOuverte(false)}
        titre="Nouvelle reclamation"
        sousTitre="Choisissez la matiere concernee : l'enseignant correspondant recevra votre demande"
        taille="md"
      >
        {matieres.length === 0 ? (
          <EtatVide
            icone={Icone.Matieres}
            titre="Aucune matiere disponible"
            message="Aucun enseignant n'est encore affecte a votre classe. Rapprochez-vous de l'administration."
          />
        ) : (
          <form onSubmit={soumettreCreation} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-encre-900">Matiere</label>
              <select
                required
                value={form.matiere}
                onChange={(e) => setForm((f) => ({ ...f, matiere: e.target.value }))}
                className="anneau-focus w-full rounded-lg border border-ardoise-300 px-3 py-2 text-sm"
              >
                {matieres.map((m) => (
                  <option key={m.matiere} value={m.matiere}>
                    {m.matiere} — {m.enseignant ?? "enseignant non assigne"}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-encre-900">Sujet</label>
              <input
                required
                value={form.sujet}
                onChange={(e) => setForm((f) => ({ ...f, sujet: e.target.value }))}
                placeholder="ex. Erreur sur une note d'examen"
                className="anneau-focus w-full rounded-lg border border-ardoise-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-encre-900">Message</label>
              <textarea
                required
                rows={4}
                value={form.message}
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                className="anneau-focus w-full rounded-lg border border-ardoise-300 px-3 py-2 text-sm"
              />
            </div>
            {erreurForm && <p className="text-sm text-brique-600">{erreurForm}</p>}
            <div className="flex justify-end gap-2">
              <Bouton variante="secondaire" type="button" onClick={() => setModaleCreationOuverte(false)}>
                Annuler
              </Bouton>
              <Bouton variante="primaire" type="submit" chargement={envoiEnCours}>
                Envoyer
              </Bouton>
            </div>
          </form>
        )}
      </Modale>

      {/* ============================================================ Detail */}
      <Modale
        ouverte={reclamationOuverte != null}
        onFermer={() => setReclamationOuverte(null)}
        titre={reclamationOuverte?.sujet}
        sousTitre={
          reclamationOuverte
            ? `${reclamationOuverte.matiere ? `${reclamationOuverte.matiere} · ` : ""}${
                reclamationOuverte.enseignant ?? "Enseignant non assigne"
              }`
            : undefined
        }
        taille="lg"
      >
        {reclamationOuverte && (
          <div>
            <div className="mb-3">
              <Badge ton={STATUT_TONS[reclamationOuverte.statut]}>
                {STATUT_LABELS[reclamationOuverte.statut]}
              </Badge>
            </div>

            {chargementDetail ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Squelette key={index} className="h-14 rounded-lg" />
                ))}
              </div>
            ) : (
              <div className="max-h-96 space-y-3 overflow-y-auto">
                {reclamationOuverte.messages.map((m) => (
                  <div
                    key={m.id}
                    className={`rounded-lg p-3 text-sm ${
                      m.auteur_role === "etudiant" ? "bg-ardoise-50" : "bg-indigo-50"
                    }`}
                  >
                    <p className="text-xs font-medium text-ardoise-500">
                      {m.auteur_role === "etudiant" ? "Vous" : reclamationOuverte.enseignant ?? "Enseignant"} ·{" "}
                      {new Date(m.date_envoi).toLocaleString("fr-FR")}
                    </p>
                    <p className="mt-1 text-encre-900">{m.message}</p>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={envoyerReponse} className="mt-4 flex gap-2 border-t border-ardoise-200 pt-4">
              <input
                value={reponse}
                onChange={(e) => setReponse(e.target.value)}
                placeholder="Repondre a l'enseignant..."
                className="anneau-focus flex-1 rounded-lg border border-ardoise-300 px-3 py-2 text-sm"
              />
              <Bouton variante="primaire" type="submit" chargement={envoiReponseEnCours}>
                Envoyer
              </Bouton>
            </form>
          </div>
        )}
      </Modale>
    </CoqueApplication>
  );
}
