type LogoMarkProps = { className?: string }

export function LogoMark({ className }: LogoMarkProps) {
  return (
    <svg viewBox="6 4 53 79" fill="none" aria-hidden="true" className={className}>
      <line
        x1="13"
        y1="76"
        x2="47"
        y2="76"
        stroke="currentColor"
        strokeWidth="10"
        strokeLinecap="round"
      />
      <line
        x1="30"
        y1="76"
        x2="30"
        y2="42"
        stroke="currentColor"
        strokeWidth="10"
        strokeLinecap="round"
      />
      <line
        x1="30"
        y1="42"
        x2="52"
        y2="11"
        stroke="currentColor"
        strokeWidth="10"
        strokeLinecap="round"
      />
      <circle cx="30" cy="42" r="8" fill="currentColor" />
    </svg>
  )
}

export function Logo({ className }: LogoMarkProps) {
  return (
    <span className={`inline-flex items-end gap-1 ${className ?? ''}`}>
      <LogoMark className="h-4 w-4 text-accent" />
      <span className="font-mono text-sm tracking-tight text-text">peaje</span>
    </span>
  )
}
