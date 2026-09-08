import { useEffect, useState } from "react";
import CoqueApplication from "../../components/AppShell.jsx";
import { navigationAssistante } from "../../components/navigation.js";
import Card from "../../components/Card.jsx";
import client from "../../api/client.js";
import { Bouton } from "../../components/ui/Primitives.jsx";

export default function AssistantAcademicYears() {
  const [annees, setAnnees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Formulaire création
  const [showModal, setShowModal] = useState(false);
  const [libelle, setLibelle] = useState("");
  const [anneeDebut, setAnneeDebut] = useState(2025);
  const [anneeFin, setAnneeFin] = useState(2026);
  const [statut, setStatut] = useState("active");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadAnnees = () => {
    setLoading(true);
    client
      .get("/assistant/annees-academiques")
      .then((res) => {
        setAnnees(res.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadAnnees();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await client.post("/assistant/annees-academiques", {
        libelle,
        annee_debut: anneeDebut,
        annee_fin: anneeFin,
        statut,
      });
      setShowModal(false);
      setLibelle("");
      loadAnnees();
    } catch (err) {
      setError(err.response?.data?.error || "Erreur lors de la création de l'année académique.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (anneeId, newStatus) => {
    try {
      await client.put(`/assistant/annees-academiques/${anneeId}`, { statut: newStatus });
      loadAnnees();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <CoqueApplication
      titre="Années Académiques"
      sousTitre="Gestion des promotions et des cycles annuels"
      sectionsNavigation={navigationAssistante()}
      actions={
        <Bouton variante="primaire" onClick={() => setShowModal(true)}>
          + Nouvelle Année Académique
        </Bouton>
      }
    >
      <Card title="Historique des sessions académiques">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-ardoise-200 text-xs font-semibold uppercase tracking-wider text-ardoise-500">
                <th className="py-3">Libellé</th>
                <th className="py-3">Début</th>
                <th className="py-3">Fin</th>
                <th className="py-3">Statut actuel</th>
                <th className="py-3 text-right">Changer le statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ardoise-100">
              {annees.map((a) => (
                <tr key={a.id} className="hover:bg-ardoise-50/50">
                  <td className="py-3.5 font-bold text-encre-900">{a.libelle}</td>
                  <td className="py-3.5 text-ardoise-600">{a.annee_debut}</td>
                  <td className="py-3.5 text-ardoise-600">{a.annee_fin}</td>
                  <td className="py-3.5">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        a.statut === "active"
                          ? "bg-emeraude-100 text-emeraude-800 border border-emeraude-200"
                          : a.statut === "a_venir"
                          ? "bg-indigo-100 text-indigo-800 border border-indigo-200"
                          : "bg-ardoise-100 text-ardoise-600 border border-ardoise-200"
                      }`}
                    >
                      {a.statut === "active"
                        ? "Active (En cours)"
                        : a.statut === "a_venir"
                        ? "À venir"
                        : "Clôturée"}
                    </span>
                  </td>
                  <td className="py-3.5 text-right">
                    <select
                      value={a.statut}
                      onChange={(e) => handleStatusChange(a.id, e.target.value)}
                      className="rounded-lg border border-ardoise-300 bg-white px-2.5 py-1 text-xs text-encre-800 focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="active">Active</option>
                      <option value="cloturee">Clôturée</option>
                      <option value="a_venir">À venir</option>
                    </select>
                  </td>
                </tr>
              ))}
              {!loading && annees.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-sm text-ardoise-400">
                    Aucune année académique enregistrée.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modale création */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-encre-950/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-elevee">
            <h3 className="font-display text-lg font-bold text-encre-900">
              Nouvelle Année Académique
            </h3>
            {error && (
              <div className="mt-3 rounded-lg bg-brique-50 p-3 text-xs text-brique-700 border border-brique-200">
                {error}
              </div>
            )}
            <form onSubmit={handleCreate} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-encre-800 mb-1">
                  Libellé de la session *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex : 2026-2027"
                  value={libelle}
                  onChange={(e) => setLibelle(e.target.value)}
                  className="w-full rounded-lg border border-ardoise-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-encre-800 mb-1">
                    Année début *
                  </label>
                  <input
                    type="number"
                    required
                    value={anneeDebut}
                    onChange={(e) => setAnneeDebut(parseInt(e.target.value, 10))}
                    className="w-full rounded-lg border border-ardoise-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-encre-800 mb-1">
                    Année fin *
                  </label>
                  <input
                    type="number"
                    required
                    value={anneeFin}
                    onChange={(e) => setAnneeFin(parseInt(e.target.value, 10))}
                    className="w-full rounded-lg border border-ardoise-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-encre-800 mb-1">Statut</label>
                <select
                  value={statut}
                  onChange={(e) => setStatut(e.target.value)}
                  className="w-full rounded-lg border border-ardoise-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="active">Active (Session en cours)</option>
                  <option value="a_venir">À venir</option>
                  <option value="cloturee">Clôturée</option>
                </select>
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <Bouton type="button" variante="secondaire" onClick={() => setShowModal(false)}>
                  Annuler
                </Bouton>
                <Bouton type="submit" variante="primaire" disabled={submitting}>
                  {submitting ? "Création..." : "Enregistrer"}
                </Bouton>
              </div>
            </form>
          </div>
        </div>
      )}
    </CoqueApplication>
  );
}
