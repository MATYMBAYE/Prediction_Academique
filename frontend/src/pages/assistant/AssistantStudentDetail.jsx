import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import CoqueApplication from "../../components/AppShell.jsx";
import { navigationAssistante } from "../../components/navigation.js";
import Card from "../../components/Card.jsx";
import { RiskBadge, TreatmentStatusBadge } from "../../components/StatusBadge.jsx";
import client from "../../api/client.js";
import Icone from "../../components/ui/Icons.jsx";
import { Bouton } from "../../components/ui/Primitives.jsx";

export default function AssistantStudentDetail() {
  const { id } = useParams();
  const [student, setStudent] = useState(null);
  const [predictionDetail, setPredictionDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modale de saisie de note
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [gradeForm, setGradeForm] = useState({
    matiere: "",
    note: "",
    semestre: "S1",
    type_evaluation: "examen",
  });
  const [gradeSubmitting, setGradeSubmitting] = useState(false);
  const [gradeError, setGradeError] = useState("");
  const [gradeSuccess, setGradeSuccess] = useState("");

  const loadStudentData = () => {
    setLoading(true);
    Promise.all([
      client.get(`/assistant/students/${id}`),
      client.get(`/predictions/students/${id}/detail`).catch(() => ({ data: null })),
    ])
      .then(([sRes, pRes]) => {
        setStudent(sRes.data);
        setPredictionDetail(pRes.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadStudentData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleAddGrade = async (e) => {
    e.preventDefault();
    setGradeError("");
    setGradeSuccess("");
    setGradeSubmitting(true);
    try {
      await client.post(`/assistant/students/${id}/grades`, gradeForm);
      setGradeSuccess("Note enregistrée et prédiction actualisée !");
      setShowGradeModal(false);
      setGradeForm({ matiere: "", note: "", semestre: "S1", type_evaluation: "examen" });
      loadStudentData();
    } catch (err) {
      setGradeError(err.response?.data?.error || "Erreur lors de l'enregistrement de la note.");
    } finally {
      setGradeSubmitting(false);
    }
  };

  if (loading) {
    return (
      <CoqueApplication titre="Dossier Étudiant" sectionsNavigation={navigationAssistante()}>
        <div className="py-12 text-center text-ardoise-500">Chargement du dossier...</div>
      </CoqueApplication>
    );
  }

  if (!student) {
    return (
      <CoqueApplication titre="Dossier Étudiant" sectionsNavigation={navigationAssistante()}>
        <div className="py-12 text-center text-ardoise-500">Étudiant introuvable.</div>
      </CoqueApplication>
    );
  }

  const latestPred = student.predictions?.[0];

  return (
    <CoqueApplication
      titre={`${student.prenom} ${student.nom}`}
      sousTitre={`Matricule : ${student.matricule} • Classe : ${student.classe || "Non assignée"}`}
      sectionsNavigation={navigationAssistante()}
      actions={
        <div className="flex gap-2">
          <Link to="/assistante/etudiants">
            <Bouton variante="secondaire">← Retour à la liste</Bouton>
          </Link>
          <Bouton variante="primaire" onClick={() => setShowGradeModal(true)}>
            <Icone.Notes className="h-4 w-4" />
            Ajouter une note
          </Bouton>
        </div>
      }
    >
      {gradeSuccess && (
        <div className="mb-4 rounded-lg bg-emeraude-50 p-3 text-sm text-emeraude-800 border border-emeraude-200">
          {gradeSuccess}
        </div>
      )}

      {/* Résumé d'évaluation prédictive */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Fiche Diagnostic IA */}
          <Card title="Diagnostic prédictif et facteurs d'influence">
            {latestPred ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-ardoise-50 p-4 border border-ardoise-100">
                  <div>
                    <span className="text-xs text-ardoise-500 uppercase tracking-wider font-semibold">
                      Probabilité de réussite estimée
                    </span>
                    <p className="font-display text-3xl font-bold text-encre-900">
                      {(latestPred.probabilite_reussite * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-ardoise-500 uppercase tracking-wider font-semibold">
                      Niveau de risque
                    </span>
                    <div className="mt-1">
                      <RiskBadge risk={latestPred.niveau_risque} />
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-ardoise-500 uppercase tracking-wider font-semibold">
                      Moyenne générale
                    </span>
                    <p className="font-display text-lg font-semibold text-encre-800">
                      {latestPred.moyenne_generale !== null
                        ? `${latestPred.moyenne_generale.toFixed(1)}/20`
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-ardoise-500 uppercase tracking-wider font-semibold">
                      Assiduité
                    </span>
                    <p className="font-display text-lg font-semibold text-encre-800">
                      {latestPred.taux_assiduite_moyen !== null
                        ? `${latestPred.taux_assiduite_moyen.toFixed(0)}%`
                        : "-"}
                    </p>
                  </div>
                </div>

                {/* Explications & Facteurs si disponibles */}
                {predictionDetail?.explication && (
                  <div className="mt-4">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-ardoise-500 mb-2">
                      Analyse des facteurs d'influence (XAI)
                    </h4>
                    <p className="text-sm text-ardoise-700 bg-white p-3 rounded-lg border border-ardoise-200">
                      {predictionDetail.explication.synthese}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-ardoise-400">
                Pas encore de prédiction enregistrée pour cet étudiant.
              </p>
            )}
          </Card>

          {/* Relevé de notes */}
          <Card
            title="Notes et évaluations"
            action={
              <button
                onClick={() => setShowGradeModal(true)}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
              >
                + Ajouter une note
              </button>
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-ardoise-200 text-xs font-semibold uppercase tracking-wider text-ardoise-500">
                    <th className="py-2.5">Matière</th>
                    <th className="py-2.5">Semestre</th>
                    <th className="py-2.5">Type</th>
                    <th className="py-2.5">Note</th>
                    <th className="py-2.5">Date de saisie</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ardoise-100">
                  {student.notes?.map((n) => (
                    <tr key={n.id} className="hover:bg-ardoise-50/50">
                      <td className="py-2.5 font-medium text-encre-900">{n.matiere}</td>
                      <td className="py-2.5 text-ardoise-600 font-mono text-xs">{n.semestre}</td>
                      <td className="py-2.5 capitalize text-ardoise-600 text-xs">
                        {n.type_evaluation}
                      </td>
                      <td className="py-2.5 font-bold">
                        <span
                          className={
                            n.note < 10
                              ? "text-brique-600"
                              : n.note >= 14
                              ? "text-emeraude-600"
                              : "text-encre-800"
                          }
                        >
                          {n.note.toFixed(2)}/20
                        </span>
                      </td>
                      <td className="py-2.5 text-xs text-ardoise-400">
                        {n.date_saisie ? new Date(n.date_saisie).toLocaleDateString("fr-FR") : "-"}
                      </td>
                    </tr>
                  ))}
                  {(!student.notes || student.notes.length === 0) && (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-sm text-ardoise-400">
                        Aucune note enregistrée.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Colonne droite : Assiduité & Alertes */}
        <div className="space-y-6">
          <Card title="Assiduité par semestre">
            <div className="space-y-3">
              {student.assiduite?.map((a) => (
                <div key={a.semestre} className="text-xs">
                  <div className="flex justify-between font-medium text-encre-800 mb-1">
                    <span>Semestre {a.semestre}</span>
                    <span
                      className={
                        a.taux_presence < 60
                          ? "font-bold text-brique-600"
                          : a.taux_presence < 75
                          ? "text-ambre-600"
                          : "text-emeraude-600"
                      }
                    >
                      {a.taux_presence}% de présence
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-ardoise-100">
                    <div
                      style={{ width: `${a.taux_presence}%` }}
                      className={`h-full rounded-full ${
                        a.taux_presence < 60
                          ? "bg-brique-500"
                          : a.taux_presence < 75
                          ? "bg-ambre-500"
                          : "bg-emeraude-500"
                      }`}
                    />
                  </div>
                </div>
              ))}
              {(!student.assiduite || student.assiduite.length === 0) && (
                <p className="py-4 text-center text-xs text-ardoise-400">
                  Aucun appel de présence enregistré.
                </p>
              )}
            </div>
          </Card>

          <Card title="Alertes pédagogiques associées">
            <div className="space-y-3">
              {student.alertes?.map((a) => (
                <div
                  key={a.id}
                  className="rounded-lg border border-ardoise-100 bg-ardoise-50/50 p-3 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-encre-900">{a.libelle_type}</span>
                    <RiskBadge risk={a.niveau_risque} />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-2xs text-ardoise-400">
                    <span>
                      {a.date_declenchement
                        ? new Date(a.date_declenchement).toLocaleDateString("fr-FR")
                        : "-"}
                    </span>
                    <TreatmentStatusBadge status={a.statut_traitement} />
                  </div>
                </div>
              ))}
              {(!student.alertes || student.alertes.length === 0) && (
                <p className="py-4 text-center text-xs text-ardoise-400">Aucune alerte active.</p>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Modale de saisie de note */}
      {showGradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-encre-950/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-elevee">
            <h3 className="font-display text-lg font-bold text-encre-900">
              Ajouter une note — {student.prenom} {student.nom}
            </h3>
            <p className="mt-1 text-xs text-ardoise-500">
              La prédiction de réussite sera recalculée automatiquement après enregistrement.
            </p>

            {gradeError && (
              <div className="mt-4 rounded-lg bg-brique-50 p-3 text-xs text-brique-700 border border-brique-200">
                {gradeError}
              </div>
            )}

            <form onSubmit={handleAddGrade} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-encre-800 mb-1">Matière *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex : Algorithmique, Réseaux..."
                  value={gradeForm.matiere}
                  onChange={(e) => setGradeForm({ ...gradeForm, matiere: e.target.value })}
                  className="w-full rounded-lg border border-ardoise-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-encre-800 mb-1">
                    Note (/20) *
                  </label>
                  <input
                    type="number"
                    step="0.25"
                    min="0"
                    max="20"
                    required
                    placeholder="12.5"
                    value={gradeForm.note}
                    onChange={(e) => setGradeForm({ ...gradeForm, note: e.target.value })}
                    className="w-full rounded-lg border border-ardoise-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-encre-800 mb-1">
                    Semestre *
                  </label>
                  <select
                    value={gradeForm.semestre}
                    onChange={(e) => setGradeForm({ ...gradeForm, semestre: e.target.value })}
                    className="w-full rounded-lg border border-ardoise-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    {["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "S9", "S10"].map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-encre-800 mb-1">
                  Type d'évaluation
                </label>
                <select
                  value={gradeForm.type_evaluation}
                  onChange={(e) =>
                    setGradeForm({ ...gradeForm, type_evaluation: e.target.value })
                  }
                  className="w-full rounded-lg border border-ardoise-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="examen">Examen final</option>
                  <option value="devoir">Contrôle continu / Devoir</option>
                </select>
              </div>

              <div className="mt-6 flex justify-end gap-2 pt-2 border-t border-ardoise-100">
                <Bouton
                  type="button"
                  variante="secondaire"
                  onClick={() => setShowGradeModal(false)}
                >
                  Annuler
                </Bouton>
                <Bouton type="submit" variante="primaire" disabled={gradeSubmitting}>
                  {gradeSubmitting ? "Enregistrement..." : "Valider la note"}
                </Bouton>
              </div>
            </form>
          </div>
        </div>
      )}
    </CoqueApplication>
  );
}
