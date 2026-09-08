import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import CoqueApplication from "../../components/AppShell.jsx";
import { navigationAssistante } from "../../components/navigation.js";
import Card from "../../components/Card.jsx";
import Button from "../../components/Button.jsx";
import { RiskBadge } from "../../components/StatusBadge.jsx";
import Pagination from "../../components/Pagination.jsx";
import StudentImportModal from "../../components/StudentImportModal.jsx";
import client from "../../api/client.js";
import Icone from "../../components/ui/Icons.jsx";

export default function AssistantStudents() {
  const [students, setStudents] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total_pages: 1, total: 0 });
  const [filieres, setFilieres] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const [search, setSearch] = useState("");
  const [filiereId, setFiliereId] = useState("");
  const [niveau, setNiveau] = useState("");
  const [risque, setRisque] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    Promise.all([client.get("/assistant/filieres"), client.get("/assistant/classes")]).then(
      ([fRes, cRes]) => {
        setFilieres(fRes.data);
        setClasses(cRes.data);
      }
    );
  }, []);

  const fetchStudents = (targetPage = 1) => {
    setLoading(true);
    client
      .get("/assistant/students", {
        params: {
          page: targetPage,
          per_page: 15,
          q: search || undefined,
          filiere_id: filiereId || undefined,
          niveau: niveau || undefined,
          risque: risque || undefined,
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
    fetchStudents(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filiereId, niveau, risque]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchStudents(1);
  };

  const handleExport = (format = "csv") => {
    setShowExportMenu(false);
    const token = localStorage.getItem("token");
    const params = new URLSearchParams();
    params.append("format", format);
    if (search) params.append("q", search);
    if (filiereId) params.append("filiere_id", filiereId);
    if (niveau) params.append("niveau", niveau);

    const exportUrl = `${client.defaults.baseURL || "/api"}/assistant/students/export?${params.toString()}`;

    fetch(exportUrl, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => {
        if (!res.ok) throw new Error("Erreur d'exportation");
        return res.blob();
      })
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const ext = format === "xlsx" ? "xlsx" : "csv";
        a.download = `export_etudiants_pedagogie_${new Date().toISOString().slice(0, 10)}.${ext}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      })
      .catch((err) => {
        console.error("Erreur lors de l'exportation :", err);
      });
  };

  return (
    <CoqueApplication
      titre="Suivi des étudiants"
      sousTitre={`${pagination.total} étudiant(s) inscrit(s)`}
      sectionsNavigation={navigationAssistante()}
    >
      <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
        {/* Bouton Exporter */}
        <div className="relative">
          <Button
            variant="secondary"
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="flex items-center gap-1.5"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            <span>Exporter</span>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="size-3">
              <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          </Button>

          {showExportMenu && (
            <div className="absolute right-0 mt-1.5 w-44 rounded-lg bg-white p-1 shadow-lg ring-1 ring-black/5 z-20">
              <button
                onClick={() => handleExport("csv")}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs font-medium text-encre-nocturne hover:bg-sable-chaud/40"
              >
                <span className="font-mono font-bold text-indigo-trajectoire">CSV</span> Exporter en CSV
              </button>
              <button
                onClick={() => handleExport("xlsx")}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs font-medium text-encre-nocturne hover:bg-sable-chaud/40"
              >
                <span className="font-mono font-bold text-emerald-600">XLSX</span> Exporter en Excel
              </button>
            </div>
          )}
        </div>

        {/* Bouton Importer */}
        <Button
          onClick={() => setShowImportModal(true)}
          className="flex items-center gap-1.5 bg-indigo-trajectoire text-white hover:bg-indigo-trajectoire/90"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
          </svg>
          <span>Importer une liste</span>
        </Button>
      </div>

      <Card>
        {/* Filtres de recherche */}
        <form onSubmit={handleSearchSubmit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <input
              type="text"
              placeholder="Rechercher par nom, prénom ou matricule..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-ardoise-300 px-3 py-2 text-sm text-encre-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <select
              value={filiereId}
              onChange={(e) => {
                setFiliereId(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-ardoise-300 px-3 py-2 text-sm text-encre-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">Toutes les filières</option>
              {filieres.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nom} ({f.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={niveau}
              onChange={(e) => {
                setNiveau(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-ardoise-300 px-3 py-2 text-sm text-encre-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">Tous les niveaux</option>
              {["L1", "L2", "L3", "M1", "M2"].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={risque}
              onChange={(e) => {
                setRisque(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-ardoise-300 px-3 py-2 text-sm text-encre-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">Tous les niveaux de risque</option>
              <option value="faible">Risque Faible (En réussite)</option>
              <option value="moyen">Risque Moyen (À surveiller)</option>
              <option value="eleve">Risque Élevé (Critique)</option>
            </select>
          </div>
        </form>

        {/* Tableau des étudiants */}
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-ardoise-200 text-xs font-semibold uppercase tracking-wider text-ardoise-500">
                <th className="py-3">Matricule</th>
                <th className="py-3">Nom & Prénom</th>
                <th className="py-3">Classe</th>
                <th className="py-3">Filière</th>
                <th className="py-3">Moyenne</th>
                <th className="py-3">Assiduité</th>
                <th className="py-3">Risque prédictif</th>
                <th className="py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ardoise-100">
              {students.map((s) => (
                <tr key={s.id} className="hover:bg-ardoise-50/80 transition-colors">
                  <td className="py-3 font-mono text-xs text-ardoise-600">{s.matricule}</td>
                  <td className="py-3 font-medium text-encre-900">
                    {s.nom} {s.prenom}
                  </td>
                  <td className="py-3 text-ardoise-600">{s.classe ?? "-"}</td>
                  <td className="py-3 text-ardoise-600">{s.filiere ?? "-"}</td>
                  <td className="py-3 font-semibold text-encre-800">
                    {s.moyenne_generale !== null ? `${s.moyenne_generale.toFixed(1)}/20` : "-"}
                  </td>
                  <td className="py-3 text-ardoise-600">
                    {s.taux_assiduite !== null ? `${s.taux_assiduite.toFixed(0)}%` : "-"}
                  </td>
                  <td className="py-3">
                    <RiskBadge risk={s.niveau_risque} />
                  </td>
                  <td className="py-3 text-right">
                    <Link
                      to={`/assistante/etudiants/${s.id}`}
                      className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-100 transition-colors"
                    >
                      Dossier complet →
                    </Link>
                  </td>
                </tr>
              ))}
              {!loading && students.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-sm text-ardoise-400">
                    Aucun étudiant trouvé avec les filtres actuels.
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
              onPageChange={(p) => setPage(p)}
            />
          </div>
        )}
      </Card>

      {/* Modal d'importation en masse */}
      <StudentImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportSuccess={() => fetchStudents(1)}
        apiPrefix="/assistant"
      />
    </CoqueApplication>
  );
}

