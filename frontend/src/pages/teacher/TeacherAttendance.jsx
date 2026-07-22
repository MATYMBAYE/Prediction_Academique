import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import DashboardLayout from "../../components/DashboardLayout.jsx";
import Card from "../../components/Card.jsx";
import Button from "../../components/Button.jsx";
import client from "../../api/client.js";
import { SEMESTRES_PAR_NIVEAU } from "../../academic.js";
import { TEACHER_NAV_ITEMS } from "./teacherNav.js";

export default function TeacherAttendance() {
  const [searchParams] = useSearchParams();
  const classeId = searchParams.get("classe");
  const matiere = searchParams.get("matiere");
  const niveau = searchParams.get("niveau");
  const semestres = SEMESTRES_PAR_NIVEAU[niveau] || [];

  const [students, setStudents] = useState([]);
  const [semestre, setSemestre] = useState(semestres[0] || "");
  const [dateCours, setDateCours] = useState(new Date().toISOString().slice(0, 10));
  const [statuts, setStatuts] = useState({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [historique, setHistorique] = useState([]);

  useEffect(() => {
    if (!classeId) return;
    client.get(`/teacher/classes/${classeId}/students`, { params: { matiere } }).then(({ data }) => {
      setStudents(data);
      setStatuts(Object.fromEntries(data.map((s) => [s.id, "present"])));
    });
    client
      .get("/teacher/appel/historique", { params: { classe_id: classeId, matiere } })
      .then(({ data }) => setHistorique(data));
  }, [classeId, matiere]);

  const toggle = (studentId) => {
    setStatuts((s) => ({ ...s, [studentId]: s[studentId] === "present" ? "absent" : "present" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setSubmitting(true);
    try {
      const presences = students.map((s) => ({ student_id: s.id, statut: statuts[s.id] }));
      await client.post("/teacher/appel", { classe_id: Number(classeId), matiere, semestre, date_cours: dateCours, presences });
      setMessage("Appel enregistre avec succes.");
      const { data } = await client.get("/teacher/appel/historique", { params: { classe_id: classeId, matiere } });
      setHistorique(data);
    } catch (err) {
      setError(err.response?.data?.error || "Impossible d'enregistrer l'appel.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!classeId || !matiere) {
    return (
      <DashboardLayout title="Espace Enseignant" navItems={TEACHER_NAV_ITEMS}>
        <p className="text-brique-alerte">Classe ou matiere manquante.</p>
        <Link to="/enseignant" className="text-indigo-trajectoire hover:underline">Retour</Link>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Espace Enseignant" navItems={TEACHER_NAV_ITEMS}>
      <Link to="/enseignant" className="text-sm text-indigo-trajectoire hover:underline">&larr; Mes classes</Link>
      <h1 className="mt-2 font-display text-xl font-semibold text-encre-nocturne">
        Appel — {matiere}
      </h1>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card title="Nouvelle session">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-encre-nocturne">Semestre</label>
                <select
                  value={semestre}
                  onChange={(e) => setSemestre(e.target.value)}
                  className="focus-ring w-full rounded-md border border-encre-nocturne/20 px-3 py-2 text-sm"
                >
                  {semestres.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-encre-nocturne">Date du cours</label>
                <input
                  type="date"
                  value={dateCours}
                  onChange={(e) => setDateCours(e.target.value)}
                  className="focus-ring w-full rounded-md border border-encre-nocturne/20 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto rounded-md border border-encre-nocturne/10">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b border-encre-nocturne/10 text-encre-nocturne/60">
                    <th className="px-3 py-2 font-medium">Etudiant</th>
                    <th className="px-3 py-2 font-medium">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-encre-nocturne/10">
                  {students.map((s) => (
                    <tr key={s.id}>
                      <td className="px-3 py-2">{s.prenom} {s.nom}</td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => toggle(s.id)}
                          className={`tap-target rounded-full px-3 py-1 text-xs font-medium ${
                            statuts[s.id] === "present"
                              ? "bg-sauge-reussite/10 text-sauge-reussite"
                              : "bg-brique-alerte/10 text-brique-alerte"
                          }`}
                        >
                          {statuts[s.id] === "present" ? "Present" : "Absent"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {error && <p className="text-sm text-brique-alerte">{error}</p>}
            {message && <p className="text-sm text-sauge-reussite">{message}</p>}
            <Button type="submit" disabled={submitting}>
              {submitting ? "Enregistrement..." : "Enregistrer l'appel"}
            </Button>
          </form>
        </Card>

        <Card title="Historique des appels">
          <ul className="max-h-96 divide-y divide-encre-nocturne/10 overflow-y-auto text-sm">
            {historique.map((h) => (
              <li key={h.id} className="flex justify-between py-2">
                <span>{h.date_cours} ({h.semestre})</span>
                <span className="tabular text-encre-nocturne/60">{h.presents}/{h.effectif} presents</span>
              </li>
            ))}
            {historique.length === 0 && <li className="py-4 text-encre-nocturne/50">Aucun appel enregistre.</li>}
          </ul>
        </Card>
      </div>
    </DashboardLayout>
  );
}
