/**
 * Reclamations — vue d'ensemble administrateur (lecture seule).
 *
 * Depuis la refonte du module, les reclamations sont echangees directement
 * entre l'etudiant et l'enseignant de la matiere concernee ; l'administration
 * garde uniquement un role de supervision (aucune reponse ni changement de
 * statut ne doit transiter par ce compte, pour ne pas court-circuiter
 * l'enseignant responsable).
 *
 * Consomme GET /api/admin/reclamations (liste paginee) et
 * GET /api/admin/reclamations/:id (detail, lecture seule).
 */
import { useEffect, useState } from "react";
import CoqueApplication from "../../components/AppShell.jsx";
import { navigationAdmin } from "../../components/navigation.js";
import Icone from "../../components/ui/Icons.jsx";
import { Modale } from "../../components/ui/Feedback.jsx";
import { Badge, Carte, EtatVide, Selecteur, Squelette } from "../../components/ui/Primitives.jsx";
import Pagination from "../../components/Pagination.jsx";
import client from "../../api/client.js";

const STATUT_LABELS = { nouvelle: "En attente", en_cours: "En cours de traitement", resolue: "Traitee" };
const STATUT_TONS = { nouvelle: "vigilance", en_cours: "info", resolue: "succes" };

export default function AdminReclamations() {
  const [result, setResult] = useState({ items: [], page: 1, pages: 1, total: 0 });
  const [chargement, setChargement] = useState(true);
  const [statutFilter, setStatutFilter] = useState("");
  const [page, setPage] = useState(1);

  const [reclamationOuverte, setReclamationOuverte] = useState(null);
  const [chargementDetail, setChargementDetail] = useState(false);

  const load = (targetPage = page) => {
    setChargement(true);
    client
      .get("/admin/reclamations", { params: { page: targetPage, statut: statutFilter || undefined } })
      .then(({ data }) => setResult(data))
      .finally(() => setChargement(false));
  };

  useEffect(() => {
    load(1);
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statutFilter]);

  useEffect(() => {
    load(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  async function ouvrirDetail(id) {
    setReclamationOuverte({ id, messages: [] });
    setChargementDetail(true);
    try {
      const { data } = await client.get(`/admin/reclamations/${id}`);
      setReclamationOuverte(data);
    } finally {
      setChargementDetail(false);
    }
  }

  return (
    <CoqueApplication
      titre="Reclamations"
      sousTitre="Supervision des echanges entre etudiants et enseignants"
      sectionsNavigation={navigationAdmin()}
      actions={
        <Selecteur
          valeur={statutFilter}
          onChange={setStatutFilter}
          options={[
            { valeur: "", libelle: "Tous les statuts" },
            { valeur: "nouvelle", libelle: STATUT_LABELS.nouvelle },
            { valeur: "en_cours", libelle: STATUT_LABELS.en_cours },
            { valeur: "resolue", libelle: STATUT_LABELS.resolue },
          ]}
        />
      }
    >
      <Carte>
        {chargement ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <Squelette key={index} className="h-16 rounded-lg" />
            ))}
          </div>
        ) : result.items.length === 0 ? (
          <EtatVide
            icone={Icone.Reclamations}
            titre="Aucune reclamation"
            message="Les demandes soumises par les etudiants a leurs enseignants apparaitront ici."
          />
        ) : (
          <ul className="divide-y divide-ardoise-100 text-sm">
            {result.items.map((r) => (
              <li key={r.id}>
                <button
                  onClick={() => ouvrirDetail(r.id)}
                  className="anneau-focus flex w-full items-center justify-between gap-3 py-3 text-left transition-colors hover:text-indigo-trajectoire"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-medium text-encre-900">{r.sujet}</span>
                      <Badge ton={STATUT_TONS[r.statut]}>{STATUT_LABELS[r.statut]}</Badge>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-ardoise-500">
                      {r.etudiant} · {r.classe ?? "Classe inconnue"} ·{" "}
                      {r.matiere ? `${r.matiere} · ` : ""}
                      {r.enseignant ?? "Enseignant non assigne"} ·{" "}
                      {new Date(r.date_creation).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                  <Icone.ChevronDroite className="h-4 w-4 shrink-0 text-ardoise-400" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <Pagination page={result.page} pages={result.pages} total={result.total} onPageChange={setPage} />
      </Carte>

      <Modale
        ouverte={reclamationOuverte != null}
        onFermer={() => setReclamationOuverte(null)}
        titre={reclamationOuverte?.sujet}
        sousTitre={
          reclamationOuverte
            ? `${reclamationOuverte.etudiant ?? ""} · ${reclamationOuverte.classe ?? ""} · ${
                reclamationOuverte.matiere ? `${reclamationOuverte.matiere} · ` : ""
              }${reclamationOuverte.enseignant ?? "Enseignant non assigne"}`
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
                      {m.auteur_role === "etudiant"
                        ? reclamationOuverte.etudiant
                        : reclamationOuverte.enseignant ?? "Enseignant"}{" "}
                      · {new Date(m.date_envoi).toLocaleString("fr-FR")}
                    </p>
                    <p className="mt-1 text-encre-900">{m.message}</p>
                  </div>
                ))}
              </div>
            )}

            <p className="mt-4 border-t border-ardoise-200 pt-3 text-xs text-ardoise-500">
              Echange gere directement entre l'etudiant et l'enseignant concerne — l'administration
              n'y intervient pas.
            </p>
          </div>
        )}
      </Modale>
    </CoqueApplication>
  );
}
