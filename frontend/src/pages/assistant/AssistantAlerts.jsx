import { useEffect, useState } from "react";
import CoqueApplication from "../../components/AppShell.jsx";
import { navigationAssistante } from "../../components/navigation.js";
import Card from "../../components/Card.jsx";
import { RiskBadge, TreatmentStatusBadge } from "../../components/StatusBadge.jsx";
import Pagination from "../../components/Pagination.jsx";
import client from "../../api/client.js";

export default function AssistantAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total_pages: 1, total: 0 });
  const [statutFiltre, setStatutFiltre] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchAlerts = (page = 1) => {
    setLoading(true);
    client
      .get("/assistant/alerts", {
        params: {
          page,
          per_page: 15,
          statut: statutFiltre || undefined,
        },
      })
      .then((res) => {
        setAlerts(res.data.items);
        setPagination({
          page: res.data.page,
          total_pages: res.data.total_pages,
          total: res.data.total,
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchAlerts(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statutFiltre]);

  const handleUpdateStatus = async (alertId, newStatus) => {
    try {
      await client.put(`/assistant/alerts/${alertId}`, { statut_traitement: newStatus });
      fetchAlerts(pagination.page);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <CoqueApplication
      titre="Alertes pédagogiques"
      sousTitre="Suivi et traitement des signaux de décrochage"
      sectionsNavigation={navigationAssistante()}
    >
      <Card>
        {/* Filtre par statut */}
        <div className="flex flex-wrap items-center gap-2 border-b border-ardoise-100 pb-4">
          <button
            onClick={() => setStatutFiltre("")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              statutFiltre === ""
                ? "bg-encre-900 text-white"
                : "bg-ardoise-100 text-ardoise-700 hover:bg-ardoise-200"
            }`}
          >
            Toutes les alertes ({pagination.total})
          </button>
          <button
            onClick={() => setStatutFiltre("nouvelle")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              statutFiltre === "nouvelle"
                ? "bg-brique-600 text-white"
                : "bg-brique-50 text-brique-700 hover:bg-brique-100"
            }`}
          >
            Nouvelles
          </button>
          <button
            onClick={() => setStatutFiltre("en_cours")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              statutFiltre === "en_cours"
                ? "bg-ambre-600 text-white"
                : "bg-ambre-50 text-ambre-700 hover:bg-ambre-100"
            }`}
          >
            En cours
          </button>
          <button
            onClick={() => setStatutFiltre("traitee")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              statutFiltre === "traitee"
                ? "bg-emeraude-600 text-white"
                : "bg-emeraude-50 text-emeraude-700 hover:bg-emeraude-100"
            }`}
          >
            Traitées
          </button>
        </div>

        {/* Tableau */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-ardoise-200 text-xs font-semibold uppercase tracking-wider text-ardoise-500">
                <th className="py-3">Étudiant</th>
                <th className="py-3">Classe</th>
                <th className="py-3">Motif de l'alerte</th>
                <th className="py-3">Gravité</th>
                <th className="py-3">Date</th>
                <th className="py-3">Statut actuel</th>
                <th className="py-3 text-right">Changer statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ardoise-100">
              {alerts.map((a) => (
                <tr key={a.id} className="hover:bg-ardoise-50/80 transition-colors">
                  <td className="py-3 font-medium text-encre-900">{a.etudiant}</td>
                  <td className="py-3 text-ardoise-600">{a.classe ?? "-"}</td>
                  <td className="py-3 font-medium text-encre-800">{a.libelle_type}</td>
                  <td className="py-3">
                    <RiskBadge risk={a.niveau_risque} />
                  </td>
                  <td className="py-3 text-xs text-ardoise-400">
                    {a.date_declenchement
                      ? new Date(a.date_declenchement).toLocaleDateString("fr-FR")
                      : "-"}
                  </td>
                  <td className="py-3">
                    <TreatmentStatusBadge status={a.statut_traitement} />
                  </td>
                  <td className="py-3 text-right">
                    <select
                      value={a.statut_traitement}
                      onChange={(e) => handleUpdateStatus(a.id, e.target.value)}
                      className="rounded-md border border-ardoise-300 bg-white px-2 py-1 text-xs text-encre-800 focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="nouvelle">Nouvelle</option>
                      <option value="en_cours">En cours</option>
                      <option value="traitee">Traitée</option>
                    </select>
                  </td>
                </tr>
              ))}
              {!loading && alerts.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-sm text-ardoise-400">
                    Aucune alerte enregistrée.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {pagination.total_pages > 1 && (
          <div className="mt-4 border-t border-ardoise-100 pt-3">
            <Pagination
              page={pagination.page}
              totalPages={pagination.total_pages}
              onPageChange={(p) => fetchAlerts(p)}
            />
          </div>
        )}
      </Card>
    </CoqueApplication>
  );
}
