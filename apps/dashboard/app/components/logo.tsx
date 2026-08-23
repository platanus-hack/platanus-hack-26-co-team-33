type LogoMarkProps = { className?: string }

export function LogoMark({ className }: LogoMarkProps) {
  return (
    <svg viewBox="0 0 96 96" fill="none" aria-hidden="true" className={className}>
      <line
        x1="30"
        y1="72"
        x2="30"
        y2="46"
        stroke="currentColor"
        strokeWidth="10"
        strokeLinecap="round"
      />
      <line
        x1="30"
        y1="46"
        x2="70"
        y2="24"
        stroke="currentColor"
        strokeWidth="10"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function Logo({ className }: LogoMarkProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ''}`}>
      <LogoMark className="h-4 w-4 text-accent" />
      <span className="font-mono text-sm tracking-tight text-text">peaje</span>
    </span>
  )
}
