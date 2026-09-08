import { useEffect, useState } from "react";
import CoqueApplication from "../../components/AppShell.jsx";
import { navigationTechnicien } from "../../components/navigation.js";
import Card from "../../components/Card.jsx";
import client from "../../api/client.js";

export default function TechnicienNiveaux() {
  const [niveaux, setNiveaux] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client
      .get("/technicien/niveaux")
      .then((res) => {
        setNiveaux(res.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <CoqueApplication
      titre="Niveaux Académiques"
      sousTitre="Structure LMD : Cycle Licence (L1-L3) et Master (M1-M2)"
      sectionsNavigation={navigationTechnicien()}
    >
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {niveaux.map((n) => (
          <Card key={n.niveau} title={`Niveau ${n.niveau}`}>
            <div className="space-y-3">
              <p className="text-xs text-ardoise-500">
                {n.niveau.startsWith("L")
                  ? `Cycle Licence — Année ${n.niveau[1]}`
                  : `Cycle Master — Année ${n.niveau[1]}`}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-encre-800">Semestres associés :</span>
                {n.semestres.map((s) => (
                  <span
                    key={s}
                    className="rounded bg-indigo-50 px-2 py-0.5 font-mono text-xs font-bold text-indigo-700 border border-indigo-100"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </Card>
        ))}
        {!loading && niveaux.length === 0 && (
          <p className="col-span-full py-8 text-center text-sm text-ardoise-400">
            Aucun niveau configuré.
          </p>
        )}
      </div>
    </CoqueApplication>
  );
}
