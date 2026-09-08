import { useState, useRef } from "react";
import client from "../api/client.js";
import Button from "./Button.jsx";

export default function StudentImportModal({ isOpen, onClose, onImportSuccess, apiPrefix = "/admin" }) {
  const [step, setStep] = useState("upload"); // "upload" | "preview" | "result"
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [previewData, setPreviewData] = useState(null);
  const [sendEmails, setSendEmails] = useState(true);
  const [importResult, setImportResult] = useState(null);
  const [filterTab, setFilterTab] = useState("all"); // "all" | "valid" | "error"
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    processFile(selectedFile);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (!droppedFile) return;
    processFile(droppedFile);
  };

  const processFile = async (uploadedFile) => {
    setFile(uploadedFile);
    setError("");
    setLoading(true);

    const formData = new FormData();
    formData.append("file", uploadedFile);

    try {
      const response = await client.post(`${apiPrefix}/students/import-preview`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setPreviewData(response.data);
      setStep("preview");
    } catch (err) {
      setError(
        err.response?.data?.error ||
          "Erreur lors de l'analyse du fichier. Vérifiez le format (CSV ou Excel)."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = (format = "csv") => {
    const token = localStorage.getItem("token");
    const downloadUrl = `${client.defaults.baseURL || "/api"}${apiPrefix}/students/template?format=${format}`;
    
    // Téléchargement propre via fetch avec token d'authentification
    fetch(downloadUrl, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => {
        if (!res.ok) throw new Error("Erreur de téléchargement");
        return res.blob();
      })
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `modele_import_etudiants_isi.${format === "xlsx" ? "xlsx" : "csv"}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      })
      .catch((err) => {
        console.error("Erreur téléchargement modèle :", err);
        setError("Impossible de télécharger le modèle.");
      });
  };

  const handleExecuteImport = async () => {
    if (!previewData?.valid_rows || previewData.valid_rows.length === 0) return;
    setLoading(true);
    setError("");

    try {
      const response = await client.post(`${apiPrefix}/students/import`, {
        valid_rows: previewData.valid_rows,
        send_emails: sendEmails,
      });
      setImportResult(response.data);
      setStep("result");
      if (onImportSuccess) onImportSuccess();
    } catch (err) {
      setError(err.response?.data?.error || "Erreur lors de l'enregistrement de l'importation.");
    } finally {
      setLoading(false);
    }
  };

  const resetModal = () => {
    setStep("upload");
    setFile(null);
    setPreviewData(null);
    setImportResult(null);
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  // Filtrage du tableau de prévisualisation
  const displayedRows = () => {
    if (!previewData) return [];
    if (filterTab === "valid") return previewData.valid_rows || [];
    if (filterTab === "error") return previewData.error_rows || [];
    return [...(previewData.valid_rows || []), ...(previewData.error_rows || [])].sort(
      (a, b) => a.line_num - b.line_num
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-encre-nocturne/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl rounded-xl bg-white shadow-2xl transition-all border border-encre-nocturne/10 max-h-[90vh] flex flex-col">
        {/* En-tête */}
        <div className="flex items-center justify-between border-b border-encre-nocturne/10 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-trajectoire/10 text-indigo-trajectoire">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-encre-nocturne">Importer une liste d'étudiants</h2>
              <p className="text-xs text-encre-nocturne/60">
                Importation en masse par fichier CSV ou Excel avec création automatique des comptes
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-1.5 text-encre-nocturne/40 hover:bg-encre-nocturne/5 hover:text-encre-nocturne"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Corps */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 rounded-lg bg-brique-alerte/10 border border-brique-alerte/20 p-3.5 text-sm text-brique-alerte flex items-start gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5 shrink-0 mt-0.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* ÉTAPE 1 : TÉLÉVERSEMENT */}
          {step === "upload" && (
            <div className="space-y-6">
              {/* Informations importantes */}
              <div className="rounded-xl bg-indigo-50/60 border border-indigo-100 backdrop-blur-sm p-4.5 text-xs text-encre-nocturne/85 space-y-2 shadow-sm">
                <div className="font-semibold text-indigo-700 flex items-center gap-2 text-sm">
                  <div className="grid h-6 w-6 place-items-center rounded-lg bg-indigo-600/10 text-indigo-600">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="size-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
                    </svg>
                  </div>
                  Consignes et règles d'importation
                </div>
                <ul className="list-disc list-inside space-y-1.5 pl-1 text-slate-700">
                  <li><strong>Matricule officiel :</strong> Le matricule fourni dans le fichier sera conservé exactement tel quel comme référence unique.</li>
                  <li><strong>Sécurité des mots de passe :</strong> Le fichier ne doit <strong>pas</strong> contenir de mot de passe. Le système génère automatiquement un mot de passe temporaire fort et haché en BDD.</li>
                  <li><strong>Création des comptes & E-mails :</strong> Un compte utilisateur est créé automatiquement pour chaque étudiant et ses informations de première connexion lui sont envoyées par e-mail.</li>
                </ul>
              </div>

              {/* Zone Drag & Drop */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-indigo-200/80 bg-gradient-to-b from-indigo-50/20 to-white/80 backdrop-blur-sm p-8 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/40 transition-all shadow-sm group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv, .xlsx, .xls"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 shadow-sm border border-indigo-100 group-hover:scale-105 transition-transform">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-7">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m6.75 12-3-3m0 0-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-encre-nocturne">
                  Cliquez pour choisir un fichier ou glissez-déposez ici
                </p>
                <p className="mt-1 text-xs text-encre-nocturne/60">
                  Formats acceptés : <strong>CSV (.csv)</strong> ou <strong>Excel (.xlsx, .xls)</strong>
                </p>
                {loading && (
                  <div className="mt-4 text-xs font-semibold text-indigo-600 animate-pulse">
                    Analyse du fichier en cours...
                  </div>
                )}
              </div>

              {/* Téléchargement du modèle */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/70 bg-white/80 backdrop-blur-sm p-4 shadow-sm">
                <div>
                  <h4 className="text-sm font-semibold text-encre-nocturne">Besoin du format exact attendu ?</h4>
                  <p className="text-xs text-encre-nocturne/60">
                    Téléchargez le modèle avec les colonnes : <code>Matricule, Nom, Prénom, Email, Filière, Niveau, Classe</code>
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => handleDownloadTemplate("csv")}>
                    📥 Modèle CSV
                  </Button>
                  <Button variant="secondary" onClick={() => handleDownloadTemplate("xlsx")}>
                    📥 Modèle Excel (.xlsx)
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ÉTAPE 2 : PRÉVISUALISATION & VALIDATION */}
          {step === "preview" && previewData && (
            <div className="space-y-5">
              {/* Résumé des indicateurs */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-200/70 bg-white/80 backdrop-blur-sm p-4 shadow-sm">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total analysé</div>
                  <div className="text-2xl font-bold text-slate-900 mt-1">{previewData.total_rows} lignes</div>
                </div>
                <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/60 backdrop-blur-sm p-4 shadow-sm">
                  <div className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">Prêtes à être importées</div>
                  <div className="text-2xl font-bold text-emerald-700 mt-1">{previewData.valid_count} étudiants</div>
                </div>
                <div className={`rounded-xl border backdrop-blur-sm p-4 shadow-sm ${previewData.error_count > 0 ? "border-rose-200 bg-rose-50/60 text-rose-800" : "border-slate-200/70 bg-white/80 text-slate-500"}`}>
                  <div className="text-xs font-semibold uppercase tracking-wider">Lignes avec erreurs</div>
                  <div className={`text-2xl font-bold mt-1 ${previewData.error_count > 0 ? "text-rose-700" : "text-slate-800"}`}>{previewData.error_count} erreurs</div>
                </div>
              </div>


              {/* Onglets de filtrage */}
              <div className="flex items-center justify-between border-b border-encre-nocturne/10 pb-2">
                <div className="flex gap-2">
                  <button
                    onClick={() => setFilterTab("all")}
                    className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${filterTab === "all" ? "bg-indigo-trajectoire text-white" : "bg-encre-nocturne/5 text-encre-nocturne/70 hover:bg-encre-nocturne/10"}`}
                  >
                    Toutes ({previewData.total_rows})
                  </button>
                  <button
                    onClick={() => setFilterTab("valid")}
                    className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${filterTab === "valid" ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"}`}
                  >
                    Valides ({previewData.valid_count})
                  </button>
                  {previewData.error_count > 0 && (
                    <button
                      onClick={() => setFilterTab("error")}
                      className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${filterTab === "error" ? "bg-brique-alerte text-white" : "bg-brique-alerte/10 text-brique-alerte hover:bg-brique-alerte/20"}`}
                    >
                      En erreur ({previewData.error_count})
                    </button>
                  )}
                </div>

                <div className="text-xs text-encre-nocturne/60">
                  Fichier : <span className="font-semibold text-encre-nocturne">{file?.name}</span>
                </div>
              </div>

              {/* Tableau de prévisualisation */}
              <div className="overflow-x-auto max-h-64 rounded-lg border border-encre-nocturne/10 bg-white">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-sable-chaud border-b border-encre-nocturne/10 text-encre-nocturne/70">
                    <tr>
                      <th className="p-2.5">Ligne</th>
                      <th className="p-2.5">Matricule</th>
                      <th className="p-2.5">Nom & Prénom</th>
                      <th className="p-2.5">Email</th>
                      <th className="p-2.5">Filière / Niveau</th>
                      <th className="p-2.5">Classe</th>
                      <th className="p-2.5">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-encre-nocturne/10">
                    {displayedRows().map((row, idx) => (
                      <tr key={idx} className={row.is_valid ? "hover:bg-emerald-50/40" : "bg-brique-alerte/5 hover:bg-brique-alerte/10"}>
                        <td className="p-2.5 font-mono text-encre-nocturne/50">{row.line_num}</td>
                        <td className="p-2.5 font-mono font-semibold text-encre-nocturne">{row.matricule || "—"}</td>
                        <td className="p-2.5 font-medium text-encre-nocturne">{row.prenom} {row.nom}</td>
                        <td className="p-2.5 text-encre-nocturne/70">{row.email}</td>
                        <td className="p-2.5 text-encre-nocturne/70">{row.filiere_nom || row.filiere} ({row.niveau})</td>
                        <td className="p-2.5 font-medium">{row.classe_nom || row.classe}</td>
                        <td className="p-2.5">
                          {row.is_valid ? (
                            <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                              Prêt
                            </span>
                          ) : (
                            <div className="space-y-0.5">
                              {row.errors.map((err, errIdx) => (
                                <span key={errIdx} className="block text-[11px] font-medium text-brique-alerte">
                                  • {err}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Option d'envoi d'e-mails */}
              <div className="flex items-center gap-2 rounded-lg border border-encre-nocturne/10 bg-sable-chaud/20 p-3">
                <input
                  type="checkbox"
                  id="sendEmailsCheckbox"
                  checked={sendEmails}
                  onChange={(e) => setSendEmails(e.target.checked)}
                  className="h-4 w-4 rounded border-encre-nocturne/20 text-indigo-trajectoire focus:ring-indigo-trajectoire"
                />
                <label htmlFor="sendEmailsCheckbox" className="text-xs text-encre-nocturne cursor-pointer">
                  <strong>Envoyer automatiquement un e-mail</strong> à chaque étudiant contenant son identifiant et son mot de passe temporaire.
                </label>
              </div>
            </div>
          )}

          {/* ÉTAPE 3 : RÉSULTAT */}
          {step === "result" && importResult && (
            <div className="space-y-5 text-center py-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="size-8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              </div>

              <div>
                <h3 className="text-xl font-bold text-encre-nocturne">Importation terminée avec succès !</h3>
                <p className="mt-1 text-sm text-encre-nocturne/60">
                  Les comptes étudiants ont été créés et associés aux matricules officiels.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3">
                  <div className="text-xs text-emerald-800">Étudiants importés</div>
                  <div className="text-2xl font-bold text-emerald-700">{importResult.total_imported}</div>
                </div>
                <div className="rounded-lg bg-indigo-trajectoire/10 border border-indigo-trajectoire/20 p-3">
                  <div className="text-xs text-indigo-trajectoire">E-mails transmis</div>
                  <div className="text-2xl font-bold text-indigo-trajectoire">{importResult.emails_sent}</div>
                </div>
              </div>

              {importResult.imported_students?.length > 0 && (
                <div className="text-left border border-encre-nocturne/10 rounded-lg p-3 max-h-48 overflow-y-auto bg-white text-xs">
                  <div className="font-semibold text-encre-nocturne mb-2">Comptes créés :</div>
                  <ul className="space-y-1 divide-y divide-encre-nocturne/5">
                    {importResult.imported_students.map((st, i) => (
                      <li key={i} className="pt-1 flex justify-between items-center text-encre-nocturne/80">
                        <span><strong>{st.matricule}</strong> — {st.prenom} {st.nom} ({st.classe})</span>
                        <span className="font-mono text-indigo-trajectoire bg-indigo-trajectoire/5 px-2 py-0.5 rounded">
                          Id : {st.identifiant}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Pied de page / Actions */}
        <div className="flex items-center justify-between border-t border-encre-nocturne/10 bg-sable-chaud/20 px-6 py-4">
          {step === "upload" && (
            <>
              <Button variant="secondary" onClick={handleClose}>
                Fermer
              </Button>
              <div className="text-xs text-encre-nocturne/50">
                Sélectionnez un fichier pour continuer
              </div>
            </>
          )}

          {step === "preview" && (
            <>
              <Button variant="secondary" onClick={resetModal} disabled={loading}>
                Changer de fichier
              </Button>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={handleClose} disabled={loading}>
                  Annuler
                </Button>
                <Button
                  onClick={handleExecuteImport}
                  disabled={loading || !previewData?.valid_count}
                >
                  {loading
                    ? "Importation en cours..."
                    : `Confirmer l'importation (${previewData?.valid_count || 0} étudiants)`}
                </Button>
              </div>
            </>
          )}

          {step === "result" && (
            <div className="w-full flex justify-end">
              <Button onClick={handleClose}>
                Terminer et actualiser
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
