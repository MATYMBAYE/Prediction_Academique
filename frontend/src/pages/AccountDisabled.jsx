import { Link, useNavigate, useLocation } from "react-router-dom";
import Logo from "../components/Logo.jsx";
import { useAuth } from "../context/AuthContext.jsx";

/**
 * Ecran dedie affiche quand le compte etudiant est desactive (§3.2).
 * Aucune donnee de note, d'assiduite ou de prediction n'est affichee ici.
 */
export default function AccountDisabled() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const motif = location.state?.motif;

  const handleLogout = () => {
    logout();
    navigate("/connexion", { replace: true });
  };

  return (
    <div className="bg-isi-bleu flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <div className="relative z-10 flex justify-center">
        <span className="inline-flex rounded-xl bg-white/90 p-2.5 shadow-md backdrop-blur-md">
          <Logo size={40} />
        </span>
      </div>
      <div className="glass-form relative z-10 mt-8 w-full max-w-md p-8">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brique-alerte/15 border border-brique-alerte/30">
          <span className="h-3 w-3 rounded-full bg-brique-alerte" aria-hidden="true" />
        </div>
        <h1 className="font-display text-lg font-semibold text-brique-700">Accès désactivé</h1>
        <div className="mt-3 text-sm text-encre-900 space-y-2">
          <p>Votre accès est actuellement désactivé.</p>
          {motif && <p><strong>Motif :</strong> {motif}</p>}
          <p>Veuillez contacter l'administration de l'établissement.</p>
        </div>
        <button
          onClick={handleLogout}
          className="focus-ring tap-target mt-6 rounded-md border border-encre-800 bg-white/60 px-4 py-2 text-sm font-medium text-encre-900 hover:bg-white/90 transition-all"
        >
          Se deconnecter
        </button>
      </div>
      <Link to="/" className="relative z-10 mt-6 text-sm font-medium text-white/80 hover:text-white hover:underline">
        Retour a l'accueil
      </Link>
    </div>
  );
}
