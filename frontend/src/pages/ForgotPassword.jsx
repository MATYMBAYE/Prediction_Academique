import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Logo from "../components/Logo.jsx";
import Button from "../components/Button.jsx";
import client from "../api/client.js";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [devToken, setDevToken] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data } = await client.post("/auth/mot-de-passe-oublie", { email });
      setMessage(data.message);
      setDevToken(data.dev_reset_token || "");
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

      <div className="glass-form relative z-10 mt-8 w-full max-w-sm p-8 text-left shadow-2xl">
        <div className="relative z-10">
          <h1 className="text-center font-display text-lg font-semibold text-encre-900">
            Mot de passe oublie
          </h1>

        {!message ? (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-encre-900">
                Adresse e-mail
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                placeholder="prenom.nom@groupeisi.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-glace"
              />
            </div>
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? "Envoi..." : "Envoyer le lien de reinitialisation"}
            </Button>
          </form>
        ) : (
          <div className="mt-6 space-y-4">
            <p className="rounded-md bg-sauge-reussite/15 border border-sauge-reussite/30 px-3 py-2 text-sm text-sauge-700 font-medium">{message}</p>
            {devToken && (
              <div className="rounded-md border border-ambre-vigilance/40 bg-ambre-vigilance/10 p-3 text-xs text-encre-900">
                <p className="font-medium text-ambre-600">Mode developpement</p>
                <p className="mt-1 text-encre-700">
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

        <Link to="/connexion" className="mt-6 block text-center text-sm font-medium text-indigo-700 hover:text-indigo-900 hover:underline">
          Retour a la connexion
        </Link>
        </div>
      </div>
    </div>
  );
}
