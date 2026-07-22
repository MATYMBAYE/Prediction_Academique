import { useEffect, useState } from "react";
import DashboardLayout from "../../components/DashboardLayout.jsx";
import Card from "../../components/Card.jsx";
import Button from "../../components/Button.jsx";
import client from "../../api/client.js";
import { STUDENT_NAV_ITEMS } from "./studentNav.js";

const STATUT_LABELS = { nouvelle: "Nouvelle", en_cours: "En cours", resolue: "Resolue" };
const STATUT_STYLES = {
  nouvelle: "bg-ambre-vigilance/10 text-ambre-vigilance",
  en_cours: "bg-indigo-trajectoire/10 text-indigo-trajectoire",
  resolue: "bg-sauge-reussite/10 text-sauge-reussite",
};

export default function StudentReclamations() {
  const [reclamations, setReclamations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ sujet: "", message: "" });
  const [reply, setReply] = useState("");
  const [error, setError] = useState("");

  const load = () => client.get("/student/reclamations").then(({ data }) => setReclamations(data));

  useEffect(() => {
    load();
  }, []);

  const openDetail = async (id) => {
    const { data } = await client.get(`/student/reclamations/${id}`);
    setSelected(data);
  };

  const submitNew = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await client.post("/student/reclamations", form);
      setForm({ sujet: "", message: "" });
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.response?.data?.error || "Impossible d'envoyer la reclamation.");
    }
  };

  const submitReply = async (e) => {
    e.preventDefault();
    if (!reply.trim()) return;
    await client.post(`/student/reclamations/${selected.id}/messages`, { message: reply });
    setReply("");
    const { data } = await client.get(`/student/reclamations/${selected.id}`);
    setSelected(data);
    load();
  };

  return (
    <DashboardLayout title="Tableau de bord" navItems={STUDENT_NAV_ITEMS}>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-semibold text-encre-nocturne">Mes reclamations</h1>
        <Button onClick={() => setShowForm((v) => !v)}>{showForm ? "Annuler" : "Nouvelle reclamation"}</Button>
      </div>

      {showForm && (
        <Card className="mt-4" title="Soumettre une reclamation">
          <form onSubmit={submitNew} className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-encre-nocturne">Sujet</label>
              <input
                required
                value={form.sujet}
                onChange={(e) => setForm((f) => ({ ...f, sujet: e.target.value }))}
                className="focus-ring w-full rounded-md border border-encre-nocturne/20 px-3 py-2 text-sm"
                placeholder="ex. Erreur sur une note d'examen"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-encre-nocturne">Message</label>
              <textarea
                required
                rows={4}
                value={form.message}
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                className="focus-ring w-full rounded-md border border-encre-nocturne/20 px-3 py-2 text-sm"
              />
            </div>
            {error && <p className="text-sm text-brique-alerte">{error}</p>}
            <Button type="submit">Envoyer</Button>
          </form>
        </Card>
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card title="Historique">
          <ul className="divide-y divide-encre-nocturne/10 text-sm">
            {reclamations.map((r) => (
              <li key={r.id} className="py-2">
                <button onClick={() => openDetail(r.id)} className="w-full text-left hover:text-indigo-trajectoire">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{r.sujet}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${STATUT_STYLES[r.statut]}`}>
                      {STATUT_LABELS[r.statut]}
                    </span>
                  </div>
                  <span className="text-xs text-encre-nocturne/50">
                    {new Date(r.date_creation).toLocaleDateString("fr-FR")}
                  </span>
                </button>
              </li>
            ))}
            {reclamations.length === 0 && (
              <li className="py-6 text-center text-encre-nocturne/50">Aucune reclamation pour le moment.</li>
            )}
          </ul>
        </Card>

        <Card title={selected ? selected.sujet : "Detail"}>
          {!selected ? (
            <p className="text-sm text-encre-nocturne/50">Selectionnez une reclamation pour voir l'echange.</p>
          ) : (
            <div>
              <div className="max-h-64 space-y-3 overflow-y-auto">
                {selected.messages.map((m) => (
                  <div
                    key={m.id}
                    className={`rounded-md p-2 text-sm ${m.auteur_role === "etudiant" ? "bg-brume-academique" : "bg-indigo-trajectoire/10"}`}
                  >
                    <p className="text-xs font-medium text-encre-nocturne/60">
                      {m.auteur_role === "etudiant" ? "Vous" : "Administration"} ·{" "}
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
                  placeholder="Repondre..."
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
