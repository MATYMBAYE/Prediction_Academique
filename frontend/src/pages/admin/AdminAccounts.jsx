import { useEffect, useState } from "react";
import DashboardLayout from "../../components/DashboardLayout.jsx";
import Card from "../../components/Card.jsx";
import { AccountStatusBadge } from "../../components/StatusBadge.jsx";
import client from "../../api/client.js";
import { ADMIN_NAV_ITEMS } from "./adminNav.jsx";

export default function AdminAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      client.get("/admin/accounts", { params: { per_page: 100 } }),
      client.get("/admin/accounts/history", { params: { per_page: 100 } }),
    ]).then(([accountsRes, historyRes]) => {
      setAccounts(accountsRes.data.items);
      setHistory(historyRes.data.items);
      setLoading(false);
    });
  }, []);

  return (
    <DashboardLayout title="Espace Administration" navItems={ADMIN_NAV_ITEMS}>
      <h1 className="font-display text-xl font-semibold text-encre-nocturne">Comptes etudiants</h1>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card title="Comptes actifs / inactifs">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[400px] text-left text-sm">
              <thead>
                <tr className="border-b border-encre-nocturne/10 text-encre-nocturne/60">
                  <th className="py-2 font-medium">Etudiant</th>
                  <th className="py-2 font-medium">Identifiant</th>
                  <th className="py-2 font-medium">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-encre-nocturne/10">
                {accounts.map((a) => (
                  <tr key={a.id}>
                    <td className="py-2">{a.etudiant ?? a.identifiant}</td>
                    <td className="py-2 text-encre-nocturne/60">{a.identifiant}</td>
                    <td className="py-2"><AccountStatusBadge status={a.statut} /></td>
                  </tr>
                ))}
                {!loading && accounts.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-encre-nocturne/50">Aucun compte.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Historique des activations / desactivations">
          <div className="max-h-[420px] overflow-y-auto">
            <table className="w-full min-w-[400px] text-left text-sm">
              <thead>
                <tr className="border-b border-encre-nocturne/10 text-encre-nocturne/60">
                  <th className="py-2 font-medium">Etudiant</th>
                  <th className="py-2 font-medium">Changement</th>
                  <th className="py-2 font-medium">Motif</th>
                  <th className="py-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-encre-nocturne/10">
                {history.map((h) => (
                  <tr key={h.id}>
                    <td className="py-2">{h.etudiant}</td>
                    <td className="py-2">
                      <span className="text-encre-nocturne/60">{h.ancien_statut}</span>
                      {" -> "}
                      <AccountStatusBadge status={h.nouveau_statut} />
                    </td>
                    <td className="py-2 text-encre-nocturne/70">{h.motif ?? "-"}</td>
                    <td className="py-2 text-encre-nocturne/60">
                      {new Date(h.date_changement).toLocaleString("fr-FR")}
                    </td>
                  </tr>
                ))}
                {!loading && history.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-encre-nocturne/50">
                      Aucun changement de statut enregistre.
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
