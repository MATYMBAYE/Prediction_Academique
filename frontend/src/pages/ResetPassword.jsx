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
    <div className="bg-isi-bleu flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <div className="mb-6 flex justify-center">
        <span className="inline-flex rounded-xl bg-white/10 p-3 shadow-elevee backdrop-blur-md">
          <Logo size={40} />
        </span>
      </div>

      <div className="light light-1"></div>
      <div className="light light-2"></div>

      <div className="glass-form relative z-10 mt-8 w-full max-w-sm p-8 text-left overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-center font-display text-lg font-semibold text-encre-900">
            Nouveau mot de passe
          </h1>

        {!token && (
          <p className="mt-4 rounded-md bg-brique-alerte/15 border border-brique-alerte/30 px-3 py-2 text-sm text-brique-700 font-medium">
            Lien de reinitialisation manquant ou invalide.
          </p>
        )}

        {success ? (
          <p className="mt-6 rounded-md bg-sauge-reussite/15 border border-sauge-reussite/30 px-3 py-2 text-sm text-sauge-700 font-medium">
            Mot de passe reinitialise. Redirection vers la connexion...
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-encre-900">Nouveau mot de passe</label>
              <input
                type="password"
                required
                minLength={8}
                value={motDePasse}
                onChange={(e) => setMotDePasse(e.target.value)}
                className="input-glace"
              />
              <p className="mt-1 text-xs text-encre-700/80">
                Min 8 caractères, 1 majuscule, 1 minuscule, 1 chiffre, 1 caractère spécial.
              </p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-encre-900">Confirmation</label>
              <input
                type="password"
                required
                minLength={8}
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                className="input-glace"
              />
            </div>
            {error && <p className="text-sm font-medium text-brique-700">{error}</p>}
            <Button type="submit" disabled={submitting || !token} className="w-full">
              {submitting ? "Enregistrement..." : "Reinitialiser le mot de passe"}
            </Button>
          </form>
        )}

        <Link to="/connexion" className="mt-6 block text-center text-sm font-medium text-indigo-700 hover:text-indigo-900 hover:underline">
          Retour a la connexion
        </Link>
        </div>
      </div>
    </div>
  );
}
