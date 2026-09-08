import { useEffect, useState, useMemo } from "react";
import CoqueApplication from "../../components/AppShell.jsx";
import { navigationTechnicien } from "../../components/navigation.js";
import Card from "../../components/Card.jsx";
import client from "../../api/client.js";
import { DOMAINS_STRUCTURE } from "../../academicStructure.js";
import { Badge } from "../../components/ui/Primitives.jsx";

export default function TechnicienFilieres() {
  const [filieres, setFilieres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDomaine, setSelectedDomaine] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    client
      .get("/technicien/filieres")
      .then((res) => {
        setFilieres(res.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Détermination des niveaux pour chaque filière d'après le référentiel
  const filieresEnrichies = useMemo(() => {
    return filieres.map((f) => {
      let domaineTrouve = f.domaine || "Génie Informatique";
      let niveaux = ["L1", "L2", "L3"];

      for (const [domKey, domVal] of Object.entries(DOMAINS_STRUCTURE)) {
        if (domVal.filieres[f.code]) {
          domaineTrouve = domVal.label;
          niveaux = Object.keys(domVal.filieres[f.code].niveaux);
          break;
        }
      }

      return {
        ...f,
        domaine: domaineTrouve,
        niveaux,
      };
    });
  }, [filieres]);

  const domainesDisponibles = useMemo(() => {
    const setDom = new Set(filieresEnrichies.map((f) => f.domaine));
    return Array.from(setDom);
  }, [filieresEnrichies]);

  const filieresFiltrees = useMemo(() => {
    return filieresEnrichies.filter((f) => {
      const matchDomaine = selectedDomaine === "all" || f.domaine === selectedDomaine;
      const matchSearch =
        !search ||
        f.nom.toLowerCase().includes(search.toLowerCase()) ||
        f.code.toLowerCase().includes(search.toLowerCase());
      return matchDomaine && matchSearch;
    });
  }, [filieresEnrichies, selectedDomaine, search]);

  return (
    <CoqueApplication
      titre="Filières de Formation"
      sousTitre="Structure institutionnelle ISI SUPTECH organisée par Domaines et Niveaux"
      sectionsNavigation={navigationTechnicien()}
    >
      <div className="space-y-6">
        {/* Filtres par domaine et recherche */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-ardoise-200 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setSelectedDomaine("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedDomaine === "all"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-ardoise-100 text-ardoise-700 hover:bg-ardoise-200"
              }`}
            >
              Tous les domaines ({filieresEnrichies.length})
            </button>
            {domainesDisponibles.map((dom) => (
              <button
                key={dom}
                onClick={() => setSelectedDomaine(dom)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  selectedDomaine === dom
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-ardoise-100 text-ardoise-700 hover:bg-ardoise-200"
                }`}
              >
                {dom}
              </button>
            ))}
          </div>

          <div className="w-full md:w-64">
            <input
              type="text"
              placeholder="Rechercher une filière..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-1.5 text-sm rounded-lg border border-ardoise-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Tableau des filières */}
        <Card title={`Filières de formation (${filieresFiltrees.length})`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ardoise-200 text-xs font-semibold uppercase tracking-wider text-ardoise-500">
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Intitulé de la filière</th>
                  <th className="py-3 px-4">Domaine</th>
                  <th className="py-3 px-4">Niveaux d'études</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ardoise-100">
                {filieresFiltrees.map((f) => (
                  <tr key={f.id} className="hover:bg-ardoise-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-xs font-bold text-indigo-700">
                      <span className="inline-block px-2 py-0.5 bg-indigo-50 border border-indigo-200 rounded">
                        {f.code}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-encre-900">{f.nom}</td>
                    <td className="py-3.5 px-4 text-xs text-ardoise-600 font-medium">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-ardoise-100 text-ardoise-700">
                        {f.domaine}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1.5">
                        {f.niveaux.map((niv) => (
                          <span
                            key={niv}
                            className={`px-2 py-0.5 rounded text-xs font-semibold ${
                              niv.startsWith("M")
                                ? "bg-purple-100 text-purple-800"
                                : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            {niv}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && filieresFiltrees.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-sm text-ardoise-400">
                      Aucune filière ne correspond à vos critères.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </CoqueApplication>
  );
}
