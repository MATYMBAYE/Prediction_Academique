import { useEffect, useState } from "react";
import CoqueApplication from "../../components/AppShell.jsx";
import { navigationAdmin } from "../../components/navigation.js";
import Card from "../../components/Card.jsx";
import Button from "../../components/Button.jsx";
import client from "../../api/client.js";
import { downloadFile } from "../../api/download.js";
import { NIVEAUX } from "../../academic.js";

export default function AdminReports() {
  const [filieres, setFilieres] = useState([]);
  const [classes, setClasses] = useState([]);
  const [filiereId, setFiliereId] = useState("");
  const [niveau, setNiveau] = useState("");
  const [classeId, setClasseId] = useState("");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    client.get("/admin/filieres").then(({ data }) => setFilieres(data));
    client.get("/admin/classes").then(({ data }) => setClasses(data));
  }, []);

  const run = async (key, fn) => {
    setError("");
    setBusy(key);
    try {
      await fn();
    } catch (err) {
      setError("Le telechargement a echoue. Verifiez votre session et reessayez.");
    } finally {
      setBusy("");
    }
  };

  const predictionsParams = () => ({
    filiere_id: filiereId || undefined,
    niveau: niveau || undefined,
  });

  return (
    <CoqueApplication
      titre="Rapports"
      sousTitre="Exports pour analyse externe ou archivage"
      sectionsNavigation={navigationAdmin()}
    >
      {error && <p className="mt-1 text-sm text-brique-alerte">{error}</p>}

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card title="Rapport de predictions">
          <p className="text-sm text-encre-nocturne/60">Par filiere, niveau ou l'ensemble de l'etablissement.</p>
          <div className="mt-3 space-y-2">
            <select
              value={filiereId}
              onChange={(e) => setFiliereId(e.target.value)}
              className="focus-ring w-full rounded-md border border-encre-nocturne/20 px-3 py-2 text-sm"
            >
              <option value="">Toutes les filieres</option>
              {filieres.map((f) => (
                <option key={f.id} value={f.id}>{f.nom}</option>
              ))}
            </select>
            <select
              value={niveau}
              onChange={(e) => setNiveau(e.target.value)}
              className="focus-ring w-full rounded-md border border-encre-nocturne/20 px-3 py-2 text-sm"
            >
              <option value="">Tous les niveaux</option>
              {NIVEAUX.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <div className="mt-4 flex gap-2">
            <Button
              variant="secondary"
              disabled={busy === "pred-csv"}
              onClick={() => run("pred-csv", () => downloadFile(`/admin/rapports/predictions.csv?${new URLSearchParams(predictionsParams())}`, "rapport_predictions.csv"))}
            >
              {busy === "pred-csv" ? "..." : "Exporter CSV"}
            </Button>
            <Button
              disabled={busy === "pred-pdf"}
              onClick={() => run("pred-pdf", () => downloadFile(`/admin/rapports/predictions.pdf?${new URLSearchParams(predictionsParams())}`, "rapport_predictions.pdf"))}
            >
              {busy === "pred-pdf" ? "..." : "Exporter PDF"}
            </Button>
          </div>
        </Card>

        <Card title="Rapport d'assiduite">
          <p className="text-sm text-encre-nocturne/60">Taux de presence par semestre, pour une classe donnee.</p>
          <div className="mt-3">
            <select
              value={classeId}
              onChange={(e) => setClasseId(e.target.value)}
              className="focus-ring w-full rounded-md border border-encre-nocturne/20 px-3 py-2 text-sm"
            >
              <option value="">Toutes les classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.nom}</option>
              ))}
            </select>
          </div>
          <div className="mt-4">
            <Button
              variant="secondary"
              disabled={busy === "assiduite-csv"}
              onClick={() => run("assiduite-csv", () => downloadFile(`/admin/rapports/assiduite.csv?${new URLSearchParams({ classe_id: classeId || undefined })}`, "rapport_assiduite.csv"))}
            >
              {busy === "assiduite-csv" ? "..." : "Exporter CSV"}
            </Button>
          </div>
        </Card>

        <Card title="Comptes desactives">
          <p className="text-sm text-encre-nocturne/60">Historique des desactivations sur une periode, avec motif.</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <input
              type="date"
              value={dateDebut}
              onChange={(e) => setDateDebut(e.target.value)}
              className="focus-ring rounded-md border border-encre-nocturne/20 px-3 py-2 text-sm"
            />
            <input
              type="date"
              value={dateFin}
              onChange={(e) => setDateFin(e.target.value)}
              className="focus-ring rounded-md border border-encre-nocturne/20 px-3 py-2 text-sm"
            />
          </div>
          <div className="mt-4">
            <Button
              variant="secondary"
              disabled={busy === "comptes-csv"}
              onClick={() =>
                run("comptes-csv", () =>
                  downloadFile(
                    `/admin/rapports/comptes-desactives.csv?${new URLSearchParams({ date_debut: dateDebut || undefined, date_fin: dateFin || undefined })}`,
                    "rapport_comptes_desactives.csv"
                  )
                )
              }
            >
              {busy === "comptes-csv" ? "..." : "Exporter CSV"}
            </Button>
          </div>
        </Card>
      </div>
    </CoqueApplication>
  );
}
