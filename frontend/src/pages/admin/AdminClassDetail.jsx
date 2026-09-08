import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import CoqueApplication from "../../components/AppShell.jsx";
import { navigationAdmin } from "../../components/navigation.js";
import Card from "../../components/Card.jsx";
import client from "../../api/client.js";

export default function AdminClassDetail() {
  const { id } = useParams();
  const [classe, setClasse] = useState(null);

  useEffect(() => {
    client.get(`/admin/classes/${id}`).then(({ data }) => setClasse(data));
  }, [id]);

  if (!classe) {
    return (
      <CoqueApplication titre="Classe" sectionsNavigation={navigationAdmin()}>
        <p className="text-encre-nocturne/60">Chargement...</p>
      </CoqueApplication>
    );
  }

  return (
    <CoqueApplication
      titre={classe.nom}
      sousTitre={`${classe.effectif} etudiant(s) · ${classe.filiere}`}
      sectionsNavigation={navigationAdmin()}
    >
      <Link to="/admin/classes" className="text-sm text-indigo-trajectoire hover:underline">&larr; Retour aux classes</Link>

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
    </CoqueApplication>
  );
}
