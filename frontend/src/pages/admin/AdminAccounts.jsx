import { useEffect, useState } from "react";
import CoqueApplication from "../../components/AppShell.jsx";
import { navigationAdmin } from "../../components/navigation.js";
import Card from "../../components/Card.jsx";
import { AccountStatusBadge } from "../../components/StatusBadge.jsx";
import client from "../../api/client.js";
import { Bouton } from "../../components/ui/Primitives.jsx";

const ROLES_OPTIONS = [
  { value: "", label: "Tous les rôles" },
  { value: "assistante_pedagogique", label: "Assistante pédagogique" },
  { value: "technicien", label: "Technicien" },
  { value: "enseignant", label: "Enseignant" },
  { value: "admin", label: "Administrateur" },
  { value: "etudiant", label: "Étudiant" },
];

export default function AdminAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [history, setHistory] = useState([]);
  const [roleFilter, setRoleFilter] = useState("");
  const [loading, setLoading] = useState(true);

  // Modale création compte
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [identifiant, setIdentifiant] = useState("");
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [role, setRole] = useState("assistante_pedagogique");
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Modale statut
  const [toggleUser, setToggleUser] = useState(null);
  const [toggleMotif, setToggleMotif] = useState("");
  const [toggleSubmitting, setToggleSubmitting] = useState(false);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      client.get("/admin/accounts", {
        params: { per_page: 100, role: roleFilter || undefined },
      }),
      client.get("/admin/accounts/history", { params: { per_page: 100 } }),
    ]).then(([accountsRes, historyRes]) => {
      setAccounts(accountsRes.data.items);
      setHistory(historyRes.data.items);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleFilter]);

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    setCreateError("");
    setCreateSuccess("");

    // Validation côté frontend de l'email institutionnel
    const emailClean = email.trim().toLowerCase();
    if (role === "assistante_pedagogique" || role === "technicien") {
      if (!emailClean || !emailClean.endsWith("@groupeisi.com")) {
        setCreateError("L'adresse e-mail doit utiliser le domaine @groupeisi.com.");
        return;
      }
    } else if (emailClean && !emailClean.endsWith("@groupeisi.com")) {
      setCreateError("L'adresse e-mail doit utiliser le domaine @groupeisi.com.");
      return;
    }

    setSubmitting(true);
    try {
      await client.post("/admin/accounts", {
        identifiant: identifiant.trim(),
        email: emailClean,
        mot_de_passe: motDePasse,
        role,
      });
      setCreateSuccess("Compte créé avec succès !");
      setShowCreateModal(false);
      setIdentifiant("");
      setEmail("");
      setMotDePasse("");
      loadData();
    } catch (err) {
      setCreateError(err.response?.data?.error || "Erreur lors de la création du compte.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (e) => {
    e.preventDefault();
    if (!toggleUser) return;
    setToggleSubmitting(true);
    try {
      const nouveauStatut = toggleUser.statut === "actif" ? "inactif" : "actif";
      await client.post(`/admin/accounts/${toggleUser.id}/toggle-status`, {
        statut: nouveauStatut,
        motif: toggleMotif.trim() || undefined,
      });
      setToggleUser(null);
      setToggleMotif("");
      loadData();
    } catch (err) {
      alert(err.response?.data?.error || "Erreur lors du changement de statut.");
    } finally {
      setToggleSubmitting(false);
    }
  };

  return (
    <CoqueApplication
      titre="Gestion des comptes utilisateurs"
      sousTitre="Administration des accès, rôles et habilitations"
      sectionsNavigation={navigationAdmin()}
      actions={
        <Bouton variante="primaire" onClick={() => setShowCreateModal(true)}>
          + Créer un compte utilisateur
        </Bouton>
      }
    >
      {createSuccess && (
        <div className="mb-4 rounded-lg bg-emeraude-50 p-3 text-sm text-emeraude-800 border border-emeraude-200">
          {createSuccess}
        </div>
      )}

      {/* Filtre par rôle */}
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-ardoise-600">Filtrer par rôle :</span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-lg border border-ardoise-300 bg-white px-3 py-1.5 text-xs text-encre-900 focus:border-indigo-500 focus:outline-none font-medium"
          >
            {ROLES_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Liste des comptes */}
        <Card title="Comptes enregistrés">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ardoise-200 text-xs font-semibold uppercase tracking-wider text-ardoise-500">
                  <th className="py-2.5">Utilisateur</th>
                  <th className="py-2.5">Rôle</th>
                  <th className="py-2.5">E-mail</th>
                  <th className="py-2.5">Statut</th>
                  <th className="py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ardoise-100">
                {accounts.map((a) => (
                  <tr key={a.id} className="hover:bg-ardoise-50/50">
                    <td className="py-3">
                      <span className="font-semibold text-encre-900 block">
                        {a.nom_complet || a.etudiant || a.identifiant}
                      </span>
                      <span className="text-2xs font-mono text-ardoise-400">{a.identifiant}</span>
                    </td>
                    <td className="py-3">
                      <span className="inline-flex items-center rounded-full bg-ardoise-100 px-2 py-0.5 text-2xs font-medium text-encre-800 capitalize">
                        {a.role?.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-3 text-xs text-ardoise-600 truncate max-w-[150px]">
                      {a.email || "-"}
                    </td>
                    <td className="py-3">
                      <AccountStatusBadge status={a.statut} />
                    </td>
                    <td className="py-3 text-right">
                      {a.role !== "admin" && (
                        <button
                          onClick={() => setToggleUser(a)}
                          className={`rounded px-2 py-1 text-xs font-semibold ${
                            a.statut === "actif"
                              ? "text-brique-600 hover:bg-brique-50"
                              : "text-emeraude-600 hover:bg-emeraude-50"
                          }`}
                        >
                          {a.statut === "actif" ? "Désactiver" : "Activer"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {!loading && accounts.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-ardoise-400 text-sm">
                      Aucun compte trouvé.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Historique des changements */}
        <Card title="Historique des activations / désactivations">
          <div className="max-h-[520px] overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ardoise-200 text-xs font-semibold uppercase tracking-wider text-ardoise-500">
                  <th className="py-2.5">Compte</th>
                  <th className="py-2.5">Transition</th>
                  <th className="py-2.5">Motif</th>
                  <th className="py-2.5 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ardoise-100">
                {history.map((h) => (
                  <tr key={h.id} className="hover:bg-ardoise-50/50">
                    <td className="py-3 font-medium text-encre-900">{h.etudiant}</td>
                    <td className="py-3">
                      <span className="text-2xs text-ardoise-500">{h.ancien_statut}</span>
                      {" → "}
                      <AccountStatusBadge status={h.nouveau_statut} />
                    </td>
                    <td className="py-3 text-xs text-ardoise-600">{h.motif || "-"}</td>
                    <td className="py-3 text-right text-xs text-ardoise-400">
                      {new Date(h.date_changement).toLocaleDateString("fr-FR")}
                    </td>
                  </tr>
                ))}
                {!loading && history.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-ardoise-400 text-sm">
                      Aucun changement de statut enregistré.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Modale Création Compte */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-encre-950/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-elevee">
            <h3 className="font-display text-lg font-bold text-encre-900">
              Créer un compte utilisateur
            </h3>
            <p className="mt-1 text-xs text-ardoise-500">
              Les comptes Assistante pédagogique et Technicien exigent une adresse institutionnelle{" "}
              <strong>@groupeisi.com</strong>.
            </p>

            {createError && (
              <div className="mt-4 rounded-lg bg-brique-50 p-3 text-xs text-brique-700 border border-brique-200 font-medium">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateAccount} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-encre-800 mb-1">
                  Rôle du compte *
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full rounded-lg border border-ardoise-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none font-medium"
                >
                  <option value="assistante_pedagogique">Assistante pédagogique</option>
                  <option value="technicien">Technicien</option>
                  <option value="enseignant">Enseignant</option>
                  <option value="admin">Administrateur</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-encre-800 mb-1">
                  Identifiant de connexion *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex : assistante.fatou, tech.mamadou..."
                  value={identifiant}
                  onChange={(e) => setIdentifiant(e.target.value)}
                  className="w-full rounded-lg border border-ardoise-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-encre-800 mb-1">
                  Adresse e-mail institutionnelle *
                </label>
                <input
                  type="email"
                  required
                  placeholder="prenom.nom@groupeisi.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-ardoise-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-encre-800 mb-1">
                  Mot de passe temporaire *
                </label>
                <input
                  type="password"
                  required
                  placeholder="Minimum 8 caractères (Maj, min, chiffre, spécial)"
                  value={motDePasse}
                  onChange={(e) => setMotDePasse(e.target.value)}
                  className="w-full rounded-lg border border-ardoise-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="mt-6 flex justify-end gap-2 border-t border-ardoise-100 pt-3">
                <Bouton
                  type="button"
                  variante="secondaire"
                  onClick={() => setShowCreateModal(false)}
                >
                  Annuler
                </Bouton>
                <Bouton type="submit" variante="primaire" disabled={submitting}>
                  {submitting ? "Création en cours..." : "Créer le compte"}
                </Bouton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modale Changement Statut */}
      {toggleUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-encre-950/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-elevee">
            <h3 className="font-display text-base font-bold text-encre-900">
              {toggleUser.statut === "actif" ? "Désactiver le compte" : "Réactiver le compte"}
            </h3>
            <p className="mt-2 text-xs text-ardoise-600">
              Utilisateur : <strong>{toggleUser.nom_complet || toggleUser.identifiant}</strong>
            </p>

            <form onSubmit={handleToggleStatus} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-encre-800 mb-1">
                  Motif du changement (optionnel)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex : Fin de contrat, suspension temporaire..."
                  value={toggleMotif}
                  onChange={(e) => setToggleMotif(e.target.value)}
                  className="w-full rounded-lg border border-ardoise-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <Bouton
                  type="button"
                  variante="secondaire"
                  onClick={() => setToggleUser(null)}
                >
                  Annuler
                </Bouton>
                <Bouton
                  type="submit"
                  variante={toggleUser.statut === "actif" ? "danger" : "primaire"}
                  disabled={toggleSubmitting}
                >
                  {toggleSubmitting
                    ? "Traitement..."
                    : toggleUser.statut === "actif"
                    ? "Désactiver"
                    : "Réactiver"}
                </Bouton>
              </div>
            </form>
          </div>
        </div>
      )}
    </CoqueApplication>
  );
}
