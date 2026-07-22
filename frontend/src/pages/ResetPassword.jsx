import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Logo from "../components/Logo.jsx";
import Button from "../components/Button.jsx";
import client from "../api/client.js";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";
  const [motDePasse, setMotDePasse] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (motDePasse !== confirmation) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    if (motDePasse.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caracteres.");
      return;
    }
    setSubmitting(true);
    try {
      await client.post("/auth/reinitialiser-mot-de-passe", { token, nouveau_mot_de_passe: motDePasse });
      setSuccess(true);
      setTimeout(() => navigate("/connexion", { replace: true }), 2000);
    } catch (err) {
      setError(err.response?.data?.error || "Impossible de reinitialiser le mot de passe.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-brume-academique px-4 text-center">
      <Logo size={40} />
      <div className="mt-8 w-full max-w-sm rounded-card bg-white p-8 shadow-card text-left">
        <h1 className="text-center font-display text-lg font-semibold text-encre-nocturne">
          Nouveau mot de passe
        </h1>

        {!token && (
          <p className="mt-4 rounded-md bg-brique-alerte/10 px-3 py-2 text-sm text-brique-alerte">
            Lien de reinitialisation manquant ou invalide.
          </p>
        )}

        {success ? (
          <p className="mt-6 rounded-md bg-sauge-reussite/10 px-3 py-2 text-sm text-sauge-reussite">
            Mot de passe reinitialise. Redirection vers la connexion...
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-encre-nocturne">Nouveau mot de passe</label>
              <input
                type="password"
                required
                minLength={8}
                value={motDePasse}
                onChange={(e) => setMotDePasse(e.target.value)}
                className="focus-ring w-full rounded-md border border-encre-nocturne/20 px-3 py-2 text-sm"
              />
              <p className="mt-1 text-xs text-encre-nocturne/60">
                Min 8 caractères, 1 majuscule, 1 minuscule, 1 chiffre, 1 caractère spécial.
              </p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-encre-nocturne">Confirmation</label>
              <input
                type="password"
                required
                minLength={8}
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                className="focus-ring w-full rounded-md border border-encre-nocturne/20 px-3 py-2 text-sm"
              />
            </div>
            {error && <p className="text-sm text-brique-alerte">{error}</p>}
            <Button type="submit" disabled={submitting || !token} className="w-full">
              {submitting ? "Enregistrement..." : "Reinitialiser le mot de passe"}
            </Button>
          </form>
        )}

        <Link to="/connexion" className="mt-6 block text-center text-sm text-indigo-trajectoire hover:underline">
          Retour a la connexion
        </Link>
      </div>
    </div>
  );
}
