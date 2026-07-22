const VARIANTS = {
  primary: "bg-encre-nocturne text-white hover:bg-encre-nocturne/90",
  secondary: "border border-encre-nocturne text-encre-nocturne hover:bg-encre-nocturne/5",
  destructive: "bg-brique-alerte text-white hover:bg-brique-alerte/90",
  ghost: "text-encre-nocturne hover:bg-encre-nocturne/5",
};

export default function Button({ variant = "primary", className = "", children, ...props }) {
  return (
    <button
      className={`focus-ring inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
