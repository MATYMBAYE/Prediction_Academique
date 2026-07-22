import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import DashboardLayout from "../../components/DashboardLayout.jsx";
import Card from "../../components/Card.jsx";
import Button from "../../components/Button.jsx";
import ConfirmModal from "../../components/ConfirmModal.jsx";
import TrajectoryCurve from "../../components/TrajectoryCurve.jsx";
import { RiskBadge, AccountStatusBadge } from "../../components/StatusBadge.jsx";
import client from "../../api/client.js";
import { ADMIN_NAV_ITEMS } from "./adminNav.jsx";
import { SEMESTRES_PAR_NIVEAU } from "../../academic.js";

export default function AdminStudentDetail() {
  const { id } = useParams();
  const [student, setStudent] = useState(null);
  const [error, setError] = useState("");
  const [gradeForm, setGradeForm] = useState({ matiere: "", note: "", semestre: "", type_evaluation: "examen" });
  const [modalOpen, setModalOpen] = useState(false);

  const load = () => client.get(`/admin/students/${id}`).then(({ data }) => setStudent(data));

  useEffect(() => {
    load();
  }, [id]);

  if (!student) {
    return (
      <DashboardLayout title="Espace Administration" navItems={ADMIN_NAV_ITEMS}>
        <p className="text-encre-nocturne/60">Chargement...</p>
      </DashboardLayout>
    );
  }

  const derniereRisque = student.predictions?.[0]?.niveau_risque || "inconnu";
  const trajectoire = [...student.notes].sort((a, b) => new Date(a.date_saisie) - new Date(b.date_saisie));
  const semestresDisponibles = SEMESTRES_PAR_NIVEAU[student.niveau] || [];

  const submitGrade = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await client.post(`/admin/students/${id}/grades`, { ...gradeForm, note: parseFloat(gradeForm.note) });
      setGradeForm((f) => ({ ...f, matiere: "", note: "" }));
      load();
    } catch (err) {
      setError(err.response?.data?.error || "Impossible d'ajouter la note.");
    }
  };

  const toggleStatus = async (motif) => {
    const nouveauStatut = student.statut_compte === "actif" ? "inactif" : "actif";
    await client.post(`/admin/accounts/${student.user_id}/toggle-status`, {
      statut: nouveauStatut,
      motif,
    });
    setModalOpen(false);
    load();
  };

  return (
    <DashboardLayout title="Espace Administration" navItems={ADMIN_NAV_ITEMS}>
      <Link to="/admin/etudiants" className="text-sm text-indigo-trajectoire hover:underline">
        &larr; Retour a la liste
      </Link>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-semibold text-encre-nocturne">
            {student.prenom} {student.nom}
          </h1>
          <p className="text-sm text-encre-nocturne/60">
            {student.matricule} · {student.classe ?? "Classe non renseignee"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <RiskBadge level={derniereRisque} />
          <AccountStatusBadge status={student.statut_compte} />
          <Button
            variant={student.statut_compte === "actif" ? "destructive" : "primary"}
            onClick={() => setModalOpen(true)}
          >
            {student.statut_compte === "actif" ? "Desactiver le compte" : "Activer le compte"}
          </Button>
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-brique-alerte">{error}</p>}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card title="Courbe de trajectoire">
          <TrajectoryCurve data={trajectoire} dataKey="note" />
        </Card>

        <Card title="Historique des predictions">
          <ul className="max-h-[180px] space-y-2 overflow-y-auto text-sm">
            {student.predictions.map((p) => (
              <li key={p.id} className="flex items-center justify-between">
                <span>{new Date(p.date_prediction).toLocaleDateString("fr-FR")}</span>
                <RiskBadge level={p.niveau_risque} />
                <span className="tabular text-encre-nocturne/60">{(p.probabilite_reussite * 100).toFixed(0)}%</span>
              </li>
            ))}
            {student.predictions.length === 0 && <li className="text-encre-nocturne/50">Aucune prediction pour le moment.</li>}
          </ul>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Card title="Ajouter une note">
          {!student.classe_id ? (
            <p className="text-sm text-encre-nocturne/50">
              Cet etudiant n'a pas de classe affectee : impossible de choisir un semestre valide.
            </p>
          ) : (
            <form onSubmit={submitGrade} className="space-y-3">
              <TextField label="Matiere" value={gradeForm.matiere} onChange={(v) => setGradeForm((f) => ({ ...f, matiere: v }))} required />
              <TextField label="Note (/20)" type="number" min="0" max="20" step="0.25" value={gradeForm.note} onChange={(v) => setGradeForm((f) => ({ ...f, note: v }))} required />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-encre-nocturne">Semestre</label>
                  <select
                    required
                    value={gradeForm.semestre}
                    onChange={(e) => setGradeForm((f) => ({ ...f, semestre: e.target.value }))}
                    className="focus-ring w-full rounded-md border border-encre-nocturne/20 px-3 py-2 text-sm"
                  >
                    <option value="">Choisir...</option>
                    {semestresDisponibles.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-encre-nocturne">Type</label>
                  <select
                    value={gradeForm.type_evaluation}
                    onChange={(e) => setGradeForm((f) => ({ ...f, type_evaluation: e.target.value }))}
                    className="focus-ring w-full rounded-md border border-encre-nocturne/20 px-3 py-2 text-sm"
                  >
                    <option value="devoir">Devoir</option>
                    <option value="examen">Examen</option>
                  </select>
                </div>
              </div>
              <Button type="submit">Enregistrer</Button>
            </form>
          )}

          <table className="mt-4 w-full text-left text-sm">
            <tbody className="divide-y divide-encre-nocturne/10">
              {student.notes.map((n) => (
                <tr key={n.id}>
                  <td className="py-1.5">{n.matiere}</td>
                  <td className="py-1.5 text-encre-nocturne/60">{n.semestre} · {n.type_evaluation}</td>
                  <td className="tabular py-1.5 text-right">{n.note}/20</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card title="Assiduite (calculee depuis les appels)">
          <p className="text-xs text-encre-nocturne/50">
            Alimentee automatiquement par les appels de presence des enseignants.
          </p>
          <table className="mt-3 w-full text-left text-sm">
            <tbody className="divide-y divide-encre-nocturne/10">
              {student.assiduite.map((a) => (
                <tr key={a.semestre}>
                  <td className="py-1.5">{a.semestre}</td>
                  <td className="tabular py-1.5 text-right">{a.taux_presence}%</td>
                </tr>
              ))}
              {student.assiduite.length === 0 && (
                <tr>
                  <td className="py-4 text-center text-encre-nocturne/50">Aucun appel enregistre pour le moment.</td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      </div>

      <ConfirmModal
        open={modalOpen}
        title={student.statut_compte === "actif" ? "Desactiver ce compte ?" : "Activer ce compte ?"}
        description={
          student.statut_compte === "actif"
            ? "L'etudiant ne pourra plus consulter ses resultats tant que le compte reste desactive."
            : "L'etudiant retrouvera l'acces a son tableau de bord."
        }
        requireMotif={student.statut_compte === "actif"}
        confirmLabel={student.statut_compte === "actif" ? "Desactiver" : "Activer"}
        variant={student.statut_compte === "actif" ? "destructive" : "primary"}
        onConfirm={toggleStatus}
        onCancel={() => setModalOpen(false)}
      />
    </DashboardLayout>
  );
}

function TextField({ label, value, onChange, type = "text", ...rest }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-encre-nocturne">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="focus-ring w-full rounded-md border border-encre-nocturne/20 px-3 py-2 text-sm"
        {...rest}
      />
    </div>
  );
}
