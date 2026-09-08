import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import CoqueApplication from "../../components/AppShell.jsx";
import { navigationEnseignant } from "../../components/navigation.js";
import SelecteurClasseMatiere from "../../components/teacher/SelecteurClasseMatiere.jsx";
import Card from "../../components/Card.jsx";
import Button from "../../components/Button.jsx";
import client from "../../api/client.js";
import { SEMESTRES_PAR_NIVEAU } from "../../academic.js";

export default function TeacherAttendance() {
  const [searchParams, setSearchParams] = useSearchParams();
  const classeId = searchParams.get("classe");
  const matiere = searchParams.get("matiere");
  const niveau = searchParams.get("niveau");
  const semestres = SEMESTRES_PAR_NIVEAU[niveau] || [];

  const [students, setStudents] = useState([]);
  const [semestre, setSemestre] = useState(semestres[0] || "");
  const [dateCours, setDateCours] = useState(new Date().toISOString().slice(0, 10));
  const [statuts, setStatuts] = useState({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [historique, setHistorique] = useState([]);

  // --- Correction d'un appel deja enregistre (absence contestee, etc.) ---
  const [sessionOuverte, setSessionOuverte] = useState(null);
  const [detailSession, setDetailSession] = useState(null);
  const [statutsEdition, setStatutsEdition] = useState({});
  const [motifEdition, setMotifEdition] = useState("");
  const [historiqueSession, setHistoriqueSession] = useState([]);
  const [chargementEdition, setChargementEdition] = useState(false);
  const [enregistrementEdition, setEnregistrementEdition] = useState(false);
  const [erreurEdition, setErreurEdition] = useState("");
  const [messageEdition, setMessageEdition] = useState("");

  useEffect(() => {
    if (!classeId) return;
    client.get(`/teacher/classes/${classeId}/students`, { params: { matiere } }).then(({ data }) => {
      setStudents(data);
      setStatuts(Object.fromEntries(data.map((s) => [s.id, "present"])));
    });
    client
      .get("/teacher/appel/historique", { params: { classe_id: classeId, matiere } })
      .then(({ data }) => setHistorique(data));
  }, [classeId, matiere]);

  const toggle = (studentId) => {
    setStatuts((s) => ({ ...s, [studentId]: s[studentId] === "present" ? "absent" : "present" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setSubmitting(true);
    try {
      const presences = students.map((s) => ({ student_id: s.id, statut: statuts[s.id] }));
      await client.post("/teacher/appel", { classe_id: Number(classeId), matiere, semestre, date_cours: dateCours, presences });
      setMessage("Appel enregistre avec succes.");
      const { data } = await client.get("/teacher/appel/historique", { params: { classe_id: classeId, matiere } });
      setHistorique(data);
    } catch (err) {
      setError(err.response?.data?.error || "Impossible d'enregistrer l'appel.");
    } finally {
      setSubmitting(false);
    }
  };

  const ouvrirSession = async (id) => {
    setSessionOuverte(id);
    setChargementEdition(true);
    setErreurEdition("");
    setMessageEdition("");
    try {
      const [detailRes, histRes] = await Promise.all([
        client.get(`/teacher/appel/${id}`),
        client.get(`/teacher/appel/${id}/historique`),
      ]);
      setDetailSession(detailRes.data);
      setStatutsEdition(Object.fromEntries(detailRes.data.presences.map((p) => [p.student_id, p.statut])));
      setHistoriqueSession(histRes.data);
      setMotifEdition("");
    } catch {
      setErreurEdition("Impossible de charger cet appel.");
    } finally {
      setChargementEdition(false);
    }
  };

  const fermerSession = () => {
    setSessionOuverte(null);
    setDetailSession(null);
    setHistoriqueSession([]);
    setMotifEdition("");
    setErreurEdition("");
    setMessageEdition("");
  };

  const toggleEdition = (studentId) => {
    setStatutsEdition((s) => ({ ...s, [studentId]: s[studentId] === "present" ? "absent" : "present" }));
  };

  const enregistrerCorrection = async (e) => {
    e.preventDefault();
    setErreurEdition("");
    setMessageEdition("");

    const presencesModifiees = detailSession.presences
      .filter((p) => statutsEdition[p.student_id] !== p.statut)
      .map((p) => ({ student_id: p.student_id, statut: statutsEdition[p.student_id] }));

    if (presencesModifiees.length === 0) {
      setErreurEdition("Aucune modification a enregistrer.");
      return;
    }
    if (!motifEdition.trim()) {
      setErreurEdition("Un motif est requis pour justifier la modification (ex. justificatif fourni par l'etudiant).");
      return;
    }

    setEnregistrementEdition(true);
    try {
      await client.put(`/teacher/appel/${sessionOuverte}`, {
        presences: presencesModifiees,
        motif: motifEdition.trim(),
      });
      setMessageEdition("Presence corrigee avec succes.");
      const [detailRes, histRes, listeRes] = await Promise.all([
        client.get(`/teacher/appel/${sessionOuverte}`),
        client.get(`/teacher/appel/${sessionOuverte}/historique`),
        client.get("/teacher/appel/historique", { params: { classe_id: classeId, matiere } }),
      ]);
      setDetailSession(detailRes.data);
      setStatutsEdition(Object.fromEntries(detailRes.data.presences.map((p) => [p.student_id, p.statut])));
      setHistoriqueSession(histRes.data);
      setHistorique(listeRes.data);
      setMotifEdition("");
    } catch (err) {
      setErreurEdition(err.response?.data?.error || "Impossible d'enregistrer la correction.");
    } finally {
      setEnregistrementEdition(false);
    }
  };

  if (!classeId || !matiere) {
    return (
      <CoqueApplication titre="Appel de presence" sectionsNavigation={navigationEnseignant()}>
        <SelecteurClasseMatiere
          titre="Faire l'appel"
          onSelectionner={(classe_id, matiereChoisie, niveauChoisi) =>
            setSearchParams({ classe: String(classe_id), matiere: matiereChoisie, niveau: niveauChoisi })
          }
        />
      </CoqueApplication>
    );
  }

  return (
    <CoqueApplication titre={`Appel — ${matiere}`} sectionsNavigation={navigationEnseignant()}>
      <Link to="/enseignant" className="text-sm text-indigo-trajectoire hover:underline">&larr; Mes classes</Link>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card title="Nouvelle session">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-encre-nocturne">Semestre</label>
                <select
                  value={semestre}
                  onChange={(e) => setSemestre(e.target.value)}
                  className="focus-ring w-full rounded-md border border-encre-nocturne/20 px-3 py-2 text-sm"
                >
                  {semestres.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-encre-nocturne">Date du cours</label>
                <input
                  type="date"
                  value={dateCours}
                  onChange={(e) => setDateCours(e.target.value)}
                  className="focus-ring w-full rounded-md border border-encre-nocturne/20 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto rounded-md border border-encre-nocturne/10">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b border-encre-nocturne/10 text-encre-nocturne/60">
                    <th className="px-3 py-2 font-medium">Etudiant</th>
                    <th className="px-3 py-2 font-medium">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-encre-nocturne/10">
                  {students.map((s) => (
                    <tr key={s.id}>
                      <td className="px-3 py-2">{s.prenom} {s.nom}</td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => toggle(s.id)}
                          className={`tap-target rounded-full px-3 py-1 text-xs font-medium ${
                            statuts[s.id] === "present"
                              ? "bg-sauge-reussite/10 text-sauge-reussite"
                              : "bg-brique-alerte/10 text-brique-alerte"
                          }`}
                        >
                          {statuts[s.id] === "present" ? "Present" : "Absent"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {error && <p className="text-sm text-brique-alerte">{error}</p>}
            {message && <p className="text-sm text-sauge-reussite">{message}</p>}
            <Button type="submit" disabled={submitting}>
              {submitting ? "Enregistrement..." : "Enregistrer l'appel"}
            </Button>
          </form>
        </Card>

        <Card title="Historique des appels">
          <p className="mb-2 text-xs text-encre-nocturne/50">
            Cliquez sur un appel pour corriger la presence d'un etudiant (ex. absence contestee).
          </p>
          <ul className="max-h-96 divide-y divide-encre-nocturne/10 overflow-y-auto text-sm">
            {historique.map((h) => (
              <li key={h.id}>
                <button
                  type="button"
                  onClick={() => ouvrirSession(h.id)}
                  className={`focus-ring flex w-full items-center justify-between rounded-md px-2 py-2 text-left transition-colors hover:bg-brume-academique ${
                    sessionOuverte === h.id ? "bg-brume-academique" : ""
                  }`}
                >
                  <span>{h.date_cours} ({h.semestre})</span>
                  <span className="tabular text-encre-nocturne/60">{h.presents}/{h.effectif} presents</span>
                </button>
              </li>
            ))}
            {historique.length === 0 && <li className="py-4 text-encre-nocturne/50">Aucun appel enregistre.</li>}
          </ul>
        </Card>
      </div>

      {sessionOuverte && (
        <Card className="mt-4" title="Corriger un appel" actions={<Button variant="secondary" onClick={fermerSession}>Fermer</Button>}>
          {chargementEdition ? (
            <p className="text-encre-nocturne/60">Chargement...</p>
          ) : detailSession ? (
            <div className="grid gap-6 lg:grid-cols-2">
              <form onSubmit={enregistrerCorrection} className="space-y-4">
                <p className="text-sm text-encre-nocturne/60">
                  {detailSession.session.date_cours} · {detailSession.session.semestre}
                </p>

                <div className="max-h-72 overflow-y-auto rounded-md border border-encre-nocturne/10">
                  <table className="w-full text-left text-sm">
                    <thead className="sticky top-0 bg-white">
                      <tr className="border-b border-encre-nocturne/10 text-encre-nocturne/60">
                        <th className="px-3 py-2 font-medium">Etudiant</th>
                        <th className="px-3 py-2 font-medium">Statut</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-encre-nocturne/10">
                      {detailSession.presences.map((p) => (
                        <tr key={p.student_id}>
                          <td className="px-3 py-2">{p.etudiant}</td>
                          <td className="px-3 py-2">
                            <button
                              type="button"
                              onClick={() => toggleEdition(p.student_id)}
                              className={`tap-target rounded-full px-3 py-1 text-xs font-medium ${
                                statutsEdition[p.student_id] === "present"
                                  ? "bg-sauge-reussite/10 text-sauge-reussite"
                                  : "bg-brique-alerte/10 text-brique-alerte"
                              } ${statutsEdition[p.student_id] !== p.statut ? "ring-2 ring-ambre-vigilance" : ""}`}
                            >
                              {statutsEdition[p.student_id] === "present" ? "Present" : "Absent"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-encre-nocturne">
                    Motif de la correction
                  </label>
                  <textarea
                    value={motifEdition}
                    onChange={(e) => setMotifEdition(e.target.value)}
                    rows={2}
                    placeholder="ex. Justificatif medical fourni par l'etudiant"
                    className="focus-ring w-full rounded-md border border-encre-nocturne/20 px-3 py-2 text-sm"
                  />
                </div>

                {erreurEdition && <p className="text-sm text-brique-alerte">{erreurEdition}</p>}
                {messageEdition && <p className="text-sm text-sauge-reussite">{messageEdition}</p>}
                <Button type="submit" disabled={enregistrementEdition}>
                  {enregistrementEdition ? "Enregistrement..." : "Enregistrer la correction"}
                </Button>
              </form>

              <div>
                <h3 className="mb-2 text-sm font-semibold text-encre-nocturne">Historique des corrections</h3>
                <ul className="max-h-80 space-y-2 overflow-y-auto text-sm">
                  {historiqueSession.map((h) => (
                    <li key={h.id} className="rounded-md border border-encre-nocturne/10 p-2">
                      <p className="font-medium">{h.etudiant}</p>
                      <p className="text-encre-nocturne/60">
                        {h.ancien_statut === "present" ? "Present" : "Absent"} &rarr;{" "}
                        {h.nouveau_statut === "present" ? "Present" : "Absent"}
                        {h.modifie_par && ` · par ${h.modifie_par}`}
                      </p>
                      {h.motif && <p className="mt-1 italic text-encre-nocturne/70">"{h.motif}"</p>}
                      <p className="mt-1 text-xs text-encre-nocturne/50">
                        {new Date(h.date_changement).toLocaleString("fr-FR")}
                      </p>
                    </li>
                  ))}
                  {historiqueSession.length === 0 && (
                    <li className="text-encre-nocturne/50">Aucune correction pour cet appel.</li>
                  )}
                </ul>
              </div>
            </div>
          ) : (
            <p className="text-brique-alerte">{erreurEdition || "Appel introuvable."}</p>
          )}
        </Card>
      )}
    </CoqueApplication>
  );
}
