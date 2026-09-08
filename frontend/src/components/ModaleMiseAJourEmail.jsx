import { useState } from "react";
import client from "../api/client.js";
import { Modale, useNotifications } from "./ui/Feedback.jsx";
import { Bouton } from "./ui/Primitives.jsx";
import Icone from "./ui/Icons.jsx";

import { useAuth } from "../context/AuthContext.jsx";

export default function ModaleMiseAJourEmail({ ouverte, onFermer }) {
  const { user, login } = useAuth();
  const notify = useNotifications();

  const [etape, setEtape] = useState(1); // 1 = Saisie email, 2 = Saisie OTP
  const [emailSaisi, setEmailSaisi] = useState("");
  const [otpSaisi, setOtpSaisi] = useState("");
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState("");
  const [messageSucces, setMessageSucces] = useState("");

  const reinitialiser = () => {
    setEtape(1);
    setEmailSaisi("");
    setOtpSaisi("");
    setErreur("");
    setMessageSucces("");
    setChargement(false);
  };

  const handleFermer = () => {
    reinitialiser();
    onFermer();
  };

  const handleDemanderOtp = async (e) => {
    e.preventDefault();
    setErreur("");
    setMessageSucces("");

    if (!emailSaisi.trim()) {
      setErreur("Veuillez saisir votre nouvelle adresse e-mail.");
      return;
    }

    if (!emailSaisi.trim().toLowerCase().endsWith("@groupeisi.com")) {
      setErreur("Adresse e-mail invalide. Veuillez utiliser une adresse e-mail institutionnelle se terminant par @groupeisi.com.");
      return;
    }

    setChargement(true);
    try {
      const res = await client.post("/auth/demander-verification-email", {
        nouvelle_email: emailSaisi.trim(),
      });
      setMessageSucces(res.data.message || `Code de vérification envoyé à ${emailSaisi}`);
      setEtape(2);
    } catch (err) {
      setErreur(err.response?.data?.error || "Impossible d'envoyer le code de vérification.");
    } finally {
      setChargement(false);
    }
  };

  const handleValiderOtp = async (e) => {
    e.preventDefault();
    setErreur("");

    if (!otpSaisi.trim()) {
      setErreur("Veuillez entrer le code de vérification à 6 chiffres.");
      return;
    }

    setChargement(true);
    try {
      const res = await client.post("/auth/verifier-otp-email", {
        otp: otpSaisi.trim(),
      });

      notify.succes("Adresse e-mail mise à jour et vérifiée avec succès !");
      
      // Mettre a jour l'utilisateur dans AuthContext si possible (re-fetch ou reload)
      if (res.data?.user) {
        const jetonActuel = localStorage.getItem("token");
        if (jetonActuel) {
          login(jetonActuel, res.data.user);
        }
      }

      handleFermer();
      // Forcer un rafraichissement doux de la page pour actualiser les donnees
      window.location.reload();
    } catch (err) {
      setErreur(err.response?.data?.error || "Code de vérification invalide ou expiré.");
    } finally {
      setChargement(false);
    }
  };

  const handleRenvoyerOtp = async () => {
    setErreur("");
    setMessageSucces("");
    setChargement(true);

    try {
      const res = await client.post("/auth/renvoyer-otp-email");
      setMessageSucces(res.data.message || "Un nouveau code vient de vous être envoyé.");
      notify.info("Nouveau code de vérification envoyé.");
    } catch (err) {
      setErreur(err.response?.data?.error || "Impossible de renvoyer le code.");
    } finally {
      setChargement(false);
    }
  };

  return (
    <Modale
      ouverte={ouverte}
      onFermer={handleFermer}
      titre="Adresse e-mail institutionnelle (@groupeisi.com)"
      sousTitre="Vérification et mise à jour de votre compte ISI-SUPTECH"
      taille="md"
    >
      <div className="p-6 space-y-4">
        {erreur && (
          <div className="rounded-lg bg-brique-50 border border-brique-200 p-3.5 text-sm text-brique-700 flex items-start gap-2.5">
            <Icone.Alerte className="h-5 w-5 shrink-0 text-brique-600 mt-0.5" />
            <span>{erreur}</span>
          </div>
        )}

        {messageSucces && (
          <div className="rounded-lg bg-succes-50 border border-succes-200 p-3.5 text-sm text-succes-800 flex items-start gap-2.5">
            <Icone.Succes className="h-5 w-5 shrink-0 text-succes-600 mt-0.5" />
            <span>{messageSucces}</span>
          </div>
        )}

        {etape === 1 ? (
          <form onSubmit={handleDemanderOtp} className="space-y-4">
            <p className="text-sm text-ardoise-600 leading-relaxed">
              Pour garantir la sécurité et la conformité de votre compte <strong>ISI-SUPTECH</strong>, 
              veuillez saisir votre adresse e-mail institutionnelle se terminant par <code>@groupeisi.com</code>.
            </p>

            <div>
              <label htmlFor="nouvelle_email" className="block text-xs font-semibold text-encre-900 mb-1.5">
                Adresse e-mail institutionnelle
              </label>
              <input
                id="nouvelle_email"
                type="email"
                placeholder="votre.nom@groupeisi.com"
                value={emailSaisi}
                onChange={(e) => setEmailSaisi(e.target.value)}
                className="anneau-focus w-full rounded-lg border border-ardoise-300 bg-white px-3.5 py-2.5 text-sm text-encre-900 placeholder:text-ardoise-400"
                required
              />
              <p className="mt-1 text-2xs text-ardoise-500">
                Exemple valide : <code>matymbayeisidp@groupeisi.com</code>
              </p>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <Bouton type="button" variante="secondaire" onClick={handleFermer}>
                Annuler
              </Bouton>
              <Bouton type="submit" cargement={chargement}>
                Envoyer le code de vérification
              </Bouton>
            </div>
          </form>
        ) : (
          <form onSubmit={handleValiderOtp} className="space-y-4 animate-fondu-simple">
            <p className="text-sm text-ardoise-600 leading-relaxed">
              Un code de vérification à 6 chiffres a été transmis à l'adresse <strong>{emailSaisi || user?.pending_email}</strong>.
            </p>

            <div>
              <label htmlFor="otp_code" className="block text-xs font-semibold text-encre-900 mb-1.5">
                Code de vérification (6 chiffres)
              </label>
              <input
                id="otp_code"
                type="text"
                maxLength={6}
                placeholder="123456"
                value={otpSaisi}
                onChange={(e) => setOtpSaisi(e.target.value.replace(/\D/g, ""))}
                className="anneau-focus w-full rounded-lg border border-ardoise-300 bg-white px-4 py-3 text-center text-xl tracking-[0.4em] font-mono text-encre-900 placeholder:text-ardoise-300"
                required
              />
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-ardoise-500">Code non reçu ?</span>
              <button
                type="button"
                onClick={handleRenvoyerOtp}
                disabled={chargement}
                className="font-medium text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
              >
                Renvoyer le code
              </button>
            </div>

            <div className="flex justify-end gap-2.5 pt-3">
              <Bouton type="button" variante="secondaire" onClick={() => setEtape(1)}>
                Changer d'adresse
              </Bouton>
              <Bouton type="submit" cargement={chargement}>
                Valider et activer l'adresse
              </Bouton>
            </div>
          </form>
        )}
      </div>
    </Modale>
  );
}
