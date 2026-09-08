import { useState, useEffect, useCallback, useMemo } from "react";
import CoqueApplication from "../../components/AppShell.jsx";
import { navigationAdmin, navigationAssistante } from "../../components/navigation.js";
import client from "../../api/client.js";
import { Bouton, Carte, EtatVide, Badge } from "../../components/ui/Primitives.jsx";
import TableauDonnees, { CelluleIdentite } from "../../components/ui/DataTable.jsx";
import Icone from "../../components/ui/Icons.jsx";
import { useNotifications, Modale } from "../../components/ui/Feedback.jsx";
import GradeExcelImportModal from "../../components/grades/GradeExcelImportModal.jsx";
import { SEMESTRES_PAR_NIVEAU } from "../../academic.js";

export default function GradesManagementPage({ role = "admin" }) {
  const [classes, setClasses] = useState([]);
  const [matieres, setMatieres] = useState([]);
  const [annees, setAnnees] = useState([]);
  const [loadingInit, setLoadingInit] = useState(true);

  // Contexte de sélection hiérarchique
  const [classeId, setClasseId] = useState("");
  const [matiere, setMatiere] = useState("");
  const [typeEvaluation, setTypeEvaluation] = useState("examen"); // "examen" ou "devoir"
  const [semestre, setSemestre] = useState("S1");
  const [anneeAcademique, setAnneeAcademique] = useState("");

  // Données de la classe sélectionnée
  const [classeSelectionnee, setClasseSelectionnee] = useState(null);
  const [students, setStudents] = useState([]);
  const [notesEditees, setNotesEditees] = useState({});
  const [chargementStudents, setChargementStudents] = useState(false);
  const [sauvegardeEnCours, setSauvegardeEnCours] = useState(false);

  // Modales
  const [modaleImportOuverte, setModaleImportOuverte] = useState(false);
  const [modaleSuppression, setModaleSuppression] = useState({ ouverte: false, student: null, gradeId: null });

  const notifications = useNotifications();

  // 1. Charger les référentiels (classes, matières, années académiques)
  const loadReferentiels = async () => {
    setLoadingInit(true);
    try {
      // Endpoint classes adapté au rôle
      const endpointClasses = role === "assistante_pedagogique" ? "/assistant/classes" : "/admin/classes";
      const [resClasses, resMatieres, resAnnees] = await Promise.allSettled([
        client.get(endpointClasses),
        client.get("/technicien/matieres"),
        client.get("/assistant/academic-years"),
      ]);

      let classesList = [];
      if (resClasses.status === "fulfilled") {
        classesList = resClasses.value.data?.items || resClasses.value.data || [];
        setClasses(classesList);
      }

      if (resMatieres.status === "fulfilled") {
        const items = resMatieres.value.data?.items || resMatieres.value.data || [];
        setMatieres(items);
      }

      if (resAnnees.status === "fulfilled") {
        const items = resAnnees.value.data || [];
        setAnnees(items);
        const active = items.find((a) => a.statut === "active");
        if (active) setAnneeAcademique(active.libelle);
      }

      // Présélection de la 1ère classe
      if (classesList.length > 0 && !classeId) {
        setClasseId(String(classesList[0].id));
      }
    } catch (e) {
      console.error("Erreur chargement référentiels", e);
      notifications.erreur("Impossible de charger les référentiels académiques.");
    } finally {
      setLoadingInit(false);
    }
  };

  useEffect(() => {
    loadReferentiels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  // 2. Synchronisation de la classe sélectionnée
  useEffect(() => {
    if (classeId && classes.length > 0) {
      const cl = classes.find((c) => String(c.id) === String(classeId));
      if (cl) {
        setClasseSelectionnee(cl);
        const sems = SEMESTRES_PAR_NIVEAU[cl.niveau] || [];
        if (sems.length > 0 && !sems.includes(semestre)) {
          setSemestre(sems[0]);
        }
      }
    } else {
      setClasseSelectionnee(null);
    }
  }, [classeId, classes, semestre]);

  // 3. ⚠️ FILTRAGE STRICT DES MATIÈRES : Uniquement les matières de la filière et du niveau de la classe choisie
  const matieresFiltrees = useMemo(() => {
    if (!classeSelectionnee) return [];
    return matieres.filter(
      (m) =>
        (!m.filiere_id || m.filiere_id === classeSelectionnee.filiere_id) &&
        (!m.niveau || m.niveau === classeSelectionnee.niveau)
    );
  }, [classeSelectionnee, matieres]);

  // 4. Auto-sélection de la matière correspondante
  useEffect(() => {
    if (matieresFiltrees.length > 0) {
      if (!matiere || !matieresFiltrees.some((m) => m.nom === matiere)) {
        setMatiere(matieresFiltrees[0].nom);
      }
    } else {
      setMatiere("");
    }
  }, [matieresFiltrees, matiere]);

  // 5. Charger les étudiants et leurs notes pour la classe & matière sélectionnées
  const loadClassStudents = useCallback(async () => {
    if (!classeId || !matiere) {
      setStudents([]);
      setNotesEditees({});
      return;
    }

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

      // Pré-remplir l'état local des notes
      const initialNotes = {};
      studentList.forEach((s) => {
        initialNotes[s.id] = s.note != null ? String(s.note) : "";
      });
      setNotesEditees(initialNotes);
    } catch (err) {
      console.error(err);
      notifications.erreur(err.response?.data?.error || "Impossible de charger les étudiants de la classe.");
    } finally {
      setChargementStudents(false);
    }
  }, [classeId, matiere, typeEvaluation, semestre, notifications]);

  useEffect(() => {
    if (classeId && matiere) {
      loadClassStudents();
    }
  }, [classeId, matiere, typeEvaluation, semestre, loadClassStudents]);

  // 6. Enregistrement en lot des notes de la classe
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

  // 7. Modification rapide d'une seule note
  const handleSaveSingleGrade = async (student) => {
    const noteVal = notesEditees[student.id];
    if (noteVal === "" || noteVal == null) {
      notifications.alerte("Veuillez entrer une note valide entre 0 et 20.");
      return;
    }

    const noteNum = parseFloat(noteVal);
    if (isNaN(noteNum) || noteNum < 0 || noteNum > 20) {
      notifications.erreur("La note doit être un nombre compris entre 0 et 20.");
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

  // 8. Suppression d'une note
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

  // 9. Télécharger le modèle Excel de la classe
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
      a.download = `modele_notes_${classeSelectionnee?.nom || "classe"}_${matiere}_${semestre}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error(err);
      notifications.erreur("Impossible de télécharger le modèle de la classe.");
    }
  };

  const navSections = role === "assistante_pedagogique" ? navigationAssistante() : navigationAdmin();
  const semestresDisponibles = SEMESTRES_PAR_NIVEAU[classeSelectionnee?.niveau] || [
    "S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "S9", "S10"
  ];

  // Matière actuellement sélectionnée avec ses métadonnées
  const matiereInfo = matieresFiltrees.find((m) => m.nom === matiere);

  return (
    <CoqueApplication
      titre="Saisie & Gestion des Notes"
      sousTitre="Sélection hiérarchique par classe, filtrage dynamique et saisie directe"
      sectionsNavigation={navSections}
      actions={
        <div className="flex items-center gap-2">
          {classeId && matiere && (
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
        {/* ================================================= ÉTAPE 1 : CONTEXTE D'ÉVALUATION */}
        <Carte
          titre="Contexte académique d'évaluation"
          sousTitre="Sélection de la classe et filtrage automatique de la matière"
          icone={Icone.Classes}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 pt-2">
            {/* 1. Classe */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-encre-900">
                1. Classe <span className="text-red-500">*</span>
              </label>
              <select
                value={classeId}
                onChange={(e) => setClasseId(e.target.value)}
                className="w-full rounded-lg border border-ardoise-300 bg-white px-3 py-2 text-xs font-medium text-encre-900 focus:border-indigo-500 focus:outline-none"
              >
                <option value="">-- Sélectionner une classe --</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nom} {c.filiere ? `(${c.filiere})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Matière (FILTRÉE AUTOMATIQUEMENT) */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-encre-900">
                2. Matière ({matieresFiltrees.length} disponible{matieresFiltrees.length > 1 ? "s" : ""}) <span className="text-red-500">*</span>
              </label>
              <select
                value={matiere}
                onChange={(e) => setMatiere(e.target.value)}
                disabled={!classeId || matieresFiltrees.length === 0}
                className="w-full rounded-lg border border-ardoise-300 bg-white px-3 py-2 text-xs font-medium text-encre-900 focus:border-indigo-500 focus:outline-none disabled:bg-ardoise-100 disabled:cursor-not-allowed"
              >
                {matieresFiltrees.length === 0 ? (
                  <option value="">Aucune matière pour cette classe</option>
                ) : (
                  matieresFiltrees.map((m) => (
                    <option key={m.id || m.code || m.nom} value={m.nom}>
                      {m.nom} {m.coefficient ? `[Coeff ${m.coefficient}]` : ""} {m.type_matiere ? `(${m.type_matiere})` : ""}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* 3. Type d'évaluation (EXAMEN ou DEVOIR) */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-encre-900">
                3. Évaluation <span className="text-red-500">*</span>
              </label>
              <select
                value={typeEvaluation}
                onChange={(e) => setTypeEvaluation(e.target.value)}
                className="w-full rounded-lg border border-ardoise-300 bg-white px-3 py-2 text-xs font-medium text-encre-900 focus:border-indigo-500 focus:outline-none"
              >
                <option value="examen">Examen</option>
                <option value="devoir">Devoir</option>
              </select>
            </div>

            {/* 4. Semestre */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-encre-900">
                4. Semestre <span className="text-red-500">*</span>
              </label>
              <select
                value={semestre}
                onChange={(e) => setSemestre(e.target.value)}
                className="w-full rounded-lg border border-ardoise-300 bg-white px-3 py-2 text-xs font-medium text-encre-900 focus:border-indigo-500 focus:outline-none"
              >
                {semestresDisponibles.map((s) => (
                  <option key={s} value={s}>
                    Semestre {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Bandeau d'information contextuel */}
          {classeSelectionnee && matiere && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-indigo-50/70 p-3 border border-indigo-100 text-xs text-indigo-950">
              <div className="flex items-center gap-3">
                <span className="font-semibold">Classe active :</span>
                <span className="font-bold text-indigo-700">{classeSelectionnee.nom}</span>
                <span className="text-ardoise-400">|</span>
                <span className="font-semibold">Matière :</span>
                <span className="font-bold text-indigo-700">{matiere}</span>
                {matiereInfo?.coefficient && (
                  <span className="px-2 py-0.5 rounded bg-white text-indigo-800 font-semibold border border-indigo-200">
                    Coeff : {matiereInfo.coefficient}
                  </span>
                )}
                {matiereInfo?.credit && (
                  <span className="px-2 py-0.5 rounded bg-white text-purple-800 font-semibold border border-purple-200">
                    Crédits ECTS : {matiereInfo.credit}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge variante="info">{typeEvaluation === "examen" ? "Examen" : "Devoir"}</Badge>
                <Badge variante="neutre">Semestre {semestre}</Badge>
              </div>
            </div>
          )}
        </Carte>

        {/* ================================================= ÉTAPE 2 : GRILLE DE SAISIE */}
        <Carte
          titre={`Grille des notes — ${classeSelectionnee ? classeSelectionnee.nom : "Sélectionnez une classe"}`}
          sousTitre={
            matiere
              ? `Matière : ${matiere} (${typeEvaluation === "examen" ? "Examen" : "Devoir"} • Semestre ${semestre})`
              : "Choisissez une classe et une matière pour saisir les notes"
          }
          icone={Icone.Notes}
          actions={
            students.length > 0 && (
              <Bouton
                variante="primaire"
                taille="sm"
                icone={Icone.Check}
                onClick={handleBatchSave}
                disabled={sauvegardeEnCours || chargementStudents}
              >
                {sauvegardeEnCours ? "Enregistrement..." : "Enregistrer toutes les notes"}
              </Bouton>
            )
          }
        >
          {chargementStudents ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
              <p className="mt-3 text-xs font-medium text-ardoise-500">Chargement des étudiants...</p>
            </div>
          ) : !classeId ? (
            <EtatVide
              icone={Icone.Classes}
              titre="Aucune classe sélectionnée"
              description="Veuillez sélectionner une classe dans le menu ci-dessus pour charger les étudiants."
            />
          ) : !matiere ? (
            <EtatVide
              icone={Icone.Notes}
              titre="Aucune matière sélectionnée"
              description="Sélectionnez une matière correspondant à la classe pour démarrer la saisie."
            />
          ) : students.length === 0 ? (
            <EtatVide
              icone={Icone.Etudiants}
              titre="Aucun étudiant dans cette classe"
              description="La classe sélectionnée ne contient actuellement aucun étudiant inscrit."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-ardoise-200 text-xs font-semibold uppercase tracking-wider text-ardoise-500">
                    <th className="py-3 px-3">Matricule</th>
                    <th className="py-3 px-3">Étudiant</th>
                    <th className="py-3 px-3 w-40 text-center">Note (/20)</th>
                    <th className="py-3 px-3 text-center">Statut</th>
                    <th className="py-3 px-3 text-right">Action rapide</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ardoise-100">
                  {students.map((student) => {
                    const noteVal = notesEditees[student.id] ?? "";
                    const noteNum = parseFloat(noteVal);
                    const isValide = !isNaN(noteNum) && noteNum >= 0 && noteNum <= 20;
                    const aChange = student.note != null ? noteVal !== String(student.note) : noteVal !== "";

                    return (
                      <tr key={student.id} className="hover:bg-ardoise-50/50 transition-colors">
                        <td className="py-3 px-3 font-mono text-xs font-bold text-indigo-700">
                          {student.matricule}
                        </td>
                        <td className="py-3 px-3 font-semibold text-encre-900">
                          {student.prenom} {student.nom}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center justify-center gap-1.5">
                            <input
                              type="number"
                              min="0"
                              max="20"
                              step="0.25"
                              placeholder="-- / 20"
                              value={noteVal}
                              onChange={(e) =>
                                setNotesEditees({ ...notesEditees, [student.id]: e.target.value })
                              }
                              className={`w-28 text-center rounded-lg border px-2 py-1.5 text-sm font-semibold focus:outline-none ${
                                noteVal === ""
                                  ? "border-ardoise-300 bg-white"
                                  : isValide
                                  ? noteNum >= 10
                                    ? "border-emerald-400 bg-emerald-50/40 text-emerald-900 focus:border-emerald-600"
                                    : "border-amber-400 bg-amber-50/40 text-amber-900 focus:border-amber-600"
                                  : "border-red-400 bg-red-50 text-red-900 focus:border-red-600"
                              }`}
                            />
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          {student.grade_id ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                              Enregistrée ({student.note}/20)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-ardoise-500 bg-ardoise-100 px-2 py-0.5 rounded-full">
                              Non saisie
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right space-x-2">
                          <button
                            type="button"
                            onClick={() => handleSaveSingleGrade(student)}
                            disabled={!aChange && student.grade_id != null}
                            className={`text-xs font-semibold px-2.5 py-1 rounded transition-colors ${
                              aChange
                                ? "bg-indigo-600 text-white hover:bg-indigo-700"
                                : "text-ardoise-400 hover:text-indigo-600"
                            }`}
                          >
                            Sauvegarder
                          </button>
                          {student.grade_id && (
                            <button
                              type="button"
                              onClick={() =>
                                setModaleSuppression({
                                  ouverte: true,
                                  student,
                                  gradeId: student.grade_id,
                                })
                              }
                              className="text-xs font-semibold text-red-600 hover:text-red-800 px-2 py-1"
                            >
                              Supprimer
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Barre d'action finale */}
              <div className="mt-4 flex items-center justify-between border-t border-ardoise-100 pt-4">
                <span className="text-xs text-ardoise-500">
                  {students.filter((s) => notesEditees[s.id] !== "" && notesEditees[s.id] != null).length} note(s) saisie(s) sur {students.length} étudiant(s).
                </span>
                <Bouton
                  variante="primaire"
                  icone={Icone.Check}
                  onClick={handleBatchSave}
                  disabled={sauvegardeEnCours || chargementStudents}
                >
                  {sauvegardeEnCours ? "Enregistrement en cours..." : "Enregistrer toutes les notes"}
                </Bouton>
              </div>
            </div>
          )}
        </Carte>
      </div>

      {/* ================================================= MODALE IMPORT EXCEL */}
      {modaleImportOuverte && (
        <GradeExcelImportModal
          ouverte={modaleImportOuverte}
          onFermer={() => setModaleImportOuverte(false)}
          onSucces={() => {
            setModaleImportOuverte(false);
            loadClassStudents();
            notifications.succes("Importation des notes réalisée avec succès.");
          }}
          classeId={classeId}
          classeNom={classeSelectionnee?.nom || ""}
          matiere={matiere}
          typeEvaluation={typeEvaluation}
          semestre={semestre}
          anneeAcademique={anneeAcademique}
        />
      )}

      {/* ================================================= MODALE CONFIRMATION SUPPRESSION */}
      {modaleSuppression.ouverte && (
        <Modale
          ouverte={modaleSuppression.ouverte}
          titre="Confirmer la suppression"
          onFermer={() => setModaleSuppression({ ouverte: false, student: null, gradeId: null })}
        >
          <div className="space-y-4">
            <p className="text-sm text-ardoise-600">
              Êtes-vous certain de vouloir supprimer la note de{" "}
              <strong className="text-encre-900">
                {modaleSuppression.student?.prenom} {modaleSuppression.student?.nom}
              </strong>{" "}
              pour l'évaluation de <strong>{matiere}</strong> ({typeEvaluation}) ?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Bouton
                variante="secondaire"
                onClick={() => setModaleSuppression({ ouverte: false, student: null, gradeId: null })}
              >
                Annuler
              </Bouton>
              <Bouton variante="danger" onClick={handleConfirmDelete}>
                Supprimer la note
              </Bouton>
            </div>
          </div>
        </Modale>
      )}
    </CoqueApplication>
  );
}
