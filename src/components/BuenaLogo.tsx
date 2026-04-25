export function BuenaLogo({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Buena"
    >
      <path
        d="M8 4 H24 Q28 4 28 8 V12 Q28 16 24 16 Q28 16 28 20 V24 Q28 28 24 28 H8 Q4 28 4 24 V20 Q4 16 8 16 Q4 16 4 12 V8 Q4 4 8 4 Z"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
      <circle cx="16" cy="16" r="2.5" fill="currentColor" opacity="0.6" />
    </svg>
  );
}
