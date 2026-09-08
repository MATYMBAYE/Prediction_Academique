import { useState, useEffect } from "react";
import {
  DOMAINS_STRUCTURE,
  getDomainesOptions,
  getFilieresForDomaine,
  getNiveauxForFiliere,
  getMatieresForFiliereAndNiveau,
} from "../../academicStructure.js";

/**
 * Composant de sélection en cascade dépendant :
 * Domaine -> Filière -> Niveau -> Matière
 */
export default function AcademicCascadeSelect({
  value = {},
  onChange,
  showMatiere = true,
  showDomaine = true,
  layout = "grid", // "grid" | "stacked" | "inline"
  disabled = false,
  required = false,
  customMatiereOptions = null, // Liste optionnelle venant de la BDD
}) {
  const [domaine, setDomaine] = useState(value.domaine || "");
  const [filiere, setFiliere] = useState(value.filiere || "");
  const [niveau, setNiveau] = useState(value.niveau || "");
  const [matiere, setMatiere] = useState(value.matiere || "");

  // Synchronisation avec les props externes
  useEffect(() => {
    if (value.domaine !== undefined && value.domaine !== domaine) setDomaine(value.domaine);
    if (value.filiere !== undefined && value.filiere !== filiere) setFiliere(value.filiere);
    if (value.niveau !== undefined && value.niveau !== niveau) setNiveau(value.niveau);
    if (value.matiere !== undefined && value.matiere !== matiere) setMatiere(value.matiere);
  }, [value]);

  const domaines = getDomainesOptions();
  const filieres = getFilieresForDomaine(domaine);
  const niveaux = getNiveauxForFiliere(filiere);
  const matieres = customMatiereOptions || getMatieresForFiliereAndNiveau(filiere, niveau);

  const handleDomaineChange = (newDomaine) => {
    setDomaine(newDomaine);
    setFiliere("");
    setNiveau("");
    setMatiere("");
    if (onChange) {
      onChange({ domaine: newDomaine, filiere: "", niveau: "", matiere: "" });
    }
  };

  const handleFiliereChange = (newFiliere) => {
    setFiliere(newFiliere);
    setNiveau("");
    setMatiere("");
    if (onChange) {
      onChange({ domaine, filiere: newFiliere, niveau: "", matiere: "" });
    }
  };

  const handleNiveauChange = (newNiveau) => {
    setNiveau(newNiveau);
    setMatiere("");
    if (onChange) {
      onChange({ domaine, filiere, niveau: newNiveau, matiere: "" });
    }
  };

  const handleMatiereChange = (newMatiere) => {
    setMatiere(newMatiere);
    if (onChange) {
      onChange({ domaine, filiere, niveau, matiere: newMatiere });
    }
  };

  const gridClass = layout === "grid"
    ? `grid grid-cols-1 gap-3 ${showMatiere ? (showDomaine ? "sm:grid-cols-4" : "sm:grid-cols-3") : (showDomaine ? "sm:grid-cols-3" : "sm:grid-cols-2")}`
    : layout === "inline"
    ? "flex flex-wrap items-center gap-3"
    : "space-y-3";

  return (
    <div className={gridClass}>
      {/* 1. Domaine */}
      {showDomaine && (
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-ardoise-600 mb-1">
            Domaine {required && <span className="text-red-500">*</span>}
          </label>
          <select
            value={domaine}
            onChange={(e) => handleDomaineChange(e.target.value)}
            disabled={disabled}
            className="w-full rounded-lg border border-ardoise-300 bg-white px-3 py-2 text-sm text-encre-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-ardoise-100 disabled:cursor-not-allowed"
          >
            <option value="">-- Choisir un domaine --</option>
            {domaines.map((d) => (
              <option key={d.value} value={d.value}>
                {d.icon} {d.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* 2. Filière */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-ardoise-600 mb-1">
          Filière {required && <span className="text-red-500">*</span>}
        </label>
        <select
          value={filiere}
          onChange={(e) => handleFiliereChange(e.target.value)}
          disabled={disabled || (showDomaine && !domaine)}
          className="w-full rounded-lg border border-ardoise-300 bg-white px-3 py-2 text-sm text-encre-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-ardoise-100 disabled:cursor-not-allowed"
        >
          <option value="">-- Choisir une filière --</option>
          {filieres.map((f) => (
            <option key={f.code} value={f.code}>
              {f.nom} ({f.code})
            </option>
          ))}
        </select>
      </div>

      {/* 3. Niveau */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-ardoise-600 mb-1">
          Niveau {required && <span className="text-red-500">*</span>}
        </label>
        <select
          value={niveau}
          onChange={(e) => handleNiveauChange(e.target.value)}
          disabled={disabled || !filiere}
          className="w-full rounded-lg border border-ardoise-300 bg-white px-3 py-2 text-sm text-encre-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-ardoise-100 disabled:cursor-not-allowed"
        >
          <option value="">-- Choisir un niveau --</option>
          {niveaux.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>

      {/* 4. Matière */}
      {showMatiere && (
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-ardoise-600 mb-1">
            Matière {required && <span className="text-red-500">*</span>}
          </label>
          <select
            value={matiere}
            onChange={(e) => handleMatiereChange(e.target.value)}
            disabled={disabled || !niveau}
            className="w-full rounded-lg border border-ardoise-300 bg-white px-3 py-2 text-sm text-encre-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-ardoise-100 disabled:cursor-not-allowed"
          >
            <option value="">-- Choisir une matière --</option>
            {matieres.map((m) => (
              <option key={typeof m === "string" ? m : m.code || m.nom} value={typeof m === "string" ? m : m.nom}>
                {typeof m === "string"
                  ? m
                  : `${m.nom} ${m.coeff ? `(Coeff ${m.coeff})` : ""} ${m.type ? `[${m.type}]` : ""}`}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
