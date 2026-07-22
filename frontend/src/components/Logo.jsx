export default function Logo({ size = 32 }) {
  return (
    <span className="inline-flex items-center gap-2">
      <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
        <rect width="64" height="64" rx="12" fill="#1B2A4A" />
        <path
          d="M10 44 L24 34 L34 40 L54 16"
          stroke="#3D5A99"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="54" cy="16" r="4" fill="#4C7A64" />
      </svg>
      <span className="font-display text-base font-semibold text-encre-nocturne">ISI-SUPETCH</span>
    </span>
  );
}
