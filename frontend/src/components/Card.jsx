export default function Card({ title, children, className = "", actions, ...rest }) {
  return (
    <div className={`rounded-card bg-white shadow-card p-5 ${className}`} {...rest}>
      {(title || actions) && (
        <div className="mb-3 flex items-center justify-between">
          {title && <h3 className="font-display text-lg font-semibold text-encre-nocturne">{title}</h3>}
          {actions}
        </div>
      )}
      {children}
    </div>
  );
}
