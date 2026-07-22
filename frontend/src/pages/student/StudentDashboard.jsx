import { useEffect, useState } from "react";
import DashboardLayout from "../../components/DashboardLayout.jsx";
import Card from "../../components/Card.jsx";
import TrajectoryCurve from "../../components/TrajectoryCurve.jsx";
import { RiskBadge } from "../../components/StatusBadge.jsx";
import client from "../../api/client.js";
import { useNavigate } from "react-router-dom";
import { STUDENT_NAV_ITEMS } from "./studentNav.js";

const RISK_EXPLANATIONS = {
  faible: "Vos resultats et votre assiduite sont dans une bonne dynamique. Continuez ainsi.",
  moyen: "Quelques signaux meritent votre attention : notes ou assiduite en baisse. Un accompagnement peut vous aider.",
  eleve: "Votre situation actuelle presente un risque important d'echec. Rapprochez-vous rapidement de votre encadreur.",
  inconnu: "Pas encore assez de donnees pour evaluer votre situation.",
};

export default function StudentDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    client
      .get("/student/dashboard")
      .then(({ data }) => {
        if (active) setData(data);
      })
      .catch((err) => {
        if (err.response?.status === 403 && err.response?.data?.error === "compte_desactive") {
          navigate("/compte-desactive", { replace: true });
          return;
        }
        setError("Impossible de charger votre tableau de bord pour le moment.");
      });
    return () => {
      active = false;
    };
  }, [navigate]);

  if (error) {
    return (
      <DashboardLayout title="Tableau de bord" navItems={STUDENT_NAV_ITEMS}>
        <p className="text-brique-alerte">{error}</p>
      </DashboardLayout>
    );
  }

  if (!data) {
    return (
      <DashboardLayout title="Tableau de bord" navItems={STUDENT_NAV_ITEMS}>
        <p className="text-encre-nocturne/60">Chargement...</p>
      </DashboardLayout>
    );
  }

  const { student, prediction, notes, assiduite, trajectoire } = data;
  const niveauRisque = prediction?.niveau_risque || "inconnu";
  const tauxAssiduiteMoyen = prediction?.taux_assiduite_moyen;

  return (
    <DashboardLayout title="Tableau de bord" navItems={STUDENT_NAV_ITEMS}>
      <h1 className="font-display text-xl font-semibold text-encre-nocturne">
        Bonjour, {student.prenom}
      </h1>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card title="Resultat de prediction">
          <RiskBadge level={niveauRisque} />
          <p className="mt-3 text-sm text-encre-nocturne/80">{RISK_EXPLANATIONS[niveauRisque]}</p>
          {prediction && (
            <p className="mt-3 text-xs text-encre-nocturne/50">
              Derniere mise a jour : {new Date(prediction.date_prediction).toLocaleDateString("fr-FR")}
            </p>
          )}
        </Card>

        <Card title="Courbe de trajectoire">
          <TrajectoryCurve data={trajectoire} dataKey="note" />
        </Card>
      </div>

      <div className="mt-4">
        <Card title="Taux d'assiduite" id="assiduite">
          {tauxAssiduiteMoyen != null ? (
            <div>
              <div className="flex items-baseline gap-2">
                <span className="tabular font-display text-2xl font-semibold text-encre-nocturne">
                  {tauxAssiduiteMoyen.toFixed(1)}%
                </span>
                <span className="text-sm text-encre-nocturne/60">taux moyen de presence</span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-encre-nocturne/10">
                <div
                  className={`h-full ${tauxAssiduiteMoyen >= 75 ? "bg-sauge-reussite" : tauxAssiduiteMoyen >= 60 ? "bg-ambre-vigilance" : "bg-brique-alerte"}`}
                  style={{ width: `${Math.min(100, tauxAssiduiteMoyen)}%` }}
                />
              </div>
            </div>
          ) : (
            <p className="text-sm text-encre-nocturne/60">Aucune donnee d'assiduite disponible.</p>
          )}

          <ul className="mt-4 divide-y divide-encre-nocturne/10 text-sm">
            {assiduite.map((a) => (
              <li key={a.semestre} className="flex justify-between py-2">
                <span>{a.semestre}</span>
                <span className="tabular">{a.taux_presence}%</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="mt-4">
        <Card title="Detail des notes par matiere" id="notes">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[400px] text-left text-sm">
              <thead>
                <tr className="border-b border-encre-nocturne/10 text-encre-nocturne/60">
                  <th className="py-2 font-medium">Matiere</th>
                  <th className="py-2 font-medium">Semestre</th>
                  <th className="py-2 font-medium">Type</th>
                  <th className="py-2 text-right font-medium">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-encre-nocturne/10">
                {notes.map((n) => (
                  <tr key={n.id}>
                    <td className="py-2">{n.matiere}</td>
                    <td className="py-2 text-encre-nocturne/70">{n.semestre}</td>
                    <td className="py-2 text-encre-nocturne/70 capitalize">{n.type_evaluation}</td>
                    <td className="tabular py-2 text-right">{n.note}/20</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
