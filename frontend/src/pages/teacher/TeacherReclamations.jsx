/**
 * Reclamations recues par l'enseignant.
 *
 * Chaque reclamation est routee automatiquement vers l'enseignant de la
 * matiere concernee lorsque l'etudiant la soumet (cf. student_routes.py).
 * L'enseignant consulte, repond et fait evoluer le statut ici ; l'etudiant
 * est notifie (pastille sur "Mes reclamations") des qu'une reponse arrive.
 *
 * Consomme GET/PUT /api/teacher/reclamations.
 */
import { useEffect, useState } from "react";
import CoqueApplication from "../../components/AppShell.jsx";
import { navigationEnseignant } from "../../components/navigation.js";
import Icone from "../../components/ui/Icons.jsx";
import { Modale } from "../../components/ui/Feedback.jsx";
import { Badge, Bouton, Carte, EtatVide, Selecteur, Squelette } from "../../components/ui/Primitives.jsx";
import client from "../../api/client.js";

const STATUT_LABELS = { nouvelle: "En attente", en_cours: "En cours de traitement", resolue: "Traitee" };
const STATUT_TONS = { nouvelle: "vigilance", en_cours: "info", resolue: "succes" };

export default function TeacherReclamations() {
  const [reclamations, setReclamations] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [filtreStatut, setFiltreStatut] = useState("");

  const [reclamationOuverte, setReclamationOuverte] = useState(null);
  const [chargementDetail, setChargementDetail] = useState(false);
  const [reponse, setReponse] = useState("");
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [statutEnCours, setStatutEnCours] = useState(false);

  const charger = (statut = filtreStatut) => {
    setChargement(true);
    client
      .get("/teacher/reclamations", { params: { statut: statut || undefined } })
      .then(({ data }) => setReclamations(data))
      .finally(() => setChargement(false));
  };

  useEffect(() => {
    charger(filtreStatut);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtreStatut]);

  async function ouvrirDetail(reclamation) {
    setReclamationOuverte({ ...reclamation, messages: [] });
    setChargementDetail(true);
    setReponse("");
    try {
      const { data } = await client.get(`/teacher/reclamations/${reclamation.id}`);
      setReclamationOuverte(data);
    } finally {
      setChargementDetail(false);
    }
  }

  async function envoyerReponse(e) {
    e.preventDefault();
    if (!reponse.trim()) return;
    setEnvoiEnCours(true);
    try {
      const { data } = await client.post(`/teacher/reclamations/${reclamationOuverte.id}/messages`, {
        message: reponse,
      });
      setReclamationOuverte(data);
      setReponse("");
      charger();
    } finally {
      setEnvoiEnCours(false);
    }
  }

  async function changerStatut(statut) {
    setStatutEnCours(true);
    try {
      await client.put(`/teacher/reclamations/${reclamationOuverte.id}`, { statut });
      setReclamationOuverte((precedent) => ({ ...precedent, statut }));
      charger();
    } finally {
      setStatutEnCours(false);
    }
  }

  const nombreEnAttente = reclamations.filter((r) => r.statut === "nouvelle").length;

  return (
    <CoqueApplication
      titre="Reclamations"
      sousTitre="Demandes soumises par vos etudiants, par matiere"
      sectionsNavigation={navigationEnseignant()}
      actions={
        <Selecteur
          valeur={filtreStatut}
          onChange={setFiltreStatut}
          options={[
            { valeur: "", libelle: "Tous les statuts" },
            { valeur: "nouvelle", libelle: STATUT_LABELS.nouvelle },
            { valeur: "en_cours", libelle: STATUT_LABELS.en_cours },
            { valeur: "resolue", libelle: STATUT_LABELS.resolue },
          ]}
        />
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
            message="Les demandes de vos etudiants sur vos matieres apparaitront ici."
          />
        </Carte>
      ) : (
        <div className="space-y-3">
          {nombreEnAttente > 0 && (
            <p className="text-sm text-ardoise-500">
              {nombreEnAttente} reclamation(s) en attente d'une premiere reponse.
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
                {r.statut === "nouvelle" && (
                  <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-brique-500 ring-2 ring-white" />
                )}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-semibold text-encre-900">{r.sujet}</p>
                  <Badge ton={STATUT_TONS[r.statut]}>{STATUT_LABELS[r.statut]}</Badge>
                </div>
                <p className="mt-1 truncate text-xs text-ardoise-500">
                  {r.etudiant} · {r.classe ?? "Classe inconnue"} · {r.matiere} ·{" "}
                  {new Date(r.date_creation).toLocaleDateString("fr-FR", { day: "2-digit", month: "long" })}
                </p>
              </div>

              <Icone.ChevronDroite className="mt-3 h-4 w-4 shrink-0 text-ardoise-400" />
            </button>
          ))}
        </div>
      )}

      {/* ============================================================ Detail */}
      <Modale
        ouverte={reclamationOuverte != null}
        onFermer={() => setReclamationOuverte(null)}
        titre={reclamationOuverte?.sujet}
        sousTitre={
          reclamationOuverte
            ? `${reclamationOuverte.etudiant} · ${reclamationOuverte.classe ?? ""} · ${
                reclamationOuverte.matiere ?? ""
              }`
            : undefined
        }
        taille="lg"
      >
        {reclamationOuverte && (
          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <Badge ton={STATUT_TONS[reclamationOuverte.statut]}>
                {STATUT_LABELS[reclamationOuverte.statut]}
              </Badge>
              <Selecteur
                valeur={reclamationOuverte.statut}
                onChange={changerStatut}
                disabled={statutEnCours}
                options={[
                  { valeur: "nouvelle", libelle: STATUT_LABELS.nouvelle },
                  { valeur: "en_cours", libelle: STATUT_LABELS.en_cours },
                  { valeur: "resolue", libelle: STATUT_LABELS.resolue },
                ]}
              />
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
                      m.auteur_role === "enseignant" ? "bg-indigo-50" : "bg-ardoise-50"
                    }`}
                  >
                    <p className="text-xs font-medium text-ardoise-500">
                      {m.auteur_role === "enseignant" ? "Vous" : reclamationOuverte.etudiant} ·{" "}
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
                placeholder="Repondre a l'etudiant..."
                className="anneau-focus flex-1 rounded-lg border border-ardoise-300 px-3 py-2 text-sm"
              />
              <Bouton variante="primaire" type="submit" chargement={envoiEnCours}>
                Envoyer
              </Bouton>
            </form>
          </div>
        )}
      </Modale>
    </CoqueApplication>
  );
}
