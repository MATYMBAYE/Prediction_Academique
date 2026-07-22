import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-brume-academique px-4 text-center">
      <h1 className="font-display text-2xl font-semibold text-encre-nocturne">Page introuvable</h1>
      <p className="text-encre-nocturne/70">La page que vous cherchez n'existe pas ou plus.</p>
      <Link to="/" className="text-indigo-trajectoire hover:underline">Retour a l'accueil</Link>
    </div>
  );
}
