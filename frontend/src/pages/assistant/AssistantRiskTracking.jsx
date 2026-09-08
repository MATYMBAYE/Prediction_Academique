import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import CoqueApplication from "../../components/AppShell.jsx";
import { navigationAssistante } from "../../components/navigation.js";
import Card from "../../components/Card.jsx";
import { RiskBadge } from "../../components/StatusBadge.jsx";
import Pagination from "../../components/Pagination.jsx";
import client from "../../api/client.js";

export default function AssistantRiskTracking() {
  const [students, setStudents] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total_pages: 1, total: 0 });
  const [niveauRisque, setNiveauRisque] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchRiskStudents = (page = 1) => {
    setLoading(true);
    client
      .get("/assistant/students-at-risk", {
        params: {
          page,
          per_page: 15,
          niveau_risque: niveauRisque || undefined,
        },
      })
      .then((res) => {
        setStudents(res.data.items);
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
    fetchRiskStudents(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [niveauRisque]);

  return (
    <CoqueApplication
      titre="Étudiants à risque d'échec"
      sousTitre={`${pagination.total} étudiant(s) identifié(s) en difficulté`}
      sectionsNavigation={navigationAssistante()}
    >
      <Card>
        {/* Filtre par sévérité */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-ardoise-100 pb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setNiveauRisque("")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                niveauRisque === ""
                  ? "bg-encre-900 text-white"
                  : "bg-ardoise-100 text-ardoise-700 hover:bg-ardoise-200"
              }`}
            >
              Tous les niveaux ({pagination.total})
            </button>
            <button
              onClick={() => setNiveauRisque("eleve")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                niveauRisque === "eleve"
                  ? "bg-brique-600 text-white"
                  : "bg-brique-50 text-brique-700 hover:bg-brique-100"
              }`}
            >
              Risque Élevé
            </button>
            <button
              onClick={() => setNiveauRisque("moyen")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                niveauRisque === "moyen"
                  ? "bg-ambre-600 text-white"
                  : "bg-ambre-50 text-ambre-700 hover:bg-ambre-100"
              }`}
            >
              Risque Moyen
            </button>
          </div>
        </div>

        {/* Tableau */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-ardoise-200 text-xs font-semibold uppercase tracking-wider text-ardoise-500">
                <th className="py-3">Étudiant</th>
                <th className="py-3">Classe</th>
                <th className="py-3">Moyenne</th>
                <th className="py-3">Assiduité</th>
                <th className="py-3">Probabilité de réussite</th>
                <th className="py-3">Niveau de risque</th>
                <th className="py-3 text-right">Action pédagogique</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ardoise-100">
              {students.map((s) => (
                <tr key={s.id} className="hover:bg-ardoise-50/80 transition-colors">
                  <td className="py-3.5 font-medium text-encre-900">
                    {s.prenom} {s.nom}
                    <span className="block font-mono text-2xs text-ardoise-400">{s.matricule}</span>
                  </td>
                  <td className="py-3.5 text-ardoise-600">{s.classe || "-"}</td>
                  <td className="py-3.5 font-semibold text-encre-800">
                    {s.moyenne_generale !== null ? `${s.moyenne_generale.toFixed(1)}/20` : "-"}
                  </td>
                  <td className="py-3.5 text-ardoise-600">
                    {s.taux_assiduite !== null ? `${s.taux_assiduite.toFixed(0)}%` : "-"}
                  </td>
                  <td className="py-3.5 font-mono text-xs font-bold text-encre-900">
                    {(s.probabilite_reussite * 100).toFixed(1)}%
                  </td>
                  <td className="py-3.5">
                    <RiskBadge risk={s.niveau_risque} />
                  </td>
                  <td className="py-3.5 text-right">
                    <Link
                      to={`/assistante/etudiants/${s.id}`}
                      className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-100 transition-colors"
                    >
                      Suivi & Actions →
                    </Link>
                  </td>
                </tr>
              ))}
              {!loading && students.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-sm text-ardoise-400">
                    Aucun étudiant à risque dans cette catégorie.
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
              onPageChange={(p) => fetchRiskStudents(p)}
            />
          </div>
        )}
      </Card>
    </CoqueApplication>
  );
}
