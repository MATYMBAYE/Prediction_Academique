import { useEffect, useState } from "react";
import CoqueApplication from "../../components/AppShell.jsx";
import { navigationTechnicien } from "../../components/navigation.js";
import Card from "../../components/Card.jsx";
import Pagination from "../../components/Pagination.jsx";
import client from "../../api/client.js";
import { Bouton } from "../../components/ui/Primitives.jsx";

export default function TechnicienAssignments() {
  const [assignments, setAssignments] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total_pages: 1, total: 0 });
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [matieres, setMatieres] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtres
  const [classeFiltre, setClasseFiltre] = useState("");
  const [teacherFiltre, setTeacherFiltre] = useState("");
  const [matiereFiltre, setMatiereFiltre] = useState("");
  const [page, setPage] = useState(1);

  // Modale Ajout / Modification
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formClasseId, setFormClasseId] = useState("");
  const [formTeacherId, setFormTeacherId] = useState("");
  const [selectedMatiereChoice, setSelectedMatiereChoice] = useState("");
  const [customMatiere, setCustomMatiere] = useState("");
  const [modalError, setModalError] = useState("");
  const [modalSubmitting, setModalSubmitting] = useState(false);

  // Modale Suppression
  const [deleteId, setDeleteId] = useState(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      client.get("/technicien/classes"),
      client.get("/technicien/teachers"),
      client.get("/technicien/matieres"),
    ]).then(([cRes, tRes, mRes]) => {
      setClasses(cRes.data);
      setTeachers(tRes.data);
      setMatieres(mRes.data);
    });
  }, []);

  const fetchAssignments = (targetPage = 1) => {
    setLoading(true);
    client
      .get("/technicien/assignments", {
        params: {
          page: targetPage,
          per_page: 15,
          classe_id: classeFiltre || undefined,
          teacher_id: teacherFiltre || undefined,
          matiere: matiereFiltre || undefined,
        },
      })
      .then((res) => {
        setAssignments(res.data.items);
        setPagination({
          page: res.data.page,
          total_pages: res.data.total_pages,
          total: res.data.total,
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchAssignments(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, classeFiltre, teacherFiltre, matiereFiltre]);

  const openCreateModal = () => {
    setEditId(null);
    setFormClasseId(classes[0]?.id || "");
    setFormTeacherId(teachers[0]?.id || "");
    const firstMatiere = matieres[0]?.nom || "";
    setSelectedMatiereChoice(firstMatiere || "_autre_");
    setCustomMatiere("");
    setModalError("");
    setShowModal(true);
  };

  const openEditModal = (a) => {
    setEditId(a.id);
    setFormClasseId(a.classe_id);
    setFormTeacherId(a.teacher_id);
    const existsInList = matieres.some((m) => m.nom === a.matiere);
    if (existsInList) {
      setSelectedMatiereChoice(a.matiere);
      setCustomMatiere("");
    } else {
      setSelectedMatiereChoice("_autre_");
      setCustomMatiere(a.matiere);
    }
    setModalError("");
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setModalError("");

    const matiereFinale =
      selectedMatiereChoice === "_autre_" ? customMatiere.trim() : selectedMatiereChoice.trim();

    if (!matiereFinale) {
      setModalError("Veuillez choisir ou saisir le nom de la matière.");
      return;
    }

    setModalSubmitting(true);
    try {
      const payload = {
        classe_id: formClasseId,
        teacher_id: formTeacherId,
        matiere: matiereFinale,
      };

      if (editId) {
        await client.put(`/technicien/assignments/${editId}`, payload);
      } else {
        await client.post("/technicien/assignments", payload);
      }
      setShowModal(false);
      fetchAssignments(page);
    } catch (err) {
      setModalError(
        err.response?.data?.error || "Erreur lors de l'enregistrement de l'affectation."
      );
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleteSubmitting(true);
    try {
      await client.delete(`/technicien/assignments/${deleteId}`);
      setDeleteId(null);
      fetchAssignments(page);
    } catch (err) {
      console.error(err);
    } finally {
      setDeleteSubmitting(false);
    }
  };

  return (
    <CoqueApplication
      titre="Affectations des Enseignants"
      sousTitre="Attribution des cours, classes et gestion de l'unicité"
      sectionsNavigation={navigationTechnicien()}
      actions={
        <Bouton variante="primaire" onClick={openCreateModal}>
          + Nouvelle Affectation
        </Bouton>
      }
    >
      <Card>
        {/* Filtres */}
        <div className="grid gap-3 sm:grid-cols-3 border-b border-ardoise-100 pb-4">
          <div>
            <select
              value={classeFiltre}
              onChange={(e) => {
                setClasseFiltre(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-ardoise-300 px-3 py-2 text-sm text-encre-900 focus:border-indigo-500 focus:outline-none"
            >
              <option value="">Toutes les classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={teacherFiltre}
              onChange={(e) => {
                setTeacherFiltre(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-ardoise-300 px-3 py-2 text-sm text-encre-900 focus:border-indigo-500 focus:outline-none"
            >
              <option value="">Tous les enseignants</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.prenom} {t.nom}
                </option>
              ))}
            </select>
          </div>

          <div>
            <input
              type="text"
              placeholder="Filtrer par matière..."
              value={matiereFiltre}
              onChange={(e) => {
                setMatiereFiltre(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-ardoise-300 px-3 py-2 text-sm text-encre-900 focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Tableau */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-ardoise-200 text-xs font-semibold uppercase tracking-wider text-ardoise-500">
                <th className="py-3">Classe</th>
                <th className="py-3">Niveau</th>
                <th className="py-3">Matière</th>
                <th className="py-3">Enseignant responsable</th>
                <th className="py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ardoise-100">
              {assignments.map((a) => (
                <tr key={a.id} className="hover:bg-ardoise-50/50 transition-colors">
                  <td className="py-3 font-semibold text-encre-900">{a.classe}</td>
                  <td className="py-3 font-mono text-xs text-ardoise-600">{a.niveau}</td>
                  <td className="py-3 font-medium text-indigo-700">{a.matiere}</td>
                  <td className="py-3 text-ardoise-800">{a.enseignant}</td>
                  <td className="py-3 text-right space-x-2">
                    <button
                      onClick={() => openEditModal(a)}
                      className="rounded px-2 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50"
                    >
                      Modifier
                    </button>
                    <button
                      onClick={() => setDeleteId(a.id)}
                      className="rounded px-2 py-1 text-xs font-semibold text-brique-600 hover:bg-brique-50"
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && assignments.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-sm text-ardoise-400">
                    Aucune affectation trouvée avec ces critères.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {pagination.total_pages > 1 && (
          <div className="mt-4 border-t border-ardoise-100 pt-3">
            <Pagination
              page={pagination.page}
              totalPages={pagination.total_pages}
              onPageChange={(p) => setPage(p)}
            />
          </div>
        )}
      </Card>

      {/* Modale Ajout / Modification */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-encre-950/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-elevee">
            <h3 className="font-display text-lg font-bold text-encre-900">
              {editId ? "Modifier l'affectation" : "Nouvelle Affectation"}
            </h3>
            <p className="mt-1 text-xs text-ardoise-500">
              Chaque matière dans une classe ne peut avoir qu'un seul enseignant titulaire.
            </p>

            {modalError && (
              <div className="mt-3 rounded-lg bg-brique-50 p-3 text-xs text-brique-700 border border-brique-200 font-medium">
                {modalError}
              </div>
            )}

            <form onSubmit={handleSave} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-encre-800 mb-1">Classe *</label>
                <select
                  value={formClasseId}
                  onChange={(e) => setFormClasseId(e.target.value)}
                  required
                  className="w-full rounded-lg border border-ardoise-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nom} ({c.filiere})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-encre-800 mb-1">
                  Enseignant *
                </label>
                <select
                  value={formTeacherId}
                  onChange={(e) => setFormTeacherId(e.target.value)}
                  required
                  className="w-full rounded-lg border border-ardoise-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                >
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.prenom} {t.nom}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-encre-800 mb-1">Matière *</label>
                <div className="space-y-2">
                  <select
                    value={selectedMatiereChoice}
                    onChange={(e) => setSelectedMatiereChoice(e.target.value)}
                    className="w-full rounded-lg border border-ardoise-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                  >
                    {(() => {
                      const selectedClasse = classes.find((c) => String(c.id) === String(formClasseId));
                      const matieresFiltrees = selectedClasse
                        ? matieres.filter(
                            (m) =>
                              (!m.filiere_id || m.filiere_id === selectedClasse.filiere_id) &&
                              (!m.niveau || m.niveau === selectedClasse.niveau)
                          )
                        : matieres;

                      const listeAffichee = matieresFiltrees.length > 0 ? matieresFiltrees : matieres;

                      return (
                        <>
                          <option value="">-- Choisir une matière --</option>
                          {listeAffichee.map((m) => (
                            <option key={m.id} value={m.nom}>
                              {m.nom} ({m.code}) {m.coefficient ? `[Coeff ${m.coefficient}]` : ""}
                            </option>
                          ))}
                          <option value="_autre_">Autre / Saisie manuelle...</option>
                        </>
                      );
                    })()}
                  </select>

                  {selectedMatiereChoice === "_autre_" && (
                    <input
                      type="text"
                      required
                      placeholder="Saisissez le nom de la nouvelle matière..."
                      value={customMatiere}
                      onChange={(e) => setCustomMatiere(e.target.value)}
                      autoFocus
                      className="w-full rounded-lg border border-indigo-400 bg-indigo-50/20 px-3 py-2 text-sm text-encre-900 placeholder:text-ardoise-400 focus:border-indigo-600 focus:bg-white focus:outline-none"
                    />
                  )}
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2 border-t border-ardoise-100 pt-3">
                <Bouton
                  type="button"
                  variante="secondaire"
                  onClick={() => setShowModal(false)}
                >
                  Annuler
                </Bouton>
                <Bouton type="submit" variante="primaire" disabled={modalSubmitting}>
                  {modalSubmitting ? "Enregistrement..." : "Valider l'affectation"}
                </Bouton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modale confirmation suppression */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-encre-950/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-elevee">
            <h3 className="font-display text-base font-bold text-encre-900">
              Confirmer la suppression
            </h3>
            <p className="mt-2 text-sm text-ardoise-600">
              Êtes-vous certain de vouloir supprimer cette affectation ? L'enseignant ne sera plus
              assigné à cette matière pour cette classe.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Bouton variante="secondaire" onClick={() => setDeleteId(null)}>
                Annuler
              </Bouton>
              <Bouton
                variante="danger"
                onClick={handleDelete}
                disabled={deleteSubmitting}
              >
                {deleteSubmitting ? "Suppression..." : "Supprimer"}
              </Bouton>
            </div>
          </div>
        </div>
      )}
    </CoqueApplication>
  );
}
