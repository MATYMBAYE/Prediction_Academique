import { useEffect, useState } from "react";
import CoqueApplication from "../../components/AppShell.jsx";
import { navigationAdmin } from "../../components/navigation.js";
import Card from "../../components/Card.jsx";
import Button from "../../components/Button.jsx";
import Pagination from "../../components/Pagination.jsx";
import ConfirmModal from "../../components/ConfirmModal.jsx";
import { AccountStatusBadge } from "../../components/StatusBadge.jsx";
import { Link } from "react-router-dom";
import client from "../../api/client.js";

const EMPTY_FORM = { nom: "", prenom: "", identifiant: "", mot_de_passe: "", email: "" };

export default function AdminTeachers() {
  const [result, setResult] = useState({ items: [], page: 1, pages: 1, total: 0 });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [deleteTeacherId, setDeleteTeacherId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const load = (targetPage = page) => {
    client.get("/admin/teachers", { params: { page: targetPage, q: search || undefined } }).then(({ data }) => setResult(data));
  };

  useEffect(() => {
    load(1);
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => {
    load(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (form.email && !form.email.trim().toLowerCase().endsWith("@groupeisi.com")) {
      setError("Adresse e-mail invalide. Veuillez utiliser une adresse e-mail institutionnelle se terminant par @groupeisi.com.");
      return;
    }

    setSubmitting(true);
    try {
      if (editingTeacher) {
        await client.put(`/admin/teachers/${editingTeacher.id}`, form);
        setEditingTeacher(null);
      } else {
        await client.post("/admin/teachers", form);
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


  const handleEdit = (teacher) => {
    setEditingTeacher(teacher);
    setForm({
      nom: teacher.nom || "",
      prenom: teacher.prenom || "",
      identifiant: teacher.identifiant || "",
      mot_de_passe: "",
      email: teacher.email || "",
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async () => {
    try {
      await client.delete(`/admin/teachers/${deleteTeacherId}`);
      setDeleteTeacherId(null);
      load();
    } catch (err) {
      console.error(err);
    }
  };



  return (
    <CoqueApplication titre="Enseignants" sectionsNavigation={navigationAdmin()}>
      <div className="flex flex-wrap items-center justify-end gap-3">
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
              setEditingTeacher(null);
              setForm(EMPTY_FORM);
            }
          }}>
            {showForm ? "Annuler" : "Ajouter un enseignant"}
          </Button>
        </div>
      </div>

      {showForm && (
        <Card className="mt-4" title={editingTeacher ? "Modifier l'enseignant" : "Nouveau compte enseignant"}>
          <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2">
            <Field label="Nom" value={form.nom} onChange={(v) => setForm((f) => ({ ...f, nom: v }))} required />
            <Field label="Prenom" value={form.prenom} onChange={(v) => setForm((f) => ({ ...f, prenom: v }))} required />
            {!editingTeacher && (
              <Field label="Identifiant de connexion" value={form.identifiant} onChange={(v) => setForm((f) => ({ ...f, identifiant: v }))} required />
            )}
            {editingTeacher && (
              <Field label="Identifiant de connexion" value={form.identifiant} onChange={(v) => setForm((f) => ({ ...f, identifiant: v }))} required />
            )}
            <Field label="Email" type="email" value={form.email} onChange={(v) => setForm((f) => ({ ...f, email: v }))} />
            <div>
              <Field label="Mot de passe" type="password" value={form.mot_de_passe} onChange={(v) => setForm((f) => ({ ...f, mot_de_passe: v }))} required={!editingTeacher} placeholder={editingTeacher ? "Laisser vide pour ne pas modifier" : ""} />
              <p className="mt-1 text-xs text-encre-nocturne/60">
                Min 8 caractères, 1 majuscule, 1 minuscule, 1 chiffre, 1 caractère spécial.
              </p>
            </div>
            {error && <p className="sm:col-span-2 text-sm text-brique-alerte">{error}</p>}
            <div className="sm:col-span-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Enregistrement..." : (editingTeacher ? "Enregistrer" : "Creer")}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="mt-6">
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead>
                <tr className="border-b border-encre-nocturne/10 text-encre-nocturne/60">
                  <th className="py-2 font-medium">Nom</th>
                  <th className="py-2 font-medium">Identifiant</th>
                  <th className="py-2 font-medium">Statut compte</th>
                  <th className="py-2 font-medium">Affectations</th>
                  <th className="py-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-encre-nocturne/10">
                {result.items.map((t) => (
                  <tr key={t.id}>
                    <td className="py-2">{t.prenom} {t.nom}</td>
                    <td className="py-2 text-encre-nocturne/60">{t.identifiant}</td>
                    <td className="py-2"><AccountStatusBadge status={t.statut_compte} /></td>
                    <td className="py-2 text-xs text-encre-nocturne/70">
                      {t.affectations.map((a) => `${a.matiere} (${a.classe})`).join(", ") || "Aucune"}
                    </td>
                    <td className="py-2 flex items-center gap-2">
                      <Link to={`/admin/enseignants/${t.id}`} className="text-indigo-trajectoire hover:underline text-xs">
                        Fiche
                      </Link>
                      <button onClick={() => handleEdit(t)} className="text-indigo-trajectoire hover:text-indigo-trajectoire/80" title="Modifier">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                        </svg>
                      </button>
                      <button onClick={() => setDeleteTeacherId(t.id)} className="text-brique-alerte hover:text-brique-alerte/80" title="Supprimer">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
                {result.items.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-encre-nocturne/50">Aucun enseignant enregistre.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination page={result.page} pages={result.pages} total={result.total} onPageChange={setPage} />
        </Card>
      </div>

      <ConfirmModal
        open={!!deleteTeacherId}
        title="Supprimer l'enseignant"
        description="Etes-vous sur de vouloir supprimer cet enseignant ? Cette action supprimera egalement toutes ses affectations et son compte utilisateur."
        confirmLabel="Supprimer"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTeacherId(null)}
      />
    </CoqueApplication>
  );
}

function Field({ label, type = "text", value, onChange, required, placeholder }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-encre-nocturne">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        className="focus-ring w-full rounded-md border border-encre-nocturne/20 px-3 py-2 text-sm"
      />
    </div>
  );
}
