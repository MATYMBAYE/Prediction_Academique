import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import CoqueApplication from "../../components/AppShell.jsx";
import { navigationTechnicien } from "../../components/navigation.js";
import Card from "../../components/Card.jsx";
import client from "../../api/client.js";
import Icone from "../../components/ui/Icons.jsx";
import { Bouton } from "../../components/ui/Primitives.jsx";

export default function TechnicienAudit() {
  const [audit, setAudit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState(null);
  const [filtreClasse, setFiltreClasse] = useState("");
  const [filtreEnseignant, setFiltreEnseignant] = useState("");

  const runAudit = () => {
    setLoading(true);
    setErreur(null);
    client
      .get("/technicien/assignments/audit")
      .then((res) => {
        setAudit(res.data);
        setLoading(false);
      })
      .catch((err) => {
        setErreur(
          err?.response?.data?.error ||
            "Erreur lors de la récupération des données d'audit. Vérifiez la connexion au serveur."
        );
        setLoading(false);
      });
  };

  useEffect(() => {
    runAudit();
  }, []);

  const integrite = Boolean(audit?.integrite_parfaite);
  const doublons = audit?.doublons_detectes || [];
  const classes = (audit?.classes_audit || []).filter((c) =>
    filtreClasse ? c.nom.toLowerCase().includes(filtreClasse.toLowerCase()) : true
  );
  const enseignants = (audit?.teachers_audit || []).filter((t) =>
    filtreEnseignant
      ? `${t.prenom} ${t.nom}`.toLowerCase().includes(filtreEnseignant.toLowerCase())
      : true
  );

  return (
    <CoqueApplication
      titre="Vérification & Audit des Affectations"
      sousTitre="Contrôle d'intégrité, complétude et détection des doublons pédagogiques"
      sectionsNavigation={navigationTechnicien()}
      actions={
        <div className="flex gap-2">
          <Link to="/technicien/affectations">
            <Bouton variante="primaire">
              <Icone.Presence className="h-4 w-4" />
              Gérer les affectations
            </Bouton>
          </Link>
          <Bouton variante="secondaire" onClick={runAudit} disabled={loading}>
            <Icone.Cible className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Vérification..." : "Relancer l'audit"}
          </Bouton>
        </div>
      }
    >
      {/* État d'erreur */}
      {erreur && (
        <div className="mb-6 rounded-2xl border border-brique-200 bg-brique-50 p-6 text-center shadow-subtile">
          <Icone.Alerte className="mx-auto h-8 w-8 text-brique-600" />
          <h2 className="mt-2 font-display text-base font-bold text-brique-900">
            Erreur lors de l'audit
          </h2>
          <p className="mt-1 text-xs text-brique-700">{erreur}</p>
          <button
            onClick={runAudit}
            className="mt-4 rounded-lg bg-brique-600 px-4 py-2 text-xs font-semibold text-white shadow-subtile hover:bg-brique-700 transition-colors"
          >
            Réessayer
          </button>
        </div>
      )}

      {/* État de chargement initial */}
      {loading && !audit && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-ardoise-200 bg-white p-12 text-center shadow-subtile">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
          <p className="mt-4 text-sm font-medium text-encre-800">
            Audit de conformité en cours d'analyse...
          </p>
          <p className="mt-1 text-xs text-ardoise-500">
            Vérification de l'unicité et de la couverture des cours
          </p>
        </div>
      )}

      {/* Contenu principal après chargement */}
      {audit && (
        <div className="space-y-6">
          {/* Bannière de Statut Global */}
          <div
            className={`rounded-2xl border p-5 shadow-subtile transition-all ${
              integrite
                ? "border-emeraude-200 bg-emeraude-50/80 text-emeraude-950"
                : "border-brique-200 bg-brique-50/80 text-brique-950"
            }`}
          >
            <div className="flex items-start gap-4">
              <div
                className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${
                  integrite
                    ? "bg-emeraude-200 text-emeraude-800 shadow-sm"
                    : "bg-brique-200 text-brique-800 shadow-sm"
                }`}
              >
                {integrite ? (
                  <Icone.Validation className="h-6 w-6" />
                ) : (
                  <Icone.Alerte className="h-6 w-6" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-display text-lg font-bold">
                    {integrite
                      ? "Intégrité des affectations vérifiée : Aucun conflit détecté"
                      : `Anomalie détectée : ${doublons.length} conflit(s) d'affectation identifié(s)`}
                  </h2>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                      integrite
                        ? "bg-emeraude-200 text-emeraude-900"
                        : "bg-brique-200 text-brique-900"
                    }`}
                  >
                    {integrite ? "Conforme" : "À corriger"}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-relaxed opacity-90">
                  {integrite
                    ? "Toutes les classes respectent la règle d'unicité (un seul enseignant par matière pour chaque classe)."
                    : "Des matières ont été attribuées à plusieurs enseignants pour une même classe. Veuillez corriger ces doublons ci-dessous."}
                </p>
              </div>
            </div>
          </div>

          {/* Mini KPIs d'audit */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-ardoise-200 bg-white p-4 shadow-subtile">
              <p className="text-xs font-semibold uppercase tracking-wider text-ardoise-500">
                Classes Analysées
              </p>
              <p className="mt-2 font-display text-2xl font-bold text-encre-900">
                {audit.classes_audit?.length ?? 0}
              </p>
              <p className="mt-0.5 text-2xs text-ardoise-400">Cohortes enregistrées</p>
            </div>

            <div className="rounded-xl border border-ardoise-200 bg-white p-4 shadow-subtile">
              <p className="text-xs font-semibold uppercase tracking-wider text-ardoise-500">
                Enseignants Vérifiés
              </p>
              <p className="mt-2 font-display text-2xl font-bold text-encre-900">
                {audit.teachers_audit?.length ?? 0}
              </p>
              <p className="mt-0.5 text-2xs text-ardoise-400">Corps professoral</p>
            </div>

            <div className="rounded-xl border border-ardoise-200 bg-white p-4 shadow-subtile">
              <p className="text-xs font-semibold uppercase tracking-wider text-ardoise-500">
                Catalogue Matières
              </p>
              <p className="mt-2 font-display text-2xl font-bold text-encre-900">
                {audit.total_matieres_catalogue ?? 0}
              </p>
              <p className="mt-0.5 text-2xs text-ardoise-400">Matières actives</p>
            </div>

            <div
              className={`rounded-xl border p-4 shadow-subtile ${
                doublons.length === 0
                  ? "border-emeraude-200 bg-emeraude-50/50"
                  : "border-brique-200 bg-brique-50/50"
              }`}
            >
              <p
                className={`text-xs font-semibold uppercase tracking-wider ${
                  doublons.length === 0 ? "text-emeraude-700" : "text-brique-700"
                }`}
              >
                Doublons Identifiés
              </p>
              <p
                className={`mt-2 font-display text-2xl font-bold ${
                  doublons.length === 0 ? "text-emeraude-900" : "text-brique-900"
                }`}
              >
                {doublons.length}
              </p>
              <p
                className={`mt-0.5 text-2xs ${
                  doublons.length === 0 ? "text-emeraude-600" : "text-brique-600"
                }`}
              >
                {doublons.length === 0 ? "Aucun conflit" : "Conflits à résoudre"}
              </p>
            </div>
          </div>

          {/* Tableau des doublons si anomalies */}
          {doublons.length > 0 && (
            <Card title="Détail des conflits et doublons à corriger">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-brique-200 text-xs font-semibold uppercase tracking-wider text-brique-700">
                      <th className="py-2.5">Classe</th>
                      <th className="py-2.5">Matière en conflit</th>
                      <th className="py-2.5 text-right">Action recommandée</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brique-100">
                    {doublons.map((d, i) => (
                      <tr key={i} className="bg-brique-50/40 hover:bg-brique-50/80">
                        <td className="py-3 font-semibold text-brique-900">{d.classe}</td>
                        <td className="py-3 font-medium text-brique-800">{d.matiere}</td>
                        <td className="py-3 text-right">
                          <Link
                            to="/technicien/affectations"
                            className="inline-flex items-center gap-1.5 rounded-lg bg-brique-600 px-3 py-1.5 text-xs font-semibold text-white shadow-subtile hover:bg-brique-700 transition-colors"
                          >
                            <Icone.Notes className="h-3.5 w-3.5" />
                            Corriger dans Affectations →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Grille : Audit par Classe & Audit par Enseignant */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Couverture par classe */}
            <Card
              title="Couverture des enseignements par classe"
              action={
                <input
                  type="text"
                  placeholder="Filtrer classe..."
                  value={filtreClasse}
                  onChange={(e) => setFiltreClasse(e.target.value)}
                  className="rounded-lg border border-ardoise-200 bg-white px-2.5 py-1 text-xs text-encre-900 focus:border-indigo-500 focus:outline-none"
                />
              }
            >
              <div className="max-h-[500px] space-y-3 overflow-y-auto pr-1 defilement-fin">
                {classes.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-xl border border-ardoise-200 bg-white p-3.5 text-xs shadow-subtile transition-all hover:border-indigo-200"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold text-sm text-encre-900">{c.nom}</span>
                        <span className="ml-2 text-2xs text-ardoise-400 font-medium">
                          {c.filiere} • {c.niveau}
                        </span>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-2xs font-semibold ${
                          c.statut === "couverte"
                            ? "bg-emeraude-100 text-emeraude-800"
                            : c.statut === "partielle"
                            ? "bg-ambre-100 text-ambre-800"
                            : "bg-brique-100 text-brique-800"
                        }`}
                      >
                        {c.nb_affectations} matière(s)
                      </span>
                    </div>

                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {c.matieres?.map((m, idx) => (
                        <span
                          key={idx}
                          className="rounded-md bg-ardoise-100 px-2 py-0.5 text-2xs font-medium text-ardoise-700"
                        >
                          {m}
                        </span>
                      ))}
                      {(!c.matieres || c.matieres.length === 0) && (
                        <span className="text-2xs font-medium text-brique-600">
                          Aucune matière affectée pour cette classe.
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {classes.length === 0 && (
                  <p className="py-6 text-center text-xs text-ardoise-400">
                    Aucune classe ne correspond au filtre.
                  </p>
                )}
              </div>
            </Card>

            {/* Charge des enseignants */}
            <Card
              title="Charge des enseignants"
              action={
                <input
                  type="text"
                  placeholder="Filtrer enseignant..."
                  value={filtreEnseignant}
                  onChange={(e) => setFiltreEnseignant(e.target.value)}
                  className="rounded-lg border border-ardoise-200 bg-white px-2.5 py-1 text-xs text-encre-900 focus:border-indigo-500 focus:outline-none"
                />
              }
            >
              <div className="max-h-[500px] space-y-3 overflow-y-auto pr-1 defilement-fin">
                {enseignants.map((t) => (
                  <div
                    key={t.id}
                    className="rounded-xl border border-ardoise-200 bg-white p-3.5 text-xs shadow-subtile transition-all hover:border-indigo-200"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-encre-900">
                        {t.prenom} {t.nom}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-2xs font-semibold ${
                          t.statut === "actif"
                            ? "bg-indigo-100 text-indigo-800"
                            : "bg-ardoise-100 text-ardoise-600"
                        }`}
                      >
                        {t.nb_affectations} cours assigné(s)
                      </span>
                    </div>

                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {t.affectations?.map((a, idx) => (
                        <span
                          key={idx}
                          className="rounded-md border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-2xs font-medium text-indigo-700"
                        >
                          {a.classe} : {a.matiere}
                        </span>
                      ))}
                      {(!t.affectations || t.affectations.length === 0) && (
                        <span className="text-2xs text-ardoise-400">
                          Non affecté à une classe ce semestre.
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {enseignants.length === 0 && (
                  <p className="py-6 text-center text-xs text-ardoise-400">
                    Aucun enseignant ne correspond au filtre.
                  </p>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}
    </CoqueApplication>
  );
}
