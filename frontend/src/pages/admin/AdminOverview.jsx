import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../../components/DashboardLayout.jsx";
import Card from "../../components/Card.jsx";
import { RiskBadge, AccountStatusBadge } from "../../components/StatusBadge.jsx";
import client from "../../api/client.js";
import { ADMIN_NAV_ITEMS } from "./adminNav.jsx";

export default function AdminOverview() {
  const [overview, setOverview] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = () => {
    Promise.all([
      client.get("/admin/overview"),
      client.get("/admin/students", { params: { per_page: 100 } }),
    ]).then(([overviewRes, studentsRes]) => {
      setOverview(overviewRes.data);
      setStudents(studentsRes.data.items);
      setLoading(false);
    });
  };

  useEffect(load, []);

  const filtered = students.filter((s) => {
    const q = search.toLowerCase();
    return `${s.prenom} ${s.nom} ${s.matricule} ${s.classe ?? ""}`.toLowerCase().includes(q);
  });

  return (
    <DashboardLayout title="Espace Administration" navItems={ADMIN_NAV_ITEMS}>
      <h1 className="font-display text-xl font-semibold text-encre-nocturne">Vue d'ensemble</h1>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm text-encre-nocturne/60">Total etudiants</p>
          <p className="tabular font-display text-2xl font-semibold text-encre-nocturne">
            {loading ? "…" : overview.total_etudiants}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-encre-nocturne/60">A risque</p>
          <p className="tabular font-display text-2xl font-semibold text-ambre-vigilance">
            {loading ? "…" : overview.etudiants_a_risque}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-encre-nocturne/60">Comptes desactives</p>
          <p className="tabular font-display text-2xl font-semibold text-brique-alerte">
            {loading ? "…" : overview.comptes_desactives}
          </p>
        </Card>
      </div>

      <div className="mt-6">
        <Card
          title="Liste des etudiants"
          actions={
            <input
              type="search"
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="focus-ring rounded-md border border-encre-nocturne/20 px-3 py-1.5 text-sm"
            />
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-encre-nocturne/10 text-encre-nocturne/60">
                  <th className="py-2 font-medium">Nom</th>
                  <th className="py-2 font-medium">Classe</th>
                  <th className="py-2 font-medium">Risque</th>
                  <th className="py-2 font-medium">Statut compte</th>
                  <th className="py-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-encre-nocturne/10">
                {filtered.map((s) => (
                  <tr key={s.id}>
                    <td className="py-2">
                      {s.prenom} {s.nom}
                      <div className="text-xs text-encre-nocturne/50">{s.matricule}</div>
                    </td>
                    <td className="py-2 text-encre-nocturne/70">{s.classe ?? "-"}</td>
                    <td className="py-2"><RiskBadge level={s.niveau_risque} /></td>
                    <td className="py-2"><AccountStatusBadge status={s.statut_compte} /></td>
                    <td className="py-2">
                      <Link to={`/admin/etudiants/${s.id}`} className="text-indigo-trajectoire hover:underline">
                        Voir la fiche
                      </Link>
                    </td>
                  </tr>
                ))}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-encre-nocturne/50">
                      Aucun etudiant ne correspond a la recherche.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
