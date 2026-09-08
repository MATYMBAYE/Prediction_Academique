import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import CoqueApplication from "../../components/AppShell.jsx";
import { navigationTechnicien } from "../../components/navigation.js";
import Card from "../../components/Card.jsx";
import client from "../../api/client.js";

export default function TechnicienTeachers() {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client
      .get("/technicien/teachers")
      .then((res) => {
        setTeachers(res.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <CoqueApplication
      titre="Corps Enseignant"
      sousTitre="Consultation des enseignants et de leurs cours assignés"
      sectionsNavigation={navigationTechnicien()}
    >
      <Card title="Liste des enseignants">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-ardoise-200 text-xs font-semibold uppercase tracking-wider text-ardoise-500">
                <th className="py-3">Nom & Prénom</th>
                <th className="py-3">Adresse e-mail</th>
                <th className="py-3">Identifiant</th>
                <th className="py-3">Affectations actuelles</th>
                <th className="py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ardoise-100">
              {teachers.map((t) => (
                <tr key={t.id} className="hover:bg-ardoise-50/50">
                  <td className="py-3.5 font-bold text-encre-900">
                    {t.nom} {t.prenom}
                  </td>
                  <td className="py-3.5 text-ardoise-600">{t.email || "-"}</td>
                  <td className="py-3.5 font-mono text-xs text-ardoise-500">
                    {t.identifiant || "-"}
                  </td>
                  <td className="py-3.5">
                    <div className="flex flex-wrap gap-1.5">
                      {t.affectations?.map((a, idx) => (
                        <span
                          key={idx}
                          className="rounded bg-indigo-50 px-2 py-0.5 text-2xs font-medium text-indigo-700 border border-indigo-100"
                        >
                          {a.classe} : {a.matiere}
                        </span>
                      ))}
                      {(!t.affectations || t.affectations.length === 0) && (
                        <span className="text-2xs text-ardoise-400">Aucune affectation</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 text-right">
                    <Link
                      to={`/technicien/affectations?teacher_id=${t.id}`}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                    >
                      Affecter un cours →
                    </Link>
                  </td>
                </tr>
              ))}
              {!loading && teachers.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-sm text-ardoise-400">
                    Aucun enseignant trouvé.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </CoqueApplication>
  );
}
