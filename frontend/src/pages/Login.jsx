import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Logo from "../components/Logo.jsx";
import Button from "../components/Button.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import photoGroupeEtudiants from "../assets/photo-groupe-etudiants.jpg";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const user = await login(email, motDePasse);
      const roleHome = {
        admin: "/admin",
        enseignant: "/enseignant",
        etudiant: "/etudiant",
        assistante_pedagogique: "/assistante",
        technicien: "/technicien",
      };
      const roleBasePath = roleHome[user.role] || "/";
      const requestedPath = location.state?.from?.pathname;
      const dest = requestedPath?.startsWith(roleBasePath) ? requestedPath : roleHome[user.role] || "/";
      navigate(dest, { replace: true });
    } catch (err) {
      if (err.code === "COMPTE_DESACTIVE") {
        navigate("/compte-desactive", { replace: true, state: { motif: err.motif } });
        return;
      }
      if (!err.response) {
        setError("Impossible de contacter le serveur. Verifiez que le backend est demarre.");
      } else {
        setError(err.response?.data?.error || "Adresse e-mail ou mot de passe incorrect.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Panneau photo */}
      <div className="relative hidden w-1/2 lg:block xl:w-[55%]">
        <img
          src={photoGroupeEtudiants}
          alt="Etudiants de ISI SUPTECH devant l'etablissement"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-encre-nocturne via-encre-nocturne/65 to-encre-nocturne/15" />

        <div className="relative z-10 flex h-full flex-col justify-between p-10 xl:p-14">
          <span className="inline-flex w-fit rounded-xl bg-white px-3 py-2 shadow-elevee">
            <Logo size={34} />
          </span>

          <div className="text-white [text-shadow:0_2px_10px_rgba(0,0,0,0.55)]">
            <h2 className="font-display text-2xl font-semibold leading-tight text-white xl:text-3xl">
              Anticipez les difficultes academiques avant qu'il ne soit trop tard
            </h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-white/90">
              ISI SUPTECH accompagne chaque etudiant du L1 au M2. Cette plateforme prolonge cet
              accompagnement en detectant tot les risques d'echec, pour que chaque promotion
              puisse un jour lever son diplome.
            </p>
          </div>
        </div>
      </div>

      {/* ====================================================== Formulaire */}
      <div className="bg-isi-bleu relative flex w-full flex-1 items-center justify-center overflow-hidden px-4 lg:w-1/2 xl:w-[45%]">
        <TrajectoryWatermark />

        <div className="light light-1"></div>
        <div className="light light-2"></div>

        <div className="glass-form relative z-10 w-full max-w-sm p-8 overflow-hidden">
          <div className="relative z-10">
            <div className="mb-6 flex justify-center lg:hidden">
              <Logo size={40} />
            </div>
            <h1 className="text-center font-display text-xl font-bold text-white drop-shadow-sm">Connexion</h1>
            <p className="mt-1 text-center text-sm text-cyan-100/90 font-medium">Connectez-vous avec votre adresse e-mail institutionnelle</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-semibold text-white/95">
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
            <div>
              <label htmlFor="mot_de_passe" className="mb-1 block text-sm font-semibold text-white/95">
                Mot de passe
              </label>
              <input
                id="mot_de_passe"
                type="password"
                autoComplete="current-password"
                required
                value={motDePasse}
                onChange={(e) => setMotDePasse(e.target.value)}
                className="input-glace"
              />
            </div>

            {error && (
              <p role="alert" className="rounded-lg bg-brique-600/30 border border-brique-400/50 px-3 py-2 text-sm font-medium text-red-100 shadow-sm backdrop-blur-md">
                {error}
              </p>
            )}

            <Button type="submit" disabled={submitting} className="w-full shadow-lg">
              {submitting ? "Connexion..." : "Se connecter"}
            </Button>
          </form>

          <div className="mt-5 flex items-center justify-between text-sm">
            <Link to="/mot-de-passe-oublie" className="font-semibold text-cyan-200 hover:text-white hover:underline transition-colors">
              Mot de passe oublie
            </Link>
            <Link to="/" className="font-medium text-white/75 hover:text-white hover:underline transition-colors">
              Retour a l'accueil
            </Link>
          </div>
        </div>
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
