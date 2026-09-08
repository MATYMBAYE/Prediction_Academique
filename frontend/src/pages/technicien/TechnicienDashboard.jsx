import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import CoqueApplication from "../../components/AppShell.jsx";
import { navigationTechnicien } from "../../components/navigation.js";
import Card from "../../components/Card.jsx";
import client from "../../api/client.js";
import Icone from "../../components/ui/Icons.jsx";
import { Bouton } from "../../components/ui/Primitives.jsx";

export default function TechnicienDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client
      .get("/technicien/dashboard")
      .then((res) => {
        setData(res.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const stats = data?.statistiques || {};

  return (
    <CoqueApplication
      titre="Tableau de bord technique"
      sousTitre="Gestion académique, catalogue des matières et affectations"
      sectionsNavigation={navigationTechnicien()}
      actions={
        <div className="flex gap-2">
          <Link to="/technicien/audit-affectations">
            <Bouton variante="secondaire">
              <Icone.Cible className="h-4 w-4" />
              Vérifier les affectations
            </Bouton>
          </Link>
          <Link to="/technicien/affectations">
            <Bouton variante="primaire">
              <Icone.Presence className="h-4 w-4" />
              Gérer les affectations
            </Bouton>
          </Link>
        </div>
      }
    >
      {/* KPIs principaux */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-ardoise-200 bg-white p-5 shadow-subtile">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-ardoise-500">
              Total Affectations
            </span>
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-indigo-50 text-indigo-600">
              <Icone.Presence className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 font-display text-2xl font-bold text-encre-900">
            {loading ? "..." : stats.total_affectations ?? 0}
          </p>
          <p className="mt-1 text-xs text-ardoise-500">Enseignant ↔ Matière ↔ Classe</p>
        </div>

        <div className="rounded-xl border border-ardoise-200 bg-white p-5 shadow-subtile">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-ardoise-500">
              Enseignants Actifs
            </span>
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-cyan-50 text-cyan-600">
              <Icone.Enseignants className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 font-display text-2xl font-bold text-encre-900">
            {loading ? "..." : stats.total_enseignants ?? 0}
          </p>
          <p className="mt-1 text-xs text-ardoise-500">
            {stats.enseignants_non_affectes ?? 0} sans affectation
          </p>
        </div>

        <div className="rounded-xl border border-ardoise-200 bg-white p-5 shadow-subtile">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-ardoise-500">
              Catalogue Matières
            </span>
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-violet-50 text-violet-600">
              <Icone.Notes className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 font-display text-2xl font-bold text-encre-900">
            {loading ? "..." : stats.total_matieres ?? 0}
          </p>
          <p className="mt-1 text-xs text-ardoise-500">Matières enregistrées</p>
        </div>

        <div className="rounded-xl border border-ardoise-200 bg-white p-5 shadow-subtile">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-ardoise-500">
              Classes Ouvertes
            </span>
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-emeraude-50 text-emeraude-600">
              <Icone.Classes className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 font-display text-2xl font-bold text-encre-900">
            {loading ? "..." : stats.total_classes ?? 0}
          </p>
          <p className="mt-1 text-xs text-ardoise-500">
            {stats.total_filieres ?? 0} filières • 5 niveaux (L1-M2)
          </p>
        </div>
      </div>

      {/* Grille principale */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Colonne gauche : Répartition par matière (2 col) */}
        <div className="lg:col-span-2 space-y-6">
          <Card
            title="Couverture des matières dans les classes"
            action={
              <Link to="/technicien/affectations" className="text-xs font-semibold text-indigo-600 hover:underline">
                Gérer les affectations →
              </Link>
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-ardoise-200 text-xs font-semibold uppercase tracking-wider text-ardoise-500">
                    <th className="py-2.5">Matière</th>
                    <th className="py-2.5">Classes couvertes</th>
                    <th className="py-2.5 text-right">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ardoise-100">
                  {data?.repartition_matieres?.slice(0, 10).map((m) => (
                    <tr key={m.matiere} className="hover:bg-ardoise-50/50">
                      <td className="py-3 font-medium text-encre-900">{m.matiere}</td>
                      <td className="py-3 text-ardoise-600">
                        {m.nombre_classes} classe(s)
                      </td>
                      <td className="py-3 text-right">
                        <span className="inline-flex items-center rounded-full bg-emeraude-50 px-2 py-0.5 text-xs font-semibold text-emeraude-700">
                          Affectée
                        </span>
                      </td>
                    </tr>
                  ))}
                  {!loading && (!data?.repartition_matieres || data.repartition_matieres.length === 0) && (
                    <tr>
                      <td colSpan={3} className="py-6 text-center text-sm text-ardoise-400">
                        Aucune affectation enregistrée.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Raccourcis techniques */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Link
              to="/technicien/matieres"
              className="flex items-center gap-3 rounded-xl border border-ardoise-200 bg-white p-4 shadow-subtile hover:border-indigo-200 hover:shadow-elevee transition-all"
            >
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-violet-50 text-violet-600">
                <Icone.Notes className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-encre-900">Catalogue Matières</p>
                <p className="text-xs text-ardoise-500">Ajouter & modifier</p>
              </div>
            </Link>

            <Link
              to="/technicien/affectations"
              className="flex items-center gap-3 rounded-xl border border-ardoise-200 bg-white p-4 shadow-subtile hover:border-indigo-200 hover:shadow-elevee transition-all"
            >
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-indigo-50 text-indigo-600">
                <Icone.Presence className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-encre-900">Affectations</p>
                <p className="text-xs text-ardoise-500">Attribuer des cours</p>
              </div>
            </Link>

            <Link
              to="/technicien/audit-affectations"
              className="flex items-center gap-3 rounded-xl border border-ardoise-200 bg-white p-4 shadow-subtile hover:border-indigo-200 hover:shadow-elevee transition-all"
            >
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-amber-50 text-amber-600">
                <Icone.Cible className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-encre-900">Audit d'unicité</p>
                <p className="text-xs text-ardoise-500">Contrôle anti-doublons</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Colonne droite : Alertes techniques */}
        <div className="space-y-6">
          <Card title="Enseignants sans affectation">
            <div className="space-y-2">
              {data?.alertes_techniques?.enseignants_sans_affectation?.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between rounded-lg border border-ardoise-100 bg-ardoise-50/50 p-2.5 text-xs"
                >
                  <span className="font-semibold text-encre-900">
                    {t.prenom} {t.nom}
                  </span>
                  <Link
                    to={`/technicien/affectations?teacher_id=${t.id}`}
                    className="text-indigo-600 hover:underline"
                  >
                    Affecter →
                  </Link>
                </div>
              ))}
              {!loading &&
                (!data?.alertes_techniques?.enseignants_sans_affectation ||
                  data.alertes_techniques.enseignants_sans_affectation.length === 0) && (
                  <p className="py-4 text-center text-xs text-ardoise-400">
                    Tous les enseignants ont au moins une affectation.
                  </p>
                )}
            </div>
          </Card>

          <Card title="Classes sans affectation">
            <div className="space-y-2">
              {data?.alertes_techniques?.classes_sans_affectation?.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-lg border border-ardoise-100 bg-ardoise-50/50 p-2.5 text-xs"
                >
                  <span className="font-semibold text-encre-900">{c.nom}</span>
                  <Link
                    to={`/technicien/affectations?classe_id=${c.id}`}
                    className="text-indigo-600 hover:underline"
                  >
                    Affecter →
                  </Link>
                </div>
              ))}
              {!loading &&
                (!data?.alertes_techniques?.classes_sans_affectation ||
                  data.alertes_techniques.classes_sans_affectation.length === 0) && (
                  <p className="py-4 text-center text-xs text-ardoise-400">
                    Toutes les classes disposent d'affectations.
                  </p>
                )}
            </div>
          </Card>
        </div>
      </div>
    </CoqueApplication>
  );
}
