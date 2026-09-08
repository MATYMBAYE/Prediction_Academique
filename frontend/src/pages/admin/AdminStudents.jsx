import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import CoqueApplication from "../../components/AppShell.jsx";
import { navigationAdmin } from "../../components/navigation.js";
import Card from "../../components/Card.jsx";
import Button from "../../components/Button.jsx";
import Pagination from "../../components/Pagination.jsx";
import ConfirmModal from "../../components/ConfirmModal.jsx";
import StudentImportModal from "../../components/StudentImportModal.jsx";
import { RiskBadge, AccountStatusBadge } from "../../components/StatusBadge.jsx";
import client from "../../api/client.js";

const EMPTY_FORM = { matricule: "", nom: "", prenom: "", classe_id: "", identifiant: "", mot_de_passe: "", email: "" };

export default function AdminStudents() {
  const [result, setResult] = useState({ items: [], page: 1, pages: 1, total: 0 });
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showTestEmailModal, setShowTestEmailModal] = useState(false);
  const [testEmailLoading, setTestEmailLoading] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState(null);
  const [testEmailAddress, setTestEmailAddress] = useState("matymbaye6618@gmail.com");
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

    if (form.email && !form.email.trim().toLowerCase().endsWith("@groupeisi.com")) {
      setError("Adresse e-mail invalide. Veuillez utiliser une adresse e-mail institutionnelle se terminant par @groupeisi.com.");
      return;
    }

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

  const handleExport = (format = "csv") => {
    setShowExportMenu(false);
    const token = localStorage.getItem("token");
    const params = new URLSearchParams();
    params.append("format", format);
    if (search) params.append("q", search);

    const exportUrl = `${client.defaults.baseURL || "/api"}/admin/students/export?${params.toString()}`;

    fetch(exportUrl, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => {
        if (!res.ok) throw new Error("Erreur d'exportation");
        return res.blob();
      })
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const ext = format === "xlsx" ? "xlsx" : "csv";
        a.download = `export_etudiants_${new Date().toISOString().slice(0, 10)}.${ext}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      })
      .catch((err) => {
        console.error("Erreur lors de l'exportation :", err);
      });
  };

  const handleRunEmailTest = async () => {
    setTestEmailLoading(true);
    setTestEmailResult(null);
    try {
      const resp = await client.post("/admin/students/test-email", { email: testEmailAddress });
      setTestEmailResult(resp.data);
    } catch (err) {
      setTestEmailResult({
        envoi_ok: false,
        details: [err.response?.data?.error || "Erreur lors du test de connexion SMTP."],
      });
    } finally {
      setTestEmailLoading(false);
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
    <CoqueApplication titre="Gestion des Étudiants" sectionsNavigation={navigationAdmin()}>
      {/* Barre d'actions supérieure */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-encre-nocturne/60">
          Total : <strong className="text-encre-nocturne">{result.total}</strong> étudiant(s)
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Recherche */}
          <input
            type="search"
            placeholder="Rechercher par nom, matricule..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="focus-ring rounded-md border border-encre-nocturne/20 px-3 py-1.5 text-sm w-48 sm:w-64"
          />

          {/* Bouton Diagnostic SMTP / E-mails */}
          <Button
            variant="secondary"
            onClick={() => setShowTestEmailModal(true)}
            className="text-xs flex items-center gap-1.5"
            title="Tester la configuration SMTP et l'envoi d'e-mails"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4 text-indigo-trajectoire">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
            </svg>
            <span>Test E-mail</span>
          </Button>

          {/* Bouton Exporter avec menu déroulant */}
          <div className="relative">
            <Button
              variant="secondary"
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-1.5"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              <span>Exporter</span>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="size-3">
                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
              </svg>
            </Button>

            {showExportMenu && (
              <div className="absolute right-0 mt-1.5 w-44 rounded-lg bg-white p-1 shadow-lg ring-1 ring-black/5 z-20">
                <button
                  onClick={() => handleExport("csv")}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs font-medium text-encre-nocturne hover:bg-sable-chaud/40"
                >
                  <span className="font-mono font-bold text-indigo-trajectoire">CSV</span> Exporter en CSV
                </button>
                <button
                  onClick={() => handleExport("xlsx")}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs font-medium text-encre-nocturne hover:bg-sable-chaud/40"
                >
                  <span className="font-mono font-bold text-emerald-600">XLSX</span> Exporter en Excel
                </button>
              </div>
            )}
          </div>

          {/* Bouton Importer (ouvre le modal complet) */}
          <Button
            variant="secondary"
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-1.5 border-indigo-trajectoire/30 text-indigo-trajectoire hover:bg-indigo-trajectoire/5"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
            </svg>
            <span>Importer</span>
          </Button>

          {/* Bouton Ajouter un étudiant (conservé STRICTEMENT intact) */}
          <Button onClick={() => {
            setShowForm((v) => !v);
            if (!showForm) {
              setEditingStudent(null);
              setForm(EMPTY_FORM);
            }
          }}>
            {showForm ? "Annuler" : "+ Ajouter un étudiant"}
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
            <Field label="Identifiant de connexion" name="identifiant" value={form.identifiant} onChange={handleChange} disabled={!!editingStudent} required />
            <Field label="Email" name="email" type="email" value={form.email} onChange={handleChange} />
            <div>
              <Field 
                label={editingStudent ? "Nouveau mot de passe" : "Mot de passe initial"} 
                name="mot_de_passe" 
                type="password" 
                value={form.mot_de_passe} 
                onChange={handleChange} 
                required={!editingStudent} 
              />
              <p className="mt-1 text-xs text-encre-nocturne/60">
                {editingStudent ? "Laissez vide pour conserver le mot de passe actuel." : "Min 8 caractères, 1 majuscule, 1 minuscule, 1 chiffre, 1 caractère spécial."}
              </p>
            </div>

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

      {/* Modal d'importation en masse */}
      <StudentImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportSuccess={() => load(1)}
        apiPrefix="/admin"
      />

      {/* Modal de suppression */}
      <ConfirmModal
        open={!!deleteStudentId}
        title="Supprimer l'etudiant"
        description="Etes-vous sur de vouloir supprimer cet etudiant ? Cette action supprimera egalement ses notes, ses presences et son compte utilisateur."
        confirmLabel="Supprimer"
        onConfirm={handleDelete}
        onCancel={() => setDeleteStudentId(null)}
      />

      {/* Modal de Test SMTP / E-mail */}
      {showTestEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-encre-nocturne/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl border border-encre-nocturne/10 space-y-4">
            <div className="flex items-center justify-between border-b border-encre-nocturne/10 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-trajectoire/10 text-indigo-trajectoire">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                  </svg>
                </div>
                <h3 className="font-bold text-encre-nocturne">Diagnostic & Test d'envoi d'e-mail</h3>
              </div>
              <button onClick={() => setShowTestEmailModal(false)} className="text-encre-nocturne/40 hover:text-encre-nocturne">
                ✕
              </button>
            </div>

            <p className="text-xs text-encre-nocturne/70">
              Vérifiez la configuration SMTP active (expéditeur officiel <code>admin@groupeisi.com</code>) et effectuez un test d'envoi réel.
            </p>

            <div>
              <label className="mb-1 block text-xs font-semibold text-encre-nocturne">
                Adresse e-mail de réception pour le test :
              </label>
              <input
                type="email"
                value={testEmailAddress}
                onChange={(e) => setTestEmailAddress(e.target.value)}
                className="focus-ring w-full rounded-md border border-encre-nocturne/20 px-3 py-2 text-sm font-mono"
              />
            </div>

            {testEmailResult && (
              <div className="rounded-lg border border-encre-nocturne/10 bg-sable-chaud/20 p-3 text-xs space-y-2 max-h-56 overflow-y-auto">
                <div className="flex items-center justify-between font-semibold">
                  <span>Statut global :</span>
                  <span className={testEmailResult.envoi_ok ? "text-emerald-600 font-bold" : "text-brique-alerte font-bold"}>
                    {testEmailResult.envoi_ok ? "✅ Envoi réussi" : "⚠️ Problème de configuration"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1 text-[11px] text-encre-nocturne/80 pt-1 border-t border-encre-nocturne/10">
                  <div>Serveur : <strong>{testEmailResult.serveur_smtp}:{testEmailResult.port_smtp}</strong></div>
                  <div>Chiffrement : <strong>{testEmailResult.chiffrement}</strong></div>
                  <div>Expéditeur : <strong>{testEmailResult.adresse_expedition}</strong></div>
                  <div>Mot de passe : <strong>{testEmailResult.mot_de_passe_configure ? "Configuré" : "Non renseigné"}</strong></div>
                </div>
                <div className="pt-2 border-t border-encre-nocturne/10 space-y-1">
                  <div className="font-semibold text-encre-nocturne">Détails d'exécution :</div>
                  {testEmailResult.details?.map((d, i) => (
                    <div key={i} className="text-encre-nocturne/70 font-mono text-[10.5px]">
                      • {d}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setShowTestEmailModal(false)}>
                Fermer
              </Button>
              <Button onClick={handleRunEmailTest} disabled={testEmailLoading || !testEmailAddress}>
                {testEmailLoading ? "Test en cours..." : "Lancer le test réel"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </CoqueApplication>
  );
}

function Field({ label, name, type = "text", value, onChange, required, placeholder, disabled = false }) {
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
        disabled={disabled}
        placeholder={placeholder}
        className="focus-ring w-full rounded-md border border-encre-nocturne/20 px-3 py-2 text-sm disabled:bg-sable-chaud/50 disabled:cursor-not-allowed"
      />
    </div>
  );
}
