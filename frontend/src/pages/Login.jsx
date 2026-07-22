import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Logo from "../components/Logo.jsx";
import Button from "../components/Button.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [identifiant, setIdentifiant] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const user = await login(identifiant, motDePasse);
      const roleHome = { admin: "/admin", enseignant: "/enseignant", etudiant: "/etudiant" };
      const roleBasePath = { admin: "/admin", enseignant: "/enseignant", etudiant: "/etudiant" }[user.role];
      const requestedPath = location.state?.from?.pathname;
      // On ne reutilise la page d'origine que si elle appartient a l'espace
      // du role qui vient de se connecter (sinon ProtectedRoute la refuserait
      // de toute facon et renverrait vers "/", ce qui est deroutant).
      const dest = requestedPath?.startsWith(roleBasePath) ? requestedPath : roleHome[user.role] || "/";
      navigate(dest, { replace: true });
    } catch (err) {
      if (err.code === "COMPTE_DESACTIVE") {
        navigate("/compte-desactive", { replace: true, state: { motif: err.motif } });
        return;
      }
      if (!err.response) {
        // Pas de reponse du serveur (backend eteint, mauvaise URL, CORS...) :
        // ne pas afficher un message de securite trompeur dans ce cas.
        setError("Impossible de contacter le serveur. Verifiez que le backend est demarre.");
      } else {
        // Message generique, sans jamais reveler si le compte existe (§3.1)
        setError(err.response?.data?.error || "Identifiant ou mot de passe incorrect.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-brume-academique px-4">
      <TrajectoryWatermark />

      <div className="relative z-10 w-full max-w-sm rounded-card bg-white p-8 shadow-card">
        <div className="mb-6 flex justify-center">
          <Logo size={40} />
        </div>
        <h1 className="text-center font-display text-lg font-semibold text-encre-nocturne">Connexion</h1>
        <p className="mt-1 text-center text-sm text-encre-nocturne/60">Espace etudiant ou administrateur</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="identifiant" className="mb-1 block text-sm font-medium text-encre-nocturne">
              Identifiant
            </label>
            <input
              id="identifiant"
              type="text"
              autoComplete="username"
              required
              value={identifiant}
              onChange={(e) => setIdentifiant(e.target.value)}
              className="focus-ring w-full rounded-md border border-encre-nocturne/20 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="mot_de_passe" className="mb-1 block text-sm font-medium text-encre-nocturne">
              Mot de passe
            </label>
            <input
              id="mot_de_passe"
              type="password"
              autoComplete="current-password"
              required
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              className="focus-ring w-full rounded-md border border-encre-nocturne/20 px-3 py-2 text-sm"
            />
          </div>

          {error && (
            <p role="alert" className="rounded-md bg-brique-alerte/10 px-3 py-2 text-sm text-brique-alerte">
              {error}
            </p>
          )}

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? "Connexion..." : "Se connecter"}
          </Button>
        </form>

        <div className="mt-4 flex items-center justify-between text-sm">
          <Link to="/mot-de-passe-oublie" className="text-indigo-trajectoire hover:underline">
            Mot de passe oublie
          </Link>
          <Link to="/" className="text-encre-nocturne/60 hover:underline">
            Retour a l'accueil
          </Link>
        </div>
      </div>
    </div>
  );
}

function TrajectoryWatermark() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.06]"
      viewBox="0 0 400 200"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d="M0 160 L60 120 L120 140 L180 80 L240 100 L300 40 L400 10"
        stroke="#3D5A99"
        strokeWidth="4"
        fill="none"
      />
    </svg>
  );
}
