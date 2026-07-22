import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import DashboardLayout from "../../components/DashboardLayout.jsx";
import Card from "../../components/Card.jsx";
import Button from "../../components/Button.jsx";
import client from "../../api/client.js";
import { SEMESTRES_PAR_NIVEAU } from "../../academic.js";
import { TEACHER_NAV_ITEMS } from "./teacherNav.js";

export default function TeacherGrades() {
  const [searchParams] = useSearchParams();
  const classeId = searchParams.get("classe");
  const matiere = searchParams.get("matiere");
  const niveau = searchParams.get("niveau");
  const semestres = SEMESTRES_PAR_NIVEAU[niveau] || [];

  const [rows, setRows] = useState([]);
  const [semestre, setSemestre] = useState(semestres[0] || "");
  const [typeEvaluation, setTypeEvaluation] = useState("examen");
  const [notes, setNotes] = useState({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = () => {
    client.get("/teacher/notes", { params: { classe_id: classeId, matiere } }).then(({ data }) => setRows(data));
  };

  useEffect(() => {
    if (classeId && matiere) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classeId, matiere]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    const entries = Object.entries(notes).filter(([, v]) => v !== "" && v !== undefined);
    if (entries.length === 0) {
      setError("Saisissez au moins une note.");
      return;
    }
    try {
      for (const [studentId, note] of entries) {
        await client.post("/teacher/notes", {
          classe_id: Number(classeId), matiere, student_id: Number(studentId),
          semestre, type_evaluation: typeEvaluation, note: parseFloat(note),
        });
      }
      setMessage("Notes enregistrees avec succes.");
      setNotes({});
      load();
    } catch (err) {
      setError(err.response?.data?.error || "Impossible d'enregistrer les notes.");
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
      <h1 className="mt-2 font-display text-xl font-semibold text-encre-nocturne">Notes — {matiere}</h1>

      <Card className="mt-6" title="Saisie des notes">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:w-1/2">
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
              <label className="mb-1 block text-sm font-medium text-encre-nocturne">Type</label>
              <select
                value={typeEvaluation}
                onChange={(e) => setTypeEvaluation(e.target.value)}
                className="focus-ring w-full rounded-md border border-encre-nocturne/20 px-3 py-2 text-sm"
              >
                <option value="devoir">Devoir</option>
                <option value="examen">Examen</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto rounded-md border border-encre-nocturne/10">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-encre-nocturne/10 text-encre-nocturne/60">
                  <th className="px-3 py-2 font-medium">Etudiant</th>
                  <th className="px-3 py-2 font-medium">Nouvelle note (/20)</th>
                  <th className="px-3 py-2 font-medium">Notes existantes ({matiere})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-encre-nocturne/10">
                {rows.map(({ student, notes: existing }) => (
                  <tr key={student.id}>
                    <td className="px-3 py-2">{student.prenom} {student.nom}</td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min="0"
                        max="20"
                        step="0.25"
                        value={notes[student.id] ?? ""}
                        onChange={(e) => setNotes((n) => ({ ...n, [student.id]: e.target.value }))}
                        className="focus-ring w-24 rounded-md border border-encre-nocturne/20 px-2 py-1"
                      />
                    </td>
                    <td className="px-3 py-2 text-xs text-encre-nocturne/60">
                      {existing.map((n) => `${n.semestre}/${n.type_evaluation}: ${n.note}`).join(" · ") || "Aucune"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {error && <p className="text-sm text-brique-alerte">{error}</p>}
          {message && <p className="text-sm text-sauge-reussite">{message}</p>}
          <Button type="submit">Enregistrer les notes</Button>
        </form>
      </Card>
    </DashboardLayout>
  );
}
