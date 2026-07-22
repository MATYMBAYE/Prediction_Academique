import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../../components/DashboardLayout.jsx";
import Card from "../../components/Card.jsx";
import Button from "../../components/Button.jsx";
import Pagination from "../../components/Pagination.jsx";
import ConfirmModal from "../../components/ConfirmModal.jsx";
import { RiskBadge, AccountStatusBadge } from "../../components/StatusBadge.jsx";
import client from "../../api/client.js";
import { ADMIN_NAV_ITEMS } from "./adminNav.jsx";

const EMPTY_FORM = { matricule: "", nom: "", prenom: "", classe_id: "", identifiant: "", mot_de_passe: "", email: "" };

export default function AdminStudents() {
  const [result, setResult] = useState({ items: [], page: 1, pages: 1, total: 0 });
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [editingStudent, setEditingStudent] = useState(null);
  const [deleteStudentId, setDeleteStudentId] = useState(null);

  const load = (targetPage = page) => {
    client.get("/admin/students", { params: { page: targetPage, q: search || undefined } }).then(({ data }) => {
      setResult(data);
      setLoading(false);
    });
  };

  useEffect(() => {
    client.get("/admin/classes").then(({ data }) => setClasses(data));
  }, []);

  useEffect(() => {
    load(1);
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => {
    load(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      if (editingStudent) {
        await client.put(`/admin/students/${editingStudent.id}`, { ...form, classe_id: form.classe_id || null });
        setEditingStudent(null);
      } else {
        await client.post("/admin/students", { ...form, classe_id: form.classe_id || null });
      }
      setForm(EMPTY_FORM);
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.response?.data?.error || "Une erreur est survenue.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (student) => {
    setEditingStudent(student);
    setForm({
      matricule: student.matricule || "",
      nom: student.nom || "",
      prenom: student.prenom || "",
      classe_id: student.classe_id || "",
      identifiant: student.identifiant || "",
      mot_de_passe: "",
      email: student.email || "",
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async () => {
    try {
      await client.delete(`/admin/students/${deleteStudentId}`);
      setDeleteStudentId(null);
      load();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <DashboardLayout title="Espace Administration" navItems={ADMIN_NAV_ITEMS}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-xl font-semibold text-encre-nocturne">Etudiants</h1>
        <div className="flex gap-2">
          <input
            type="search"
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="focus-ring rounded-md border border-encre-nocturne/20 px-3 py-1.5 text-sm"
          />
          <Button onClick={() => {
            setShowForm((v) => !v);
            if (!showForm) {
              setEditingStudent(null);
              setForm(EMPTY_FORM);
            }
          }}>
            {showForm ? "Annuler" : "Ajouter un etudiant"}
          </Button>
        </div>
      </div>

      {showForm && (
        <Card className="mt-4" title={editingStudent ? "Modifier l'etudiant" : "Nouvelle fiche etudiant"}>
          <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2">
            <Field label="Matricule" name="matricule" value={form.matricule} onChange={handleChange} required />
            <div>
              <label className="mb-1 block text-sm font-medium text-encre-nocturne">Classe</label>
              <select
                name="classe_id"
                value={form.classe_id}
                onChange={handleChange}
                className="focus-ring w-full rounded-md border border-encre-nocturne/20 px-3 py-2 text-sm"
              >
                <option value="">Non affectee</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.nom}</option>
                ))}
              </select>
            </div>
            <Field label="Nom" name="nom" value={form.nom} onChange={handleChange} required />
            <Field label="Prenom" name="prenom" value={form.prenom} onChange={handleChange} required />
            {!editingStudent && (
              <>
                <Field label="Identifiant de connexion" name="identifiant" value={form.identifiant} onChange={handleChange} required />
                <Field label="Email" name="email" type="email" value={form.email} onChange={handleChange} />
                <div>
                  <Field label="Mot de passe initial" name="mot_de_passe" type="password" value={form.mot_de_passe} onChange={handleChange} required />
                  <p className="mt-1 text-xs text-encre-nocturne/60">
                    Min 8 caractères, 1 majuscule, 1 minuscule, 1 chiffre, 1 caractère spécial.
                  </p>
                </div>
              </>
            )}

            {error && <p className="sm:col-span-2 text-sm text-brique-alerte">{error}</p>}

            <div className="sm:col-span-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Enregistrement..." : (editingStudent ? "Enregistrer les modifications" : "Creer l'etudiant")}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="mt-6">
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-encre-nocturne/10 text-encre-nocturne/60">
                  <th className="py-2 font-medium">Nom</th>
                  <th className="py-2 font-medium">Classe</th>
                  <th className="py-2 font-medium">Risque</th>
                  <th className="py-2 font-medium">Statut compte</th>
                  <th className="py-2 font-medium">Fiche</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-encre-nocturne/10">
                {result.items.map((s) => (
                  <tr key={s.id}>
                    <td className="py-2">
                      {s.prenom} {s.nom}
                      <div className="text-xs text-encre-nocturne/50">{s.matricule}</div>
                    </td>
                    <td className="py-2 text-encre-nocturne/70">{s.classe ?? "-"}</td>
                    <td className="py-2"><RiskBadge level={s.niveau_risque} /></td>
                    <td className="py-2"><AccountStatusBadge status={s.statut_compte} /></td>
                    <td className="py-2 flex items-center gap-2">
                      <Link to={`/admin/etudiants/${s.id}`} className="text-indigo-trajectoire hover:underline text-xs">
                        Fiche
                      </Link>
                      <button onClick={() => handleEdit(s)} className="text-indigo-trajectoire hover:text-indigo-trajectoire/80" title="Modifier">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                        </svg>
                      </button>
                      <button onClick={() => setDeleteStudentId(s.id)} className="text-brique-alerte hover:text-brique-alerte/80" title="Supprimer">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
                {!loading && result.items.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-encre-nocturne/50">
                      Aucun etudiant enregistre pour le moment.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination page={result.page} pages={result.pages} total={result.total} onPageChange={setPage} />
        </Card>
      </div>

      <ConfirmModal
        open={!!deleteStudentId}
        title="Supprimer l'etudiant"
        description="Etes-vous sur de vouloir supprimer cet etudiant ? Cette action supprimera egalement ses notes, ses presences et son compte utilisateur."
        confirmLabel="Supprimer"
        onConfirm={handleDelete}
        onCancel={() => setDeleteStudentId(null)}
      />
    </DashboardLayout>
  );
}

function Field({ label, name, type = "text", value, onChange, required, placeholder }) {
  return (
    <div>
      <label htmlFor={name} className="mb-1 block text-sm font-medium text-encre-nocturne">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        className="focus-ring w-full rounded-md border border-encre-nocturne/20 px-3 py-2 text-sm"
      />
    </div>
  );
}
