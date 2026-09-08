import { useEffect, useState } from "react";
import CoqueApplication from "../../components/AppShell.jsx";
import { navigationAssistante } from "../../components/navigation.js";
import Card from "../../components/Card.jsx";
import client from "../../api/client.js";
import { Bouton } from "../../components/ui/Primitives.jsx";

export default function AssistantClasses() {
  const [classes, setClasses] = useState([]);
  const [filieres, setFilieres] = useState([]);
  const [loading, setLoading] = useState(true);

  // Formulaire nouvelle classe
  const [showClassModal, setShowClassModal] = useState(false);
  const [filiereId, setFiliereId] = useState("");
  const [niveau, setNiveau] = useState("L1");
  const [modalError, setModalError] = useState("");
  const [modalSubmitting, setModalSubmitting] = useState(false);

  // Formulaire nouvelle filière
  const [showFiliereModal, setShowFiliereModal] = useState(false);
  const [filiereNom, setFiliereNom] = useState("");
  const [filiereCode, setFiliereCode] = useState("");
  const [filiereError, setFiliereError] = useState("");
  const [filiereSubmitting, setFiliereSubmitting] = useState(false);

  const loadData = () => {
    setLoading(true);
    Promise.all([client.get("/assistant/classes"), client.get("/assistant/filieres")]).then(
      ([cRes, fRes]) => {
        setClasses(cRes.data);
        setFilieres(fRes.data);
        if (fRes.data.length > 0 && !filiereId) {
          setFiliereId(fRes.data[0].id);
        }
        setLoading(false);
      }
    );
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateClasse = async (e) => {
    e.preventDefault();
    setModalError("");
    setModalSubmitting(true);
    try {
      await client.post("/assistant/classes", { filiere_id: filiereId, niveau });
      setShowClassModal(false);
      loadData();
    } catch (err) {
      setModalError(err.response?.data?.error || "Erreur lors de la création de la classe.");
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleCreateFiliere = async (e) => {
    e.preventDefault();
    setFiliereError("");
    setFiliereSubmitting(true);
    try {
      await client.post("/assistant/filieres", { nom: filiereNom, code: filiereCode });
      setShowFiliereModal(false);
      setFiliereNom("");
      setFiliereCode("");
      loadData();
    } catch (err) {
      setFiliereError(err.response?.data?.error || "Erreur lors de la création de la filière.");
    } finally {
      setFiliereSubmitting(false);
    }
  };

  return (
    <CoqueApplication
      titre="Classes et Filières"
      sousTitre="Structure académique et effectifs par cohorte"
      sectionsNavigation={navigationAssistante()}
      actions={
        <div className="flex gap-2">
          <Bouton variante="secondaire" onClick={() => setShowFiliereModal(true)}>
            + Nouvelle Filière
          </Bouton>
          <Bouton variante="primaire" onClick={() => setShowClassModal(true)}>
            + Nouvelle Classe
          </Bouton>
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Liste des classes (2 col) */}
        <div className="lg:col-span-2">
          <Card title="Classes ouvertes">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-ardoise-200 text-xs font-semibold uppercase tracking-wider text-ardoise-500">
                    <th className="py-2.5">Classe</th>
                    <th className="py-2.5">Niveau</th>
                    <th className="py-2.5">Filière</th>
                    <th className="py-2.5 text-right">Effectif</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ardoise-100">
                  {classes.map((c) => (
                    <tr key={c.id} className="hover:bg-ardoise-50/50">
                      <td className="py-3 font-semibold text-encre-900">{c.nom}</td>
                      <td className="py-3 text-ardoise-600 font-mono text-xs">{c.niveau}</td>
                      <td className="py-3 text-ardoise-600">{c.filiere}</td>
                      <td className="py-3 text-right font-bold text-indigo-600">
                        {c.effectif ?? 0} étudiant(s)
                      </td>
                    </tr>
                  ))}
                  {!loading && classes.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-ardoise-400">
                        Aucune classe enregistrée.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Liste des filières (1 col) */}
        <div>
          <Card
            title="Filières proposées"
            action={
              <button
                onClick={() => setShowFiliereModal(true)}
                className="text-xs text-indigo-600 hover:underline"
              >
                + Ajouter
              </button>
            }
          >
            <div className="space-y-3">
              {filieres.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center justify-between rounded-lg border border-ardoise-200 bg-ardoise-50/50 p-3"
                >
                  <div>
                    <p className="font-semibold text-sm text-encre-900">{f.nom}</p>
                    <p className="font-mono text-xs text-ardoise-500">{f.code}</p>
                  </div>
                </div>
              ))}
              {!loading && filieres.length === 0 && (
                <p className="py-4 text-center text-xs text-ardoise-400">
                  Aucune filière configurée.
                </p>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Modale création classe */}
      {showClassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-encre-950/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-elevee">
            <h3 className="font-display text-lg font-bold text-encre-900">Nouvelle Classe</h3>
            {modalError && (
              <div className="mt-3 rounded-lg bg-brique-50 p-3 text-xs text-brique-700 border border-brique-200">
                {modalError}
              </div>
            )}
            <form onSubmit={handleCreateClasse} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-encre-800 mb-1">Filière</label>
                <select
                  value={filiereId}
                  onChange={(e) => setFiliereId(e.target.value)}
                  className="w-full rounded-lg border border-ardoise-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {filieres.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nom} ({f.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-encre-800 mb-1">Niveau</label>
                <select
                  value={niveau}
                  onChange={(e) => setNiveau(e.target.value)}
                  className="w-full rounded-lg border border-ardoise-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {["L1", "L2", "L3", "M1", "M2"].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <Bouton
                  type="button"
                  variante="secondaire"
                  onClick={() => setShowClassModal(false)}
                >
                  Annuler
                </Bouton>
                <Bouton type="submit" variante="primaire" disabled={modalSubmitting}>
                  {modalSubmitting ? "Création..." : "Créer la classe"}
                </Bouton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modale création filière */}
      {showFiliereModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-encre-950/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-elevee">
            <h3 className="font-display text-lg font-bold text-encre-900">Nouvelle Filière</h3>
            {filiereError && (
              <div className="mt-3 rounded-lg bg-brique-50 p-3 text-xs text-brique-700 border border-brique-200">
                {filiereError}
              </div>
            )}
            <form onSubmit={handleCreateFiliere} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-encre-800 mb-1">
                  Nom de la filière *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex : Génie Logiciel"
                  value={filiereNom}
                  onChange={(e) => setFiliereNom(e.target.value)}
                  className="w-full rounded-lg border border-ardoise-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-encre-800 mb-1">
                  Code / Sigle *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex : GL, FC, RT..."
                  value={filiereCode}
                  onChange={(e) => setFiliereCode(e.target.value)}
                  className="w-full rounded-lg border border-ardoise-300 px-3 py-2 text-sm uppercase focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <Bouton
                  type="button"
                  variante="secondaire"
                  onClick={() => setShowFiliereModal(false)}
                >
                  Annuler
                </Bouton>
                <Bouton type="submit" variante="primaire" disabled={filiereSubmitting}>
                  {filiereSubmitting ? "Création..." : "Créer la filière"}
                </Bouton>
              </div>
            </form>
          </div>
        </div>
      )}
    </CoqueApplication>
  );
}
