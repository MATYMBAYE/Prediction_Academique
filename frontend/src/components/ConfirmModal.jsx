import { useState } from "react";
import Button from "./Button.jsx";

/**
 * Modale de confirmation pour l'activation/desactivation de compte.
 * Exige une confirmation explicite + un motif pour toute desactivation
 * (cahier des charges §5.4).
 */
export default function ConfirmModal({ open, title, description, requireMotif, motifOptions, confirmLabel, onConfirm, onCancel, variant = "destructive" }) {
  const [motif, setMotif] = useState(motifOptions?.[0] ?? "");
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await onConfirm(requireMotif ? motif : undefined);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-card bg-white p-6 shadow-card">
        <h3 className="font-display text-lg font-semibold text-encre-nocturne">{title}</h3>
        <p className="mt-2 text-sm text-encre-nocturne/80">{description}</p>

        {requireMotif && (
          <div className="mt-4">
            <label htmlFor="motif" className="mb-1 block text-sm font-medium text-encre-nocturne">
              Motif
            </label>
            <select
              id="motif"
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              className="focus-ring w-full rounded-md border border-encre-nocturne/20 px-3 py-2 text-sm"
            >
              {(motifOptions || ["Non-paiement des frais de scolarite", "Autre decision administrative"]).map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={onCancel} disabled={submitting}>
            Annuler
          </Button>
          <Button variant={variant} onClick={handleConfirm} disabled={submitting}>
            {submitting ? "Traitement..." : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
