import { useState, useEffect, useCallback } from "react";
import { useSearchParams, Link } from "react-router-dom";
import CoqueApplication from "../../components/AppShell.jsx";
import { navigationEnseignant } from "../../components/navigation.js";
import client from "../../api/client.js";
import Card from "../../components/Card.jsx";
import { Bouton, Carte, EtatVide, Badge } from "../../components/ui/Primitives.jsx";
import TableauDonnees, { CelluleIdentite } from "../../components/ui/DataTable.jsx";
import Icone from "../../components/ui/Icons.jsx";
import { useNotifications, Modale } from "../../components/ui/Feedback.jsx";
import GradeExcelImportModal from "../../components/grades/GradeExcelImportModal.jsx";
import { SEMESTRES_PAR_NIVEAU } from "../../academic.js";

export default function TeacherGrades() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlClasseId = searchParams.get("classe");
  const urlMatiere = searchParams.get("matiere");

  const [affectations, setAffectations] = useState([]);
  const [classeId, setClasseId] = useState(urlClasseId || "");
  const [matiere, setMatiere] = useState(urlMatiere || "");
  const [typeEvaluation, setTypeEvaluation] = useState("examen");
  const [semestre, setSemestre] = useState("S1");

  const [classeSelectionnee, setClasseSelectionnee] = useState(null);
  const [students, setStudents] = useState([]);
  const [notesEditees, setNotesEditees] = useState({});
  const [chargementStudents, setChargementStudents] = useState(false);
  const [sauvegardeEnCours, setSauvegardeEnCours] = useState(false);

  // Modales
  const [modaleImportOuverte, setModaleImportOuverte] = useState(false);
  const [modaleSuppression, setModaleSuppression] = useState({ ouverte: false, student: null, gradeId: null });

  const notifications = useNotifications();

  // 1. Charger les affectations de l'enseignant connecté
  const loadAffectations = async () => {
    try {
      const { data } = await client.get("/teacher/me/classes");
      const list = Array.isArray(data) ? data : [];
      setAffectations(list);

      if (list.length > 0) {
        const premier = list[0];
        if (!classeId) setClasseId(String(premier.classe_id));
        if (!matiere) setMatiere(premier.matiere);
      }
    } catch (err) {
      console.error(err);
      notifications.erreur("Impossible de charger vos affectations de cours.");
    }
  };

  useEffect(() => {
    loadAffectations();
  }, []);

  // 2. Mettre à jour les semestres selon la classe choisie
  useEffect(() => {
    if (classeId && affectations.length > 0) {
      const aff = affectations.find((a) => String(a.classe_id) === String(classeId) && a.matiere === matiere);
      if (aff) {
        setClasseSelectionnee({ id: aff.classe_id, nom: aff.classe, niveau: aff.niveau });
        const sems = SEMESTRES_PAR_NIVEAU[aff.niveau] || [];
        if (sems.length > 0 && !sems.includes(semestre)) {
          setSemestre(sems[0]);
        }
      }
    }
  }, [classeId, matiere, affectations]);

  // 3. Charger la liste des étudiants de la classe pour cette évaluation
  const loadClassStudents = useCallback(async () => {
    if (!classeId || !matiere) return;

    setChargementStudents(true);
    try {
      const { data } = await client.get("/grades/class-students", {
        params: {
          classe_id: classeId,
          matiere,
          type_evaluation: typeEvaluation,
          semestre,
        },
      });

      setClasseSelectionnee(data.classe);
      const studentList = data.students || [];
      setStudents(studentList);

      const initialNotes = {};
      studentList.forEach((s) => {
        initialNotes[s.id] = s.note != null ? String(s.note) : "";
      });
      setNotesEditees(initialNotes);
    } catch (err) {
      console.error(err);
      notifications.erreur(err.response?.data?.error || "Impossible de charger les étudiants.");
    } finally {
      setChargementStudents(false);
    }
  }, [classeId, matiere, typeEvaluation, semestre, notifications]);

  useEffect(() => {
    if (classeId && matiere) {
      loadClassStudents();
    }
  }, [classeId, matiere, typeEvaluation, semestre, loadClassStudents]);

  // 4. Enregistrement en lot des notes de la classe
  const handleBatchSave = async (e) => {
    if (e) e.preventDefault();
    setSauvegardeEnCours(true);

    const payloadNotes = Object.entries(notesEditees)
      .filter(([, noteVal]) => noteVal !== "" && noteVal != null)
      .map(([studentId, noteVal]) => ({
        student_id: Number(studentId),
        note: parseFloat(noteVal),
      }));

    if (payloadNotes.length === 0) {
      notifications.alerte("Veuillez saisir au moins une note.");
      setSauvegardeEnCours(false);
      return;
    }

    try {
      const { data } = await client.post("/grades/batch-save", {
        classe_id: Number(classeId),
        matiere,
        type_evaluation: typeEvaluation,
        semestre,
        notes: payloadNotes,
      });

      notifications.succes(data.message || "Notes enregistrées avec succès.");
      loadClassStudents();
    } catch (err) {
      notifications.erreur(err.response?.data?.error || "Erreur lors de l'enregistrement des notes.");
    } finally {
      setSauvegardeEnCours(false);
    }
  };

  // 5. Modification rapide d'une note
  const handleSaveSingleGrade = async (student) => {
    const noteVal = notesEditees[student.id];
    if (noteVal === "" || noteVal == null) {
      notifications.alerte("Veuillez entrer une note valide entre 0 et 20.");
      return;
    }

    const noteNum = parseFloat(noteVal);
    if (isNaN(noteNum) || noteNum < 0 || noteNum > 20) {
      notifications.erreur("La note doit être comprise entre 0 et 20.");
      return;
    }

    try {
      if (student.grade_id) {
        await client.put(`/grades/${student.grade_id}`, { note: noteNum });
        notifications.succes(`Note de ${student.prenom} ${student.nom} modifiée (${noteNum}/20).`);
      } else {
        await client.post("/grades/batch-save", {
          classe_id: Number(classeId),
          matiere,
          type_evaluation: typeEvaluation,
          semestre,
          notes: [{ student_id: student.id, note: noteNum }],
        });
        notifications.succes(`Note de ${student.prenom} ${student.nom} enregistrée (${noteNum}/20).`);
      }
      loadClassStudents();
    } catch (err) {
      notifications.erreur(err.response?.data?.error || "Erreur lors de la sauvegarde.");
    }
  };

  // 6. Suppression d'une note
  const handleConfirmDelete = async () => {
    if (!modaleSuppression.gradeId) return;

    try {
      await client.delete(`/grades/${modaleSuppression.gradeId}`);
      notifications.succes("Note supprimée avec succès.");
      setModaleSuppression({ ouverte: false, student: null, gradeId: null });
      loadClassStudents();
    } catch (err) {
      notifications.erreur(err.response?.data?.error || "Erreur lors de la suppression de la note.");
    }
  };

  // 7. Télécharger le modèle Excel pré-rempli pour la classe
  const handleDownloadClassTemplate = async () => {
    try {
      const response = await client.get("/grades/template-classe", {
        params: {
          classe_id: classeId,
          matiere,
          type_evaluation: typeEvaluation,
          semestre,
        },
        responseType: "blob",
      });
      const blob = new Blob([response.data], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `notes_${classeSelectionnee?.nom || "classe"}_${matiere}_${semestre}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error(err);
      notifications.erreur("Impossible de télécharger le modèle de la classe.");
    }
  };

  const semestresDisponibles = SEMESTRES_PAR_NIVEAU[classeSelectionnee?.niveau] || [
    "S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "S9", "S10"
  ];

  return (
    <CoqueApplication
      titre={`Saisie des notes — ${matiere || "Enseignement"}`}
      sousTitre="Sélection par classe, saisie directe et importation Excel pré-remplie"
      sectionsNavigation={navigationEnseignant()}
      actions={
        <div className="flex items-center gap-2">
          {classeId && (
            <Bouton
              variante="secondaire"
              taille="sm"
              icone={Icone.Telecharger}
              onClick={handleDownloadClassTemplate}
              className="text-xs"
            >
              Modèle Excel Classe
            </Bouton>
          )}
          <Bouton
            variante="primaire"
            taille="sm"
            icone={Icone.Notes}
            onClick={() => setModaleImportOuverte(true)}
            disabled={!classeId || !matiere}
          >
            Importer fichier Excel
          </Bouton>
        </div>
      }
    >
      <div className="space-y-5">
        {/* ================================================= ÉTAPE 1 : SÉLECTION HIÉRARCHIQUE */}
        <Carte
          titre="1. Contexte d'évaluation"
          sousTitre="Classe affectée → Matière → Type d'évaluation → Semestre"
          icone={Icone.Classes}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 pt-2">
            {/* Classe & Matière (Groupées selon les affectations de l'enseignant) */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-encre-900">
                1. Classe & Matière <span className="text-brique-500">*</span>
              </label>
              <select
                value={`${classeId}||${matiere}`}
                onChange={(e) => {
                  const [cId, mat] = e.target.value.split("||");
                  setClasseId(cId);
                  setMatiere(mat);
                  setSearchParams({ classe: cId, matiere: mat });
                }}
                className="w-full rounded-lg border border-ardoise-200 px-3 py-2 text-xs font-medium text-encre-900 focus:border-isi-bleu focus:outline-none"
              >
                <option value="">-- Sélectionner un enseignement --</option>
                {affectations.map((a, idx) => (
                  <option key={idx} value={`${a.classe_id}||${a.matiere}`}>
                    {a.classe} — {a.matiere}
                  </option>
                ))}
              </select>
            </div>

            {/* Type d'évaluation */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-encre-900">
                2. Type d'évaluation <span className="text-brique-500">*</span>
              </label>
              <select
                value={typeEvaluation}
                onChange={(e) => setTypeEvaluation(e.target.value)}
                className="w-full rounded-lg border border-ardoise-200 px-3 py-2 text-xs font-medium text-encre-900 focus:border-isi-bleu focus:outline-none"
              >
                <option value="examen">Examen</option>
                <option value="devoir">Devoir</option>
              </select>
            </div>

            {/* Semestre */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-encre-900">
                3. Semestre <span className="text-brique-500">*</span>
              </label>
              <select
                value={semestre}
                onChange={(e) => setSemestre(e.target.value)}
                className="w-full rounded-lg border border-ardoise-200 px-3 py-2 text-xs font-medium text-encre-900 focus:border-isi-bleu focus:outline-none"
              >
                {semestresDisponibles.map((s) => (
                  <option key={s} value={s}>
                    Semestre {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Raccourci vers mes classes */}
            <div className="flex items-end">
              <Link
                to="/enseignant"
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-ardoise-200 bg-ardoise-50 px-3 py-2 text-xs font-semibold text-ardoise-700 transition hover:bg-white hover:text-isi-bleu"
              >
                <Icone.ChevronGauche className="h-3.5 w-3.5" />
                <span>Mes classes affectées</span>
              </Link>
            </div>
          </div>
        </Carte>

        {/* ================================================= ÉTAPE 2 : GRILLE DES ÉTUDIANTS & SAISIE */}
        <div>
          <div className="mb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="font-display text-base font-semibold text-encre-900">
                2. Liste des étudiants {classeSelectionnee ? `— ${classeSelectionnee.nom}` : ""} ({students.length} inscrits)
              </h3>
              <p className="text-xs text-ardoise-500">
                Les matricules sont attribués par le système. Vous pouvez saisir, modifier ou supprimer chaque note directement.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Bouton
                variante="secondaire"
                taille="sm"
                icone={Icone.Actualiser}
                onClick={loadClassStudents}
              >
                Actualiser
              </Bouton>
              <Bouton
                variante="primaire"
                taille="sm"
                icone={Icone.Valide}
                onClick={handleBatchSave}
                chargement={sauvegardeEnCours}
                disabled={students.length === 0}
              >
                Enregistrer toutes les notes
              </Bouton>
            </div>
          </div>

          <TableauDonnees
            chargement={chargementStudents}
            lignes={students}
            cleLigne={(ligne) => ligne.id}
            placeholderRecherche="Rechercher par nom, prénom ou matricule..."
            parPageDefaut={25}
            titreVide="Aucun étudiant dans cette classe"
            messageVide="Sélectionnez une classe contenant des étudiants inscrits."
            colonnes={[
              {
                cle: "matricule",
                titre: "Matricule",
                triable: true,
                largeur: "130px",
                rendu: (ligne) => (
                  <span className="font-mono text-xs font-semibold text-encre-900 bg-ardoise-100 px-2 py-0.5 rounded border border-ardoise-200">
                    {ligne.matricule}
                  </span>
                ),
              },
              {
                cle: "nom",
                titre: "Étudiant",
                triable: true,
                valeurTri: (ligne) => `${ligne.nom} ${ligne.prenom}`,
                valeurRecherche: (ligne) => `${ligne.nom} ${ligne.prenom} ${ligne.matricule}`,
                rendu: (ligne) => (
                  <CelluleIdentite
                    principal={`${ligne.prenom} ${ligne.nom}`}
                    secondaire={classeSelectionnee?.nom || "Classe"}
                    initiales={`${ligne.prenom?.[0] || ""}${ligne.nom?.[0] || ""}`}
                  />
                ),
              },
              {
                cle: "note",
                titre: "Note saisie (/20)",
                largeur: "170px",
                rendu: (ligne) => {
                  const val = notesEditees[ligne.id] ?? "";
                  const hasChanged = ligne.note != null ? String(ligne.note) !== String(val) : val !== "";
                  return (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="20"
                        step="0.25"
                        placeholder="— / 20"
                        value={val}
                        onChange={(e) =>
                          setNotesEditees((prev) => ({ ...prev, [ligne.id]: e.target.value }))
                        }
                        className={`w-24 rounded-md border px-2.5 py-1 text-sm font-semibold text-encre-900 transition focus:border-isi-bleu focus:outline-none ${
                          hasChanged
                            ? "border-ambre-400 bg-ambre-50/50"
                            : val !== ""
                            ? "border-emeraude-300 bg-emeraude-50/30"
                            : "border-ardoise-200 bg-white"
                        }`}
                      />
                      {val !== "" && (
                        <span className="text-2xs font-semibold text-ardoise-500">/ 20</span>
                      )}
                    </div>
                  );
                },
              },
              {
                cle: "statut",
                titre: "Statut",
                largeur: "130px",
                rendu: (ligne) => {
                  const val = notesEditees[ligne.id];
                  if (ligne.grade_id) {
                    const hasChanged = String(ligne.note) !== String(val);
                    return hasChanged ? (
                      <Badge ton="alerte">Modifiée</Badge>
                    ) : (
                      <Badge ton="succes">Enregistrée</Badge>
                    );
                  }
                  return val !== "" && val != null ? (
                    <Badge ton="neutre">À enregistrer</Badge>
                  ) : (
                    <Badge ton="neutre">Non noté</Badge>
                  );
                },
              },
              {
                cle: "actions",
                titre: "Actions",
                alignement: "droite",
                largeur: "180px",
                rendu: (ligne) => (
                  <div className="flex items-center justify-end gap-1.5">
                    {/* Valider la note unitaire */}
                    <button
                      onClick={() => handleSaveSingleGrade(ligne)}
                      title="Enregistrer / Mettre à jour cette note"
                      className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold text-isi-bleu hover:bg-isi-bleu/10 transition"
                    >
                      <Icone.Valide className="h-3.5 w-3.5" />
                      <span>Valider</span>
                    </button>

                    {/* Supprimer la note si elle existe */}
                    {ligne.grade_id && (
                      <button
                        onClick={() =>
                          setModaleSuppression({
                            ouverte: true,
                            student: ligne,
                            gradeId: ligne.grade_id,
                          })
                        }
                        title="Supprimer cette note"
                        className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold text-brique-600 hover:bg-brique-50 transition"
                      >
                        <Icone.Supprimer className="h-3.5 w-3.5" />
                        <span>Supprimer</span>
                      </button>
                    )}
                  </div>
                ),
              },
            ]}
          />
        </div>
      </div>

      {/* Modale d'importation Excel */}
      <GradeExcelImportModal
        ouverte={modaleImportOuverte}
        onFermer={() => setModaleImportOuverte(false)}
        onSucces={(data) => {
          notifications.succes(data.message || "Importation réussie !");
          loadClassStudents();
        }}
        classeId={classeId}
        classeNom={classeSelectionnee?.nom}
        matiere={matiere}
        typeEvaluation={typeEvaluation}
        semestre={semestre}
      />

      {/* Modale de confirmation de suppression */}
      <Modale
        ouverte={modaleSuppression.ouverte}
        onFermer={() => setModaleSuppression({ ouverte: false, student: null, gradeId: null })}
        titre="Supprimer la note de l'étudiant"
        sousTitre={`${modaleSuppression.student?.prenom} ${modaleSuppression.student?.nom} (${modaleSuppression.student?.matricule})`}
        taille="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-ardoise-600">
            Êtes-vous sûr de vouloir supprimer la note de <strong>{matiere}</strong> ({typeEvaluation} - {semestre}) pour cet étudiant ?
            Cette action recalculera automatiquement ses probabilités de réussite académique.
          </p>
          <div className="flex justify-end gap-2 pt-2 border-t border-ardoise-200">
            <Bouton
              variante="secondaire"
              onClick={() => setModaleSuppression({ ouverte: false, student: null, gradeId: null })}
            >
              Annuler
            </Bouton>
            <Bouton
              variante="alerte"
              icone={Icone.Supprimer}
              onClick={handleConfirmDelete}
            >
              Confirmer la suppression
            </Bouton>
          </div>
        </div>
      </Modale>
    </CoqueApplication>
  );
}
