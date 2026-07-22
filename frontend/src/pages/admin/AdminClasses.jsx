import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../../components/DashboardLayout.jsx";
import Card from "../../components/Card.jsx";
import Button from "../../components/Button.jsx";
import client from "../../api/client.js";
import { ADMIN_NAV_ITEMS } from "./adminNav.jsx";
import { NIVEAUX } from "../../academic.js";

export default function AdminClasses() {
  const [classes, setClasses] = useState([]);
  const [filieres, setFilieres] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [showClasseForm, setShowClasseForm] = useState(false);
  const [showFiliereForm, setShowFiliereForm] = useState(false);
  const [classeForm, setClasseForm] = useState({ filiere_id: "", niveau: "L1" });
  const [filiereForm, setFiliereForm] = useState({ nom: "", code: "" });
  const [assignForm, setAssignForm] = useState({ classe_id: "", teacher_id: "", matiere: "" });
  const [error, setError] = useState("");

  const load = () => {
    client.get("/admin/classes").then(({ data }) => setClasses(data));
    client.get("/admin/filieres").then(({ data }) => setFilieres(data));
    client.get("/admin/teachers", { params: { per_page: 100 } }).then(({ data }) => setTeachers(data.items));
  };

  useEffect(load, []);

  const submitFiliere = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await client.post("/admin/filieres", filiereForm);
      setFiliereForm({ nom: "", code: "" });
      setShowFiliereForm(false);
      load();
    } catch (err) {
      setError(err.response?.data?.error || "Impossible de creer la filiere.");
    }
  };

  const submitClasse = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await client.post("/admin/classes", classeForm);
      setShowClasseForm(false);
      load();
    } catch (err) {
      setError(err.response?.data?.error || "Impossible de creer la classe.");
    }
  };

  const submitAssign = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await client.post(`/admin/classes/${assignForm.classe_id}/enseignants`, {
        teacher_id: assignForm.teacher_id,
        matiere: assignForm.matiere,
      });
      setAssignForm({ classe_id: "", teacher_id: "", matiere: "" });
      load();
    } catch (err) {
      setError(err.response?.data?.error || "Impossible d'affecter l'enseignant.");
    }
  };

  const removeAssignment = async (assignmentId) => {
    await client.delete(`/admin/classes/enseignants/${assignmentId}`);
    load();
  };

  return (
    <DashboardLayout title="Espace Administration" navItems={ADMIN_NAV_ITEMS}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-xl font-semibold text-encre-nocturne">Gestion des classes</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShowFiliereForm((v) => !v)}>
            {showFiliereForm ? "Annuler" : "Nouvelle filiere"}
          </Button>
          <Button onClick={() => setShowClasseForm((v) => !v)}>
            {showClasseForm ? "Annuler" : "Nouvelle classe"}
          </Button>
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-brique-alerte">{error}</p>}

      {showFiliereForm && (
        <Card className="mt-4" title="Nouvelle filiere">
          <form onSubmit={submitFiliere} className="grid gap-3 sm:grid-cols-3">
            <input
              required placeholder="Nom (ex. Genie Logiciel)" value={filiereForm.nom}
              onChange={(e) => setFiliereForm((f) => ({ ...f, nom: e.target.value }))}
              className="focus-ring rounded-md border border-encre-nocturne/20 px-3 py-2 text-sm"
            />
            <input
              required placeholder="Code (ex. GL)" value={filiereForm.code}
              onChange={(e) => setFiliereForm((f) => ({ ...f, code: e.target.value }))}
              className="focus-ring rounded-md border border-encre-nocturne/20 px-3 py-2 text-sm"
            />
            <Button type="submit">Creer</Button>
          </form>
        </Card>
      )}

      {showClasseForm && (
        <Card className="mt-4" title="Nouvelle classe">
          <form onSubmit={submitClasse} className="grid gap-3 sm:grid-cols-3">
            <select
              required value={classeForm.filiere_id}
              onChange={(e) => setClasseForm((f) => ({ ...f, filiere_id: e.target.value }))}
              className="focus-ring rounded-md border border-encre-nocturne/20 px-3 py-2 text-sm"
            >
              <option value="">Filiere...</option>
              {filieres.map((f) => (
                <option key={f.id} value={f.id}>{f.nom} ({f.code})</option>
              ))}
            </select>
            <select
              value={classeForm.niveau}
              onChange={(e) => setClasseForm((f) => ({ ...f, niveau: e.target.value }))}
              className="focus-ring rounded-md border border-encre-nocturne/20 px-3 py-2 text-sm"
            >
              {NIVEAUX.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <Button type="submit">Creer</Button>
          </form>
        </Card>
      )}

      <Card className="mt-4" title="Affecter un enseignant a une classe">
        <form onSubmit={submitAssign} className="grid gap-3 sm:grid-cols-4">
          <select
            required value={assignForm.classe_id}
            onChange={(e) => setAssignForm((f) => ({ ...f, classe_id: e.target.value }))}
            className="focus-ring rounded-md border border-encre-nocturne/20 px-3 py-2 text-sm"
          >
            <option value="">Classe...</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.nom}</option>
            ))}
          </select>
          <select
            required value={assignForm.teacher_id}
            onChange={(e) => setAssignForm((f) => ({ ...f, teacher_id: e.target.value }))}
            className="focus-ring rounded-md border border-encre-nocturne/20 px-3 py-2 text-sm"
          >
            <option value="">Enseignant...</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>{t.prenom} {t.nom}</option>
            ))}
          </select>
          <input
            required placeholder="Matiere" value={assignForm.matiere}
            onChange={(e) => setAssignForm((f) => ({ ...f, matiere: e.target.value }))}
            className="focus-ring rounded-md border border-encre-nocturne/20 px-3 py-2 text-sm"
          />
          <Button type="submit">Affecter</Button>
        </form>
      </Card>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {classes.map((c) => (
          <Card key={c.id} title={c.nom}>
            <p className="text-sm text-encre-nocturne/60">Effectif : {c.effectif} etudiant(s)</p>
            <ul className="mt-3 space-y-1 text-sm">
              {c.enseignants.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-2">
                  <span>{e.matiere} — {e.enseignant}</span>
                  <button
                    onClick={() => removeAssignment(e.id)}
                    className="text-xs text-brique-alerte hover:underline"
                    aria-label={`Retirer ${e.enseignant} de ${e.matiere}`}
                  >
                    Retirer
                  </button>
                </li>
              ))}
              {c.enseignants.length === 0 && <li className="text-encre-nocturne/50">Aucun enseignant affecte.</li>}
            </ul>
            <Link to={`/admin/classes/${c.id}`} className="mt-3 inline-block text-sm text-indigo-trajectoire hover:underline">
              Voir l'historique des appels
            </Link>
          </Card>
        ))}
      </div>
    </DashboardLayout>
  );
}
