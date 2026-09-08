import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import CoqueApplication from "../../components/AppShell.jsx";
import { navigationAssistante } from "../../components/navigation.js";
import Card from "../../components/Card.jsx";
import { RiskBadge, TreatmentStatusBadge } from "../../components/StatusBadge.jsx";
import client from "../../api/client.js";
import Icone from "../../components/ui/Icons.jsx";
import { Bouton } from "../../components/ui/Primitives.jsx";

export default function AssistantDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState(null);

  const chargerDonnees = () => {
    setLoading(true);
    setErreur(null);
    client
      .get("/assistant/dashboard")
      .then((res) => {
        setData(res.data);
        setLoading(false);
      })
      .catch((err) => {
        setErreur(
          err?.response?.data?.error ||
            "Impossible de charger les données du tableau de bord. Vérifiez la connexion au serveur."
        );
        setLoading(false);
      });
  };

  useEffect(() => {
    chargerDonnees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = data?.statistiques || {};
  const repartition = data?.repartition_risque || {};

  return (
    <CoqueApplication
      titre="Tableau de bord pédagogique"
      sousTitre="Supervision de la réussite étudiante, prédictions d'échec et accompagnement"
      sectionsNavigation={navigationAssistante()}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Link to="/assistante/etudiants">
            <Bouton variante="secondaire">
              <Icone.Etudiants className="h-4 w-4" />
              Suivi des étudiants
            </Bouton>
          </Link>
          <Link to="/assistante/notes">
            <Bouton variante="primaire">
              <Icone.Notes className="h-4 w-4" />
              Saisir des notes
            </Bouton>
          </Link>
        </div>
      }
    >
      {/* État d'erreur */}
      {erreur && (
        <div className="mb-6 rounded-2xl border border-brique-200 bg-brique-50 p-6 text-center shadow-subtile">
          <Icone.Alerte className="mx-auto h-8 w-8 text-brique-600" />
          <h2 className="mt-2 font-display text-base font-bold text-brique-900">
            Erreur de chargement
          </h2>
          <p className="mt-1 text-xs text-brique-700">{erreur}</p>
          <button
            onClick={chargerDonnees}
            className="mt-4 rounded-lg bg-brique-600 px-4 py-2 text-xs font-semibold text-white shadow-subtile hover:bg-brique-700 transition-colors"
          >
            Réessayer
          </button>
        </div>
      )}

      {/* KPIs principaux */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Étudiants */}
        <div className="rounded-xl border border-ardoise-200 bg-white p-5 shadow-subtile transition-all hover:shadow-elevee">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-ardoise-500">
              Total Étudiants
            </span>
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-indigo-50 text-indigo-600">
              <Icone.Etudiants className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 font-display text-2xl font-bold text-encre-900">
            {loading ? "..." : stats.total_etudiants ?? 0}
          </p>
          <p className="mt-1 text-xs text-ardoise-500">
            {data?.total_classes ?? 0} classes • {data?.total_filieres ?? 0} filières
          </p>
        </div>

        {/* Risque Élevé */}
        <div className="rounded-xl border border-brique-200 bg-brique-50/60 p-5 shadow-subtile transition-all hover:shadow-elevee">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-brique-700">
              Risque Élevé
            </span>
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-brique-100 text-brique-600">
              <Icone.Cible className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 font-display text-2xl font-bold text-brique-900">
            {loading ? "..." : repartition.eleve ?? 0}
          </p>
          <p className="mt-1 text-xs text-brique-600">Intervention prioritaire requise</p>
        </div>

        {/* Risque Moyen */}
        <div className="rounded-xl border border-ambre-200 bg-ambre-50/60 p-5 shadow-subtile transition-all hover:shadow-elevee">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-ambre-700">
              Risque Moyen
            </span>
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-ambre-100 text-ambre-600">
              <Icone.Alerte className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 font-display text-2xl font-bold text-ambre-900">
            {loading ? "..." : repartition.moyen ?? 0}
          </p>
          <p className="mt-1 text-xs text-ambre-600">À surveiller attentivement</p>
        </div>

        {/* En Réussite */}
        <div className="rounded-xl border border-emeraude-200 bg-emeraude-50/60 p-5 shadow-subtile transition-all hover:shadow-elevee">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emeraude-700">
              En Réussite
            </span>
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-emeraude-100 text-emeraude-600">
              <Icone.Validation className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 font-display text-2xl font-bold text-emeraude-900">
            {loading ? "..." : repartition.faible ?? 0}
          </p>
          <p className="mt-1 text-xs text-emeraude-600">Progression normale</p>
        </div>
      </div>

      {/* Grille principale : Étudiants prioritaires & Alertes */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Colonne gauche : Étudiants prioritaires (2 col) */}
        <div className="lg:col-span-2 space-y-6">
          <Card
            title="Étudiants nécessitant une attention pédagogique"
            action={
              <Link
                to="/assistante/etudiants-risque"
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
              >
                Voir tout ({data?.etudiants_a_risque?.length ?? 0}) →
              </Link>
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-ardoise-100 text-xs font-semibold uppercase tracking-wider text-ardoise-500">
                    <th className="py-2.5">Étudiant</th>
                    <th className="py-2.5">Classe</th>
                    <th className="py-2.5">Moyenne</th>
                    <th className="py-2.5">Assiduité</th>
                    <th className="py-2.5">Niveau de risque</th>
                    <th className="py-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ardoise-100">
                  {data?.etudiants_a_risque?.slice(0, 8).map((e) => (
                    <tr key={e.id} className="hover:bg-ardoise-50/80 transition-colors">
                      <td className="py-3 font-medium text-encre-900">
                        {e.prenom} {e.nom}
                        <span className="block text-2xs text-ardoise-400 font-mono">
                          {e.matricule}
                        </span>
                      </td>
                      <td className="py-3 text-ardoise-600">{e.classe ?? "-"}</td>
                      <td className="py-3 font-semibold text-encre-800">
                        {e.moyenne_generale !== null && e.moyenne_generale !== undefined
                          ? `${e.moyenne_generale.toFixed(1)}/20`
                          : "-"}
                      </td>
                      <td className="py-3 text-ardoise-600">
                        {e.taux_assiduite !== null && e.taux_assiduite !== undefined
                          ? `${e.taux_assiduite.toFixed(0)}%`
                          : "-"}
                      </td>
                      <td className="py-3">
                        <RiskBadge risk={e.niveau_risque} />
                      </td>
                      <td className="py-3 text-right">
                        <Link
                          to={`/assistante/etudiants/${e.id}`}
                          className="inline-flex items-center gap-1 rounded-md bg-ardoise-100 px-2.5 py-1 text-xs font-medium text-encre-800 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                        >
                          Fiche →
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {!loading &&
                    (!data?.etudiants_a_risque || data.etudiants_a_risque.length === 0) && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-sm text-ardoise-400">
                          Aucun étudiant en situation de risque critique.
                        </td>
                      </tr>
                    )}
                  {loading && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-sm text-ardoise-400">
                        Chargement des dossiers étudiants...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Raccourcis pédagogiques rapides */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Link
              to="/assistante/etudiants"
              className="flex items-center gap-3 rounded-xl border border-ardoise-200 bg-white p-4 shadow-subtile hover:border-indigo-200 hover:shadow-elevee transition-all"
            >
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-indigo-50 text-indigo-600">
                <Icone.Etudiants className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-encre-900">Suivi Étudiants</p>
                <p className="text-xs text-ardoise-500">Consulter tous les dossiers</p>
              </div>
            </Link>

            <Link
              to="/assistante/classes"
              className="flex items-center gap-3 rounded-xl border border-ardoise-200 bg-white p-4 shadow-subtile hover:border-indigo-200 hover:shadow-elevee transition-all"
            >
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-cyan-50 text-cyan-600">
                <Icone.Classes className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-encre-900">Classes & Filières</p>
                <p className="text-xs text-ardoise-500">Gestion des cohortes</p>
              </div>
            </Link>

            <Link
              to="/assistante/annees-academiques"
              className="flex items-center gap-3 rounded-xl border border-ardoise-200 bg-white p-4 shadow-subtile hover:border-indigo-200 hover:shadow-elevee transition-all"
            >
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-violet-50 text-violet-600">
                <Icone.Presence className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-encre-900">Années Académiques</p>
                <p className="text-xs text-ardoise-500">
                  {data?.annee_active?.libelle || "Gestion des sessions"}
                </p>
              </div>
            </Link>
          </div>
        </div>

        {/* Colonne droite : Alertes récentes & Statistiques filières */}
        <div className="space-y-6">
          {/* Alertes récentes */}
          <Card
            title="Alertes pédagogiques récentes"
            action={
              <Link
                to="/assistante/alertes"
                className="text-xs font-semibold text-indigo-600 hover:underline"
              >
                Gérer →
              </Link>
            }
          >
            <div className="space-y-3">
              {data?.alertes_recentes?.map((a) => (
                <div
                  key={a.id}
                  className="rounded-lg border border-ardoise-100 bg-ardoise-50/50 p-3 text-xs transition-all hover:bg-ardoise-100/50"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-encre-900">{a.etudiant}</span>
                    <RiskBadge risk={a.niveau_risque} />
                  </div>
                  <p className="mt-1 text-ardoise-600">{a.libelle_type}</p>
                  <div className="mt-2 flex items-center justify-between text-2xs text-ardoise-400">
                    <span>{a.classe ?? "Sans classe"}</span>
                    <TreatmentStatusBadge status={a.statut_traitement} />
                  </div>
                </div>
              ))}
              {!loading &&
                (!data?.alertes_recentes || data.alertes_recentes.length === 0) && (
                  <p className="py-6 text-center text-xs text-ardoise-400">
                    Aucune alerte en attente de traitement.
                  </p>
                )}
            </div>
          </Card>

          {/* Répartition du risque par filière */}
          <Card title="Répartition du risque par filière">
            <div className="space-y-3">
              {data?.par_filiere?.map((f) => {
                const total = (f.faible || 0) + (f.moyen || 0) + (f.eleve || 0);
                const pctRisque =
                  total > 0 ? (((f.moyen || 0) + (f.eleve || 0)) / total) * 100 : 0;
                return (
                  <div key={f.filiere} className="text-xs">
                    <div className="flex justify-between font-medium text-encre-800">
                      <span>{f.filiere}</span>
                      <span>{pctRisque.toFixed(0)}% à risque</span>
                    </div>
                    <div className="mt-1.5 flex h-2 w-full overflow-hidden rounded-full bg-ardoise-100">
                      {total > 0 ? (
                        <>
                          <div
                            style={{ width: `${(f.faible / total) * 100}%` }}
                            className="bg-emeraude-500 transition-all"
                            title={`Faible: ${f.faible}`}
                          />
                          <div
                            style={{ width: `${(f.moyen / total) * 100}%` }}
                            className="bg-ambre-500 transition-all"
                            title={`Moyen: ${f.moyen}`}
                          />
                          <div
                            style={{ width: `${(f.eleve / total) * 100}%` }}
                            className="bg-brique-500 transition-all"
                            title={`Élevé: ${f.eleve}`}
                          />
                        </>
                      ) : (
                        <div className="w-full bg-ardoise-200" title="Aucun effectif" />
                      )}
                    </div>
                  </div>
                );
              })}
              {!loading && (!data?.par_filiere || data.par_filiere.length === 0) && (
                <p className="py-4 text-center text-xs text-ardoise-400">
                  Aucune filière disponible.
                </p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </CoqueApplication>
  );
}
