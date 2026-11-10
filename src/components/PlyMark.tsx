export function PlyMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <rect x="1.5" y="13.5" width="15" height="7" rx="2" fill="#24304f" />
      <rect x="4.5" y="9" width="15" height="7" rx="2" fill="#141c33" stroke="#24304f" />
      <rect x="7.5" y="4.5" width="15" height="7" rx="2" fill="#2f6bff" />
    </svg>
  );
}
