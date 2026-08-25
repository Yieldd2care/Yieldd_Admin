import { RadialGlow } from '../ui/RadialGlow';

/** The two-circle blue glow used behind every navy hero-moment screen (Auth, Fork, FirstScanPrompt, EventComplete). */
export function NavyGlowBackdrop() {
  return (
    <>
      <RadialGlow color="#1D3F8A" size={520} style={{ top: -220, left: '50%', marginLeft: -260 }} />
      <RadialGlow color="#1D3F8A" size={280} style={{ top: -60, left: '50%', marginLeft: -140 }} />
    </>
  );
}
