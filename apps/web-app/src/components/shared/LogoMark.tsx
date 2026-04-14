'use client';

interface LogoMarkProps {
  size?: number; // height in pixels, default 24
  className?: string;
}

// Just the diamond mark — three stacked diamonds in green gradient, no background.
// Use a stable unique ID per instance to avoid gradient conflicts when multiple marks
// appear on the same page.
export function LogoMark({ size = 24, className }: LogoMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 220 220"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Ledgerium"
    >
      <defs>
        <linearGradient id="logomark-gradient" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#20f2a6" />
          <stop offset="1" stopColor="#0adf92" />
        </linearGradient>
      </defs>
      <g
        stroke="url(#logomark-gradient)"
        strokeWidth="12"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M70 70 L110 45 L150 70 L110 95 Z" />
        <path d="M70 110 L110 85 L150 110 L110 135 Z" opacity="0.95" />
        <path d="M70 150 L110 125 L150 150 L110 175 Z" opacity="0.9" />
      </g>
    </svg>
  );
}

interface LogoFullProps {
  size?: number; // height of the mark in pixels, default 24
  className?: string;
}

// Full logo: mark + "Ledgerium AI" wordmark
export function LogoFull({ size = 24, className }: LogoFullProps) {
  return (
    <div className={`inline-flex items-center gap-2 ${className ?? ''}`}>
      <LogoMark size={size} />
      <span className="font-semibold text-[var(--content-primary)]" style={{ fontSize: size * 0.75 }}>
        Ledgerium <span className="text-brand-600">AI</span>
      </span>
    </div>
  );
}
