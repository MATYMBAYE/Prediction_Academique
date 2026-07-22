import Button from "./Button.jsx";

export default function Pagination({ page, pages, total, onPageChange }) {
  if (!pages || pages <= 1) return null;

  return (
    <div className="mt-4 flex items-center justify-between text-sm text-encre-nocturne/70">
      <span>
        Page {page} / {pages} ({total} resultats)
      </span>
      <div className="flex gap-2">
        <Button variant="secondary" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Precedent
        </Button>
        <Button variant="secondary" disabled={page >= pages} onClick={() => onPageChange(page + 1)}>
          Suivant
        </Button>
      </div>
    </div>
  );
}
