import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import CoqueApplication from "../../components/AppShell.jsx";
import { navigationAdmin } from "../../components/navigation.js";
import Card from "../../components/Card.jsx";
import { RiskBadge } from "../../components/StatusBadge.jsx";
import client from "../../api/client.js";

const STATUTS = ["nouvelle", "en_cours", "traitee"];
const STATUT_LABELS = { nouvelle: "Nouvelle", en_cours: "En cours", traitee: "Traitee" };

export default function AdminAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    client.get("/admin/alerts", { params: { per_page: 100 } }).then(({ data }) => {
      setAlerts(data.items);
      setLoading(false);
    });
  };

  useEffect(() => {
    load();
  }, []);

  const updateStatut = async (id, statut_traitement) => {
    await client.put(`/admin/alerts/${id}`, { statut_traitement });
    load();
  };

  return (
    <CoqueApplication
      titre="Alertes de risque academique"
      sousTitre="Alertes precoces declenchees automatiquement par le systeme de prediction (risque d'echec, notes faibles, absences repetees)"
      sectionsNavigation={navigationAdmin()}
    >
      <div className="mt-1">
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead>
                <tr className="border-b border-encre-nocturne/10 text-encre-nocturne/60">
                  <th className="py-2 font-medium">Etudiant</th>
                  <th className="py-2 font-medium">Type</th>
                  <th className="py-2 font-medium">Classe</th>
                  <th className="py-2 font-medium">Niveau</th>
                  <th className="py-2 font-medium">Date</th>
                  <th className="py-2 font-medium">Traitement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-encre-nocturne/10">
                {alerts.map((a) => (
                  <tr key={a.id}>
                    <td className="py-2">
                      <Link to={`/admin/etudiants/${a.student_id}`} className="text-indigo-trajectoire hover:underline">
                        {a.etudiant}
                      </Link>
                    </td>
                    <td className="py-2 text-encre-nocturne/70">{a.libelle_type}</td>
                    <td className="py-2 text-encre-nocturne/70">{a.classe ?? "-"}</td>
                    <td className="py-2"><RiskBadge level={a.niveau_risque} /></td>
                    <td className="py-2 text-encre-nocturne/60">
                      {new Date(a.date_declenchement).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="py-2">
                      <select
                        value={a.statut_traitement}
                        onChange={(e) => updateStatut(a.id, e.target.value)}
                        className="focus-ring rounded-md border border-encre-nocturne/20 px-2 py-1 text-sm"
                      >
                        {STATUTS.map((s) => (
                          <option key={s} value={s}>{STATUT_LABELS[s]}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
                {!loading && alerts.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-encre-nocturne/50">
                      Aucune alerte pour le moment.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </CoqueApplication>
  );
}
