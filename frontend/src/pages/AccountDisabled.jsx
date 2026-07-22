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
    <div className="flex min-h-screen flex-col items-center justify-center bg-brume-academique px-4 text-center">
      <Logo size={40} />
      <div className="mt-8 max-w-md rounded-card bg-white p-8 shadow-card">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brique-alerte/10">
          <span className="h-3 w-3 rounded-full bg-brique-alerte" aria-hidden="true" />
        </div>
        <h1 className="font-display text-lg font-semibold text-brique-alerte">Accès désactivé</h1>
        <div className="mt-3 text-sm text-encre-nocturne/80 space-y-2">
          <p>Votre accès est actuellement désactivé.</p>
          {motif && <p><strong>Motif :</strong> {motif}</p>}
          <p>Veuillez contacter l'administration de l'établissement.</p>
        </div>
        <button
          onClick={handleLogout}
          className="focus-ring tap-target mt-6 rounded-md border border-encre-nocturne px-4 py-2 text-sm font-medium text-encre-nocturne hover:bg-encre-nocturne/5"
        >
          Se deconnecter
        </button>
      </div>
      <Link to="/" className="mt-6 text-sm text-encre-nocturne/60 hover:underline">
        Retour a l'accueil
      </Link>
    </div>
  );
}
