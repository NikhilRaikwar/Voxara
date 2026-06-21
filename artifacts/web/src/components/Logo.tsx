interface LogoProps {
  className?: string;
}

// Voxara mark: a voice waveform ("vox") rendered as rounded equalizer bars
// inside a terracotta badge. Uses theme fill utilities so it adapts to the
// cream/terracotta palette.
export function Logo({ className = "" }: LogoProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      role="img"
      aria-label="Voxara"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="32" height="32" rx="8" className="fill-primary" />
      <g className="fill-primary-foreground">
        <rect x="5.7" y="12.5" width="2.6" height="7" rx="1.3" />
        <rect x="10.2" y="8.5" width="2.6" height="15" rx="1.3" />
        <rect x="14.7" y="4.5" width="2.6" height="23" rx="1.3" />
        <rect x="19.2" y="9.5" width="2.6" height="13" rx="1.3" />
        <rect x="23.7" y="12" width="2.6" height="8" rx="1.3" />
      </g>
    </svg>
  );
}
