import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Logo from "../components/Logo.jsx";
import Button from "../components/Button.jsx";
import client from "../api/client.js";

/**
 * Demande de reinitialisation (§3.1). Aucun service SMTP n'est branche sur
 * ce projet local : en environnement de dev, l'API renvoie un token de
 * test qui permet de continuer le parcours (cf. auth_routes.py). En
 * production, ce token serait uniquement envoye par email.
 */
export default function ForgotPassword() {
  const navigate = useNavigate();
  const [identifiant, setIdentifiant] = useState("");
  const [message, setMessage] = useState("");
  const [devToken, setDevToken] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data } = await client.post("/auth/mot-de-passe-oublie", { identifiant });
      setMessage(data.message);
      setDevToken(data.dev_reset_token || "");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-brume-academique px-4 text-center">
      <Logo size={40} />
      <div className="mt-8 w-full max-w-sm rounded-card bg-white p-8 shadow-card text-left">
        <h1 className="text-center font-display text-lg font-semibold text-encre-nocturne">
          Mot de passe oublie
        </h1>

        {!message ? (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="identifiant" className="mb-1 block text-sm font-medium text-encre-nocturne">
                Identifiant
              </label>
              <input
                id="identifiant"
                type="text"
                required
                value={identifiant}
                onChange={(e) => setIdentifiant(e.target.value)}
                className="focus-ring w-full rounded-md border border-encre-nocturne/20 px-3 py-2 text-sm"
              />
            </div>
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? "Envoi..." : "Envoyer le lien de reinitialisation"}
            </Button>
          </form>
        ) : (
          <div className="mt-6 space-y-4">
            <p className="rounded-md bg-sauge-reussite/10 px-3 py-2 text-sm text-sauge-reussite">{message}</p>
            {devToken && (
              <div className="rounded-md border border-ambre-vigilance/40 bg-ambre-vigilance/10 p-3 text-xs text-encre-nocturne/80">
                <p className="font-medium text-ambre-vigilance">Mode developpement</p>
                <p className="mt-1">
                  Aucun service d'envoi d'email n'est configure sur ce projet local. Le token de
                  reinitialisation est affiche ici a titre de demonstration (en production, il serait
                  envoye uniquement par email).
                </p>
                <Button
                  variant="secondary"
                  className="mt-3 w-full"
                  onClick={() => navigate(`/reinitialiser-mot-de-passe?token=${devToken}`)}
                >
                  Continuer la reinitialisation
                </Button>
              </div>
            )}
          </div>
        )}

        <Link to="/connexion" className="mt-6 block text-center text-sm text-indigo-trajectoire hover:underline">
          Retour a la connexion
        </Link>
      </div>
    </div>
  );
}
