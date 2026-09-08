import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import CoqueApplication from "../../components/AppShell.jsx";
import { navigationAdmin } from "../../components/navigation.js";
import Card from "../../components/Card.jsx";
import client from "../../api/client.js";

// Couleurs de statut du cahier des charges §2.2 - reservees exclusivement
// a la signalétique de risque (jamais decoratives ailleurs).
const RISK_COLORS = { faible: "#4C7A64", moyen: "#D98E3F", eleve: "#A83E32" };
const RISK_LABELS = { faible: "Risque faible", moyen: "Risque modere", eleve: "Risque eleve" };
const ACCENT = "#3D5A99"; // Indigo Trajectoire - accent pour series uniques (magnitude)

const tooltipStyle = { borderRadius: 8, borderColor: "#1B2A4A22", fontFamily: "Inter, sans-serif", fontSize: 12 };

function Legend({ items }) {
  return (
    <div className="mt-3 flex flex-wrap gap-4 text-sm">
      {items.map(({ color, label }) => (
        <span key={label} className="inline-flex items-center gap-1.5 text-encre-nocturne/80">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
          {label}
        </span>
      ))}
    </div>
  );
}

export default function AdminPredictionsStats() {
  const [stats, setStats] = useState(null);
  const [sortKey, setSortKey] = useState("probabilite_reussite");
  const [filterClasse, setFilterClasse] = useState("");

  useEffect(() => {
    client.get("/admin/predictions/stats").then(({ data }) => setStats(data));
  }, []);

  const risqueEleveList = useMemo(() => {
    if (!stats) return [];
    let list = [...stats.etudiants_a_risque_eleve];
    if (filterClasse) {
      list = list.filter((s) => s.classe?.toLowerCase().includes(filterClasse.toLowerCase()));
    }
    list.sort((a, b) => {
      if (sortKey === "nom") return a.nom.localeCompare(b.nom);
      return a.probabilite_reussite - b.probabilite_reussite;
    });
    return list;
  }, [stats, sortKey, filterClasse]);

  if (!stats) {
    return (
      <CoqueApplication titre="Gestion des predictions" sectionsNavigation={navigationAdmin()}>
        <p className="text-encre-nocturne/60">Chargement des statistiques...</p>
      </CoqueApplication>
    );
  }

  const pieData = [
    { key: "faible", value: stats.repartition_risque.faible },
    { key: "moyen", value: stats.repartition_risque.moyen },
    { key: "eleve", value: stats.repartition_risque.eleve },
  ];
  const totalEtudiants = pieData.reduce((sum, d) => sum + d.value, 0);

  return (
    <CoqueApplication
      titre="Gestion des predictions"
      sousTitre="Vue analytique du risque academique sur l'ensemble de l'etablissement"
      sectionsNavigation={navigationAdmin()}
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Repartition des risques">
          <div style={{ width: "100%", height: 240 }}>
            <ResponsiveContainer>
              <PieChart margin={{ top: 24, bottom: 8 }}>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="key"
                  cy="55%"
                  innerRadius={50}
                  outerRadius={78}
                  paddingAngle={2}
                  label={({ value }) => (totalEtudiants ? `${Math.round((value / totalEtudiants) * 100)}%` : "")}
                >
                  {pieData.map((d) => (
                    <Cell key={d.key} fill={RISK_COLORS[d.key]} stroke="#fff" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value, _name, entry) => [`${value} etudiant(s)`, RISK_LABELS[entry.payload.key]]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <Legend items={Object.entries(RISK_LABELS).map(([k, label]) => ({ color: RISK_COLORS[k], label }))} />
        </Card>

        <Card title="Evolution du taux de reussite predit">
          <div style={{ width: "100%", height: 220 }}>
            <ResponsiveContainer>
              <LineChart data={stats.evolution_semestre} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1B2A4A11" vertical={false} />
                <XAxis dataKey="semestre" tick={{ fontSize: 12, fill: "#1B2A4A99" }} axisLine={false} tickLine={false} />
                <YAxis
                  tickFormatter={(v) => `${Math.round(v * 100)}%`}
                  tick={{ fontSize: 12, fill: "#1B2A4A99" }}
                  axisLine={false}
                  tickLine={false}
                  width={40}
                />
                <Tooltip contentStyle={tooltipStyle} formatter={(value) => [`${(value * 100).toFixed(1)}%`, "Taux de reussite moyen"]} />
                <Line type="monotone" dataKey="taux_reussite_moyen" stroke={ACCENT} strokeWidth={2.5} dot={{ r: 4, fill: ACCENT }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-xs text-encre-nocturne/50">
            Moyenne des predictions enregistrees pour chaque semestre (S1 a S10).
          </p>
        </Card>

        <Card title="Repartition du risque par filiere">
          <div style={{ width: "100%", height: 220 }}>
            <ResponsiveContainer>
              <BarChart data={stats.par_filiere} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1B2A4A11" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12, fill: "#1B2A4A99" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="filiere" tick={{ fontSize: 12, fill: "#1B2A4A" }} axisLine={false} tickLine={false} width={90} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="faible" stackId="risque" fill={RISK_COLORS.faible} radius={[0, 0, 0, 0]} />
                <Bar dataKey="moyen" stackId="risque" fill={RISK_COLORS.moyen} />
                <Bar dataKey="eleve" stackId="risque" fill={RISK_COLORS.eleve} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <Legend items={Object.entries(RISK_LABELS).map(([k, label]) => ({ color: RISK_COLORS[k], label }))} />
        </Card>

        <Card title="Repartition du risque par niveau (L1 a M2)">
          <div style={{ width: "100%", height: 220 }}>
            <ResponsiveContainer>
              <BarChart data={stats.par_niveau} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1B2A4A11" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12, fill: "#1B2A4A99" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="niveau" tick={{ fontSize: 12, fill: "#1B2A4A" }} axisLine={false} tickLine={false} width={40} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="faible" stackId="risque" fill={RISK_COLORS.faible} />
                <Bar dataKey="moyen" stackId="risque" fill={RISK_COLORS.moyen} />
                <Bar dataKey="eleve" stackId="risque" fill={RISK_COLORS.eleve} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <Legend items={Object.entries(RISK_LABELS).map(([k, label]) => ({ color: RISK_COLORS[k], label }))} />
        </Card>
      </div>

      <div className="mt-4">
        <Card title="Taux d'assiduite moyen par classe">
          <div style={{ width: "100%", height: 240 }}>
            <ResponsiveContainer>
              <BarChart data={stats.taux_assiduite_par_classe} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1B2A4A11" vertical={false} />
                <XAxis dataKey="classe" tick={{ fontSize: 11, fill: "#1B2A4A99" }} axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={50} />
                <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 12, fill: "#1B2A4A99" }} axisLine={false} tickLine={false} width={40} />
                <Tooltip contentStyle={tooltipStyle} formatter={(value) => [`${value}%`, "Taux moyen"]} />
                <Bar dataKey="taux_moyen" fill={ACCENT} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="mt-4">
        <Card
          title="Etudiants a risque eleve"
          actions={
            <div className="flex gap-2">
              <input
                type="search"
                placeholder="Filtrer par classe..."
                value={filterClasse}
                onChange={(e) => setFilterClasse(e.target.value)}
                className="focus-ring rounded-md border border-encre-nocturne/20 px-3 py-1.5 text-sm"
              />
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value)}
                className="focus-ring rounded-md border border-encre-nocturne/20 px-2 py-1.5 text-sm"
              >
                <option value="probabilite_reussite">Trier par probabilite</option>
                <option value="nom">Trier par nom</option>
              </select>
            </div>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px] text-left text-sm">
              <thead>
                <tr className="border-b border-encre-nocturne/10 text-encre-nocturne/60">
                  <th className="py-2 font-medium">Etudiant</th>
                  <th className="py-2 font-medium">Classe</th>
                  <th className="py-2 font-medium">Probabilite de reussite</th>
                  <th className="py-2 font-medium">Fiche</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-encre-nocturne/10">
                {risqueEleveList.map((s) => (
                  <tr key={s.student_id}>
                    <td className="py-2">{s.prenom} {s.nom}</td>
                    <td className="py-2 text-encre-nocturne/70">{s.classe ?? "-"}</td>
                    <td className="tabular py-2 text-brique-alerte">{(s.probabilite_reussite * 100).toFixed(0)}%</td>
                    <td className="py-2">
                      <Link to={`/admin/etudiants/${s.student_id}`} className="text-indigo-trajectoire hover:underline">
                        Voir la fiche
                      </Link>
                    </td>
                  </tr>
                ))}
                {risqueEleveList.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-encre-nocturne/50">
                      Aucun etudiant a risque eleve pour le moment.
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
