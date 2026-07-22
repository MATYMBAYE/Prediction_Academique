import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import DashboardLayout from "../../components/DashboardLayout.jsx";
import Card from "../../components/Card.jsx";
import client from "../../api/client.js";
import { ADMIN_NAV_ITEMS } from "./adminNav.jsx";

export default function AdminClassDetail() {
  const { id } = useParams();
  const [classe, setClasse] = useState(null);

  useEffect(() => {
    client.get(`/admin/classes/${id}`).then(({ data }) => setClasse(data));
  }, [id]);

  if (!classe) {
    return (
      <DashboardLayout title="Espace Administration" navItems={ADMIN_NAV_ITEMS}>
        <p className="text-encre-nocturne/60">Chargement...</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Espace Administration" navItems={ADMIN_NAV_ITEMS}>
      <Link to="/admin/classes" className="text-sm text-indigo-trajectoire hover:underline">&larr; Retour aux classes</Link>
      <h1 className="mt-2 font-display text-xl font-semibold text-encre-nocturne">{classe.nom}</h1>
      <p className="text-sm text-encre-nocturne/60">{classe.effectif} etudiant(s) · {classe.filiere}</p>

      <Card className="mt-6" title="Historique des appels (lecture seule)">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[500px] text-left text-sm">
            <thead>
              <tr className="border-b border-encre-nocturne/10 text-encre-nocturne/60">
                <th className="py-2 font-medium">Date</th>
                <th className="py-2 font-medium">Matiere</th>
                <th className="py-2 font-medium">Semestre</th>
                <th className="py-2 font-medium">Presence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-encre-nocturne/10">
              {classe.historique_appels.map((h) => (
                <tr key={h.id}>
                  <td className="py-2">{h.date_cours}</td>
                  <td className="py-2">{h.matiere}</td>
                  <td className="py-2 text-encre-nocturne/70">{h.semestre}</td>
                  <td className="tabular py-2">{h.presents}/{h.effectif}</td>
                </tr>
              ))}
              {classe.historique_appels.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-encre-nocturne/50">Aucun appel enregistre.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </DashboardLayout>
  );
}
