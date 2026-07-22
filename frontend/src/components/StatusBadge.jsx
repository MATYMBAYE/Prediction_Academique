const RISK_STYLES = {
  faible: { bg: "bg-sauge-reussite/10", text: "text-sauge-reussite", dot: "bg-sauge-reussite", label: "Risque faible" },
  moyen: { bg: "bg-ambre-vigilance/10", text: "text-ambre-vigilance", dot: "bg-ambre-vigilance", label: "Risque modere" },
  eleve: { bg: "bg-brique-alerte/10", text: "text-brique-alerte", dot: "bg-brique-alerte", label: "Risque eleve" },
  inconnu: { bg: "bg-gray-100", text: "text-gray-500", dot: "bg-gray-400", label: "Pas encore evalue" },
};

const ACCOUNT_STYLES = {
  actif: { bg: "bg-sauge-reussite/10", text: "text-sauge-reussite", dot: "bg-sauge-reussite", label: "Actif" },
  inactif: { bg: "bg-brique-alerte/10", text: "text-brique-alerte", dot: "bg-brique-alerte", label: "Inactif" },
};

export function RiskBadge({ level }) {
  const s = RISK_STYLES[level] || RISK_STYLES.inconnu;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${s.bg} ${s.text}`}>
      <span className={`h-2 w-2 rounded-full ${s.dot}`} aria-hidden="true" />
      {s.label}
    </span>
  );
}

export function AccountStatusBadge({ status }) {
  const s = ACCOUNT_STYLES[status] || ACCOUNT_STYLES.inactif;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${s.bg} ${s.text}`}>
      <span className={`h-2 w-2 rounded-full ${s.dot}`} aria-hidden="true" />
      {s.label}
    </span>
  );
}
