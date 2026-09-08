import { useEffect, useState } from "react";
import CoqueApplication from "../../components/AppShell.jsx";
import { navigationTechnicien } from "../../components/navigation.js";
import Card from "../../components/Card.jsx";
import client from "../../api/client.js";

export default function TechnicienClasses() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client
      .get("/technicien/classes")
      .then((res) => {
        setClasses(res.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <CoqueApplication
      titre="Classes & Cohortes"
      sousTitre="Consultation technique des classes ouvertes et affectations"
      sectionsNavigation={navigationTechnicien()}
    >
      <Card title="Répertoire des classes">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-ardoise-200 text-xs font-semibold uppercase tracking-wider text-ardoise-500">
                <th className="py-3">Classe</th>
                <th className="py-3">Niveau</th>
                <th className="py-3">Filière</th>
                <th className="py-3">Effectif</th>
                <th className="py-3">Enseignants & Matières affectés</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ardoise-100">
              {classes.map((c) => (
                <tr key={c.id} className="hover:bg-ardoise-50/50">
                  <td className="py-3.5 font-bold text-encre-900">{c.nom}</td>
                  <td className="py-3.5 text-ardoise-600 font-mono text-xs">{c.niveau}</td>
                  <td className="py-3.5 text-ardoise-600">{c.filiere}</td>
                  <td className="py-3.5 font-semibold text-indigo-600">
                    {c.effectif ?? 0} étudiant(s)
                  </td>
                  <td className="py-3.5">
                    <div className="flex flex-wrap gap-1.5">
                      {c.enseignants?.map((ens, idx) => (
                        <span
                          key={idx}
                          className="rounded bg-ardoise-100 px-2 py-0.5 text-2xs font-medium text-encre-800"
                        >
                          {ens.matiere} : {ens.enseignant}
                        </span>
                      ))}
                      {(!c.enseignants || c.enseignants.length === 0) && (
                        <span className="text-2xs text-ardoise-400">Aucune affectation</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && classes.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-sm text-ardoise-400">
                    Aucune classe enregistrée.
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
