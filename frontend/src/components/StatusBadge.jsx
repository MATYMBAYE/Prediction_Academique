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

const TREATMENT_STYLES = {
  nouvelle: { bg: "bg-brique-50", text: "text-brique-700", dot: "bg-brique-500", label: "Nouvelle" },
  en_cours: { bg: "bg-ambre-50", text: "text-ambre-700", dot: "bg-ambre-500", label: "En cours" },
  traitee: { bg: "bg-emeraude-50", text: "text-emeraude-700", dot: "bg-emeraude-500", label: "Traitée" },
};

export function RiskBadge({ level, risk }) {
  const s = RISK_STYLES[level || risk] || RISK_STYLES.inconnu;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.bg} ${s.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} aria-hidden="true" />
      {s.label}
    </span>
  );
}

export function AccountStatusBadge({ status }) {
  const s = ACCOUNT_STYLES[status] || ACCOUNT_STYLES.inactif;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.bg} ${s.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} aria-hidden="true" />
      {s.label}
    </span>
  );
}

export function TreatmentStatusBadge({ status }) {
  const s = TREATMENT_STYLES[status] || TREATMENT_STYLES.nouvelle;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.bg} ${s.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} aria-hidden="true" />
      {s.label}
    </span>
  );
}
