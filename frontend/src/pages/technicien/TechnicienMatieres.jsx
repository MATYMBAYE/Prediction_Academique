import { useEffect, useState, useMemo } from "react";
import CoqueApplication from "../../components/AppShell.jsx";
import { navigationTechnicien } from "../../components/navigation.js";
import Card from "../../components/Card.jsx";
import client from "../../api/client.js";
import { Bouton, Badge } from "../../components/ui/Primitives.jsx";
import { DOMAINS_STRUCTURE, getDomainesOptions, getFilieresForDomaine, getNiveauxForFiliere } from "../../academicStructure.js";
import { NIVEAUX } from "../../academic.js";

export default function TechnicienMatieres() {
  const [matieres, setMatieres] = useState([]);
  const [filieres, setFilieres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filtreDomaine, setFiltreDomaine] = useState("");
  const [filtreFiliereId, setFiltreFiliereId] = useState("");
  const [filtreNiveau, setFiltreNiveau] = useState("");

  // Modale Ajout / Modification
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [nom, setNom] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [modalDomaine, setModalDomaine] = useState("");
  const [filiereId, setFiliereId] = useState("");
  const [niveau, setNiveau] = useState("");
  const [coefficient, setCoefficient] = useState("1.0");
  const [credit, setCredit] = useState("");
  const [typeMatiere, setTypeMatiere] = useState("fondamentale");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadData = () => {
    setLoading(true);
    const params = {};
    if (search) params.q = search;
    if (filtreFiliereId) params.filiere_id = filtreFiliereId;
    if (filtreNiveau) params.niveau = filtreNiveau;
    if (filtreDomaine) params.domaine = filtreDomaine;

    Promise.all([
      client.get("/technicien/matieres", { params }),
      client.get("/technicien/filieres"),
    ]).then(([mRes, fRes]) => {
      setMatieres(mRes.data);
      setFilieres(fRes.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, filtreDomaine, filtreFiliereId, filtreNiveau]);

  // Options pour la modale
  const filieresModal = useMemo(() => {
    if (!modalDomaine) return filieres;
    return filieres.filter((f) => f.domaine === modalDomaine);
  }, [filieres, modalDomaine]);

  const filiereSelectionnee = useMemo(() => {
    return filieres.find((f) => String(f.id) === String(filiereId));
  }, [filieres, filiereId]);

  const niveauxDisponiblesModal = useMemo(() => {
    if (!filiereSelectionnee) return NIVEAUX;
    const code = filiereSelectionnee.code;
    const nivs = getNiveauxForFiliere(code);
    return nivs.length > 0 ? nivs : NIVEAUX;
  }, [filiereSelectionnee]);

  const openCreate = () => {
    setEditId(null);
    setNom("");
    setCode("");
    setDescription("");
    setModalDomaine("");
    setFiliereId("");
    setNiveau("");
    setCoefficient("1.0");
    setCredit("");
    setTypeMatiere("fondamentale");
    setError("");
    setShowModal(true);
  };

  const openEdit = (m) => {
    setEditId(m.id);
    setNom(m.nom);
    setCode(m.code);
    setDescription(m.description || "");
    setModalDomaine(m.domaine || "");
    setFiliereId(m.filiere_id ? String(m.filiere_id) : "");
    setNiveau(m.niveau || "");
    setCoefficient(m.coefficient !== undefined && m.coefficient !== null ? String(m.coefficient) : "1.0");
    setCredit(m.credit !== undefined && m.credit !== null ? String(m.credit) : "");
    setTypeMatiere(m.type_matiere || "fondamentale");
    setError("");
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const payload = {
        nom: nom.trim(),
        code: code.trim().toUpperCase(),
        description: description.trim() || null,
        filiere_id: filiereId ? parseInt(filiereId, 10) : null,
        niveau: niveau || null,
        coefficient: parseFloat(coefficient) || 1.0,
        credit: credit !== "" ? parseInt(credit, 10) : null,
        type_matiere: typeMatiere,
      };
      if (editId) {
        await client.put(`/technicien/matieres/${editId}`, payload);
      } else {
        await client.post("/technicien/matieres", payload);
      }
      setShowModal(false);
      loadData();
    } catch (err) {
      setError(err.response?.data?.error || "Erreur lors de l'enregistrement de la matière.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Êtes-vous certain de vouloir supprimer cette matière du catalogue ?")) {
      return;
    }
    try {
      await client.delete(`/technicien/matieres/${id}`);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const domainesOptions = getDomainesOptions();

  return (
    <CoqueApplication
      titre="Catalogue des Matières"
      sousTitre="Référentiel des modules et cours structurés par Domaine, Filière, Niveau et Coefficients"
      sectionsNavigation={navigationTechnicien()}
      actions={
        <Bouton variante="primaire" onClick={openCreate}>
          + Ajouter une Matière
        </Bouton>
      }
    >
      <div className="space-y-6">
        {/* Barre de filtrage avancée */}
        <div className="bg-white p-4 rounded-xl border border-ardoise-200 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-ardoise-600 mb-1">Recherche</label>
            <input
              type="text"
              placeholder="Nom ou code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-ardoise-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ardoise-600 mb-1">Domaine</label>
            <select
              value={filtreDomaine}
              onChange={(e) => {
                setFiltreDomaine(e.target.value);
                setFiltreFiliereId("");
              }}
              className="w-full rounded-lg border border-ardoise-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
            >
              <option value="">Tous les domaines</option>
              {domainesOptions.map((d) => (
                <option key={d.value} value={d.label}>
                  {d.icon} {d.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ardoise-600 mb-1">Filière</label>
            <select
              value={filtreFiliereId}
              onChange={(e) => setFiltreFiliereId(e.target.value)}
              className="w-full rounded-lg border border-ardoise-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
            >
              <option value="">Toutes les filières</option>
              {filieres
                .filter((f) => !filtreDomaine || f.domaine === filtreDomaine)
                .map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nom} ({f.code})
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ardoise-600 mb-1">Niveau</label>
            <select
              value={filtreNiveau}
              onChange={(e) => setFiltreNiveau(e.target.value)}
              className="w-full rounded-lg border border-ardoise-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
            >
              <option value="">Tous les niveaux</option>
              {NIVEAUX.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tableau des matières */}
        <Card title={`Catalogue des matières (${matieres.length})`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ardoise-200 text-xs font-semibold uppercase tracking-wider text-ardoise-500">
                  <th className="py-3 px-3">Code</th>
                  <th className="py-3 px-3">Intitulé</th>
                  <th className="py-3 px-3">Filière & Domaine</th>
                  <th className="py-3 px-3">Niveau</th>
                  <th className="py-3 px-3 text-center">Coeff</th>
                  <th className="py-3 px-3 text-center">Crédits</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ardoise-100">
                {matieres.map((m) => (
                  <tr key={m.id} className="hover:bg-ardoise-50/50 transition-colors">
                    <td className="py-3 px-3 font-mono text-xs font-bold text-indigo-700">
                      <span className="inline-block px-2 py-0.5 bg-indigo-50 border border-indigo-200 rounded">
                        {m.code}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-semibold text-encre-900">{m.nom}</td>
                    <td className="py-3 px-3">
                      <div className="text-xs font-medium text-encre-800">{m.filiere || "Tronc commun"}</div>
                      {m.domaine && <div className="text-[11px] text-ardoise-500">{m.domaine}</div>}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        m.niveau?.startsWith("M") ? "bg-purple-100 text-purple-800" : "bg-emerald-100 text-emerald-800"
                      }`}>
                        {m.niveau || "Tous"}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-semibold text-encre-900">
                      {m.coefficient || 1.0}
                    </td>
                    <td className="py-3 px-3 text-center text-xs font-medium text-purple-700">
                      {m.credit !== null && m.credit !== undefined ? `${m.credit} ECTS` : "-"}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded capitalize ${
                        m.type_matiere === "fondamentale"
                          ? "bg-blue-100 text-blue-800"
                          : m.type_matiere === "transversale"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-teal-100 text-teal-800"
                      }`}>
                        {m.type_matiere || "fondamentale"}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right space-x-2">
                      <button
                        onClick={() => openEdit(m)}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => handleDelete(m.id)}
                        className="text-xs font-semibold text-red-600 hover:text-red-800"
                      >
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
                {!loading && matieres.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-sm text-ardoise-400">
                      Aucune matière ne correspond aux critères.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Modale Création / Modification */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-encre-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-encre-900 mb-4">
              {editId ? "Modifier la matière" : "Ajouter une matière au catalogue"}
            </h2>

            {error && (
              <div className="mb-4 rounded-lg bg-red-50 p-3 text-xs font-medium text-red-700 border border-red-200">
                {error}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              {/* Domaine */}
              <div>
                <label className="block text-xs font-semibold text-ardoise-700 mb-1">Domaine</label>
                <select
                  value={modalDomaine}
                  onChange={(e) => {
                    setModalDomaine(e.target.value);
                    setFiliereId("");
                  }}
                  className="w-full rounded-lg border border-ardoise-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">-- Choisir un domaine (optionnel) --</option>
                  {domainesOptions.map((d) => (
                    <option key={d.value} value={d.label}>
                      {d.icon} {d.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filière & Niveau (Cascade) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ardoise-700 mb-1">Filière</label>
                  <select
                    value={filiereId}
                    onChange={(e) => {
                      setFiliereId(e.target.value);
                      setNiveau("");
                    }}
                    className="w-full rounded-lg border border-ardoise-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="">-- Tronc commun / Toutes --</option>
                    {filieresModal.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.nom} ({f.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ardoise-700 mb-1">Niveau</label>
                  <select
                    value={niveau}
                    onChange={(e) => setNiveau(e.target.value)}
                    className="w-full rounded-lg border border-ardoise-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="">-- Tous les niveaux --</option>
                    {niveauxDisponiblesModal.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Code et Intitulé */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-ardoise-700 mb-1">
                    Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ex: GL-L1-ALGO"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full uppercase font-mono rounded-lg border border-ardoise-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-ardoise-700 mb-1">
                    Intitulé de la matière <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ex: Algorithmique"
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    className="w-full rounded-lg border border-ardoise-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Coefficient, Crédits et Type */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ardoise-700 mb-1">
                    Coefficient (Poids)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="10"
                    value={coefficient}
                    onChange={(e) => setCoefficient(e.target.value)}
                    className="w-full rounded-lg border border-ardoise-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ardoise-700 mb-1">
                    Crédits (ECTS)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    max="30"
                    placeholder="optionnel"
                    value={credit}
                    onChange={(e) => setCredit(e.target.value)}
                    className="w-full rounded-lg border border-ardoise-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ardoise-700 mb-1">
                    Type de matière
                  </label>
                  <select
                    value={typeMatiere}
                    onChange={(e) => setTypeMatiere(e.target.value)}
                    className="w-full rounded-lg border border-ardoise-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="fondamentale">Fondamentale</option>
                    <option value="transversale">Transversale</option>
                    <option value="optionnelle">Optionnelle</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-ardoise-700 mb-1">Description (optionnelle)</label>
                <textarea
                  rows={2}
                  placeholder="Objectifs pédagogiques, prérequis..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-lg border border-ardoise-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-ardoise-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-ardoise-600 hover:text-ardoise-800"
                >
                  Annuler
                </button>
                <Bouton type="submit" variante="primaire" disabled={submitting}>
                  {submitting ? "Enregistrement..." : "Enregistrer"}
                </Bouton>
              </div>
            </form>
          </div>
        </div>
      )}
    </CoqueApplication>
  );
}
