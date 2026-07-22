import { useEffect, useState } from "react";
import DashboardLayout from "../../components/DashboardLayout.jsx";
import Card from "../../components/Card.jsx";
import Button from "../../components/Button.jsx";
import Pagination from "../../components/Pagination.jsx";
import client from "../../api/client.js";
import { ADMIN_NAV_ITEMS } from "./adminNav.jsx";

const STATUT_LABELS = { nouvelle: "Nouvelle", en_cours: "En cours", resolue: "Resolue" };
const STATUT_STYLES = {
  nouvelle: "bg-ambre-vigilance/10 text-ambre-vigilance",
  en_cours: "bg-indigo-trajectoire/10 text-indigo-trajectoire",
  resolue: "bg-sauge-reussite/10 text-sauge-reussite",
};

export default function AdminReclamations() {
  const [result, setResult] = useState({ items: [], page: 1, pages: 1, total: 0 });
  const [statutFilter, setStatutFilter] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [reply, setReply] = useState("");

  const load = (targetPage = page) => {
    client
      .get("/admin/reclamations", { params: { page: targetPage, statut: statutFilter || undefined } })
      .then(({ data }) => setResult(data));
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

  const openDetail = async (id) => {
    const { data } = await client.get(`/admin/reclamations/${id}`);
    setSelected(data);
  };

  const submitReply = async (e) => {
    e.preventDefault();
    if (!reply.trim()) return;
    const { data } = await client.post(`/admin/reclamations/${selected.id}/messages`, { message: reply });
    setSelected(data);
    setReply("");
    load();
  };

  const updateStatut = async (statut) => {
    await client.put(`/admin/reclamations/${selected.id}`, { statut });
    const { data } = await client.get(`/admin/reclamations/${selected.id}`);
    setSelected(data);
    load();
  };

  return (
    <DashboardLayout title="Espace Administration" navItems={ADMIN_NAV_ITEMS}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-xl font-semibold text-encre-nocturne">Reclamations</h1>
        <select
          value={statutFilter}
          onChange={(e) => setStatutFilter(e.target.value)}
          className="focus-ring rounded-md border border-encre-nocturne/20 px-3 py-1.5 text-sm"
        >
          <option value="">Tous les statuts</option>
          {Object.entries(STATUT_LABELS).map(([k, label]) => (
            <option key={k} value={k}>{label}</option>
          ))}
        </select>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card title="Liste des reclamations">
          <ul className="divide-y divide-encre-nocturne/10 text-sm">
            {result.items.map((r) => (
              <li key={r.id} className="py-2">
                <button onClick={() => openDetail(r.id)} className="w-full text-left hover:text-indigo-trajectoire">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{r.sujet}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${STATUT_STYLES[r.statut]}`}>
                      {STATUT_LABELS[r.statut]}
                    </span>
                  </div>
                  <span className="text-xs text-encre-nocturne/50">
                    {r.etudiant} · {new Date(r.date_creation).toLocaleDateString("fr-FR")}
                  </span>
                </button>
              </li>
            ))}
            {result.items.length === 0 && (
              <li className="py-6 text-center text-encre-nocturne/50">Aucune reclamation.</li>
            )}
          </ul>
          <Pagination page={result.page} pages={result.pages} total={result.total} onPageChange={setPage} />
        </Card>

        <Card title={selected ? selected.sujet : "Detail"}>
          {!selected ? (
            <p className="text-sm text-encre-nocturne/50">Selectionnez une reclamation pour repondre.</p>
          ) : (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs text-encre-nocturne/60">{selected.etudiant}</span>
                <select
                  value={selected.statut}
                  onChange={(e) => updateStatut(e.target.value)}
                  className="focus-ring rounded-md border border-encre-nocturne/20 px-2 py-1 text-xs"
                >
                  {Object.entries(STATUT_LABELS).map(([k, label]) => (
                    <option key={k} value={k}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="max-h-64 space-y-3 overflow-y-auto">
                {selected.messages.map((m) => (
                  <div
                    key={m.id}
                    className={`rounded-md p-2 text-sm ${m.auteur_role === "admin" ? "bg-brume-academique" : "bg-indigo-trajectoire/10"}`}
                  >
                    <p className="text-xs font-medium text-encre-nocturne/60">
                      {m.auteur_role === "admin" ? "Administration" : selected.etudiant} ·{" "}
                      {new Date(m.date_envoi).toLocaleString("fr-FR")}
                    </p>
                    <p className="mt-1">{m.message}</p>
                  </div>
                ))}
              </div>
              <form onSubmit={submitReply} className="mt-3 flex gap-2">
                <input
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Repondre a l'etudiant..."
                  className="focus-ring flex-1 rounded-md border border-encre-nocturne/20 px-3 py-2 text-sm"
                />
                <Button type="submit">Envoyer</Button>
              </form>
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
