/**
 * Golden verified tick for the site's own profile (GiggleNode team) and for
 * admin accounts posting in the community. The shine animation lives in
 * globals.css (.tick-gold) and stops for visitors who prefer reduced motion.
 */
export default function OfficialTick({
  size = 15,
  label = "Official GiggleNode account",
}: {
  size?: number;
  label?: string;
}) {
  return (
    <span className="tick-gold shrink-0" style={{ width: size, height: size }} role="img" aria-label={label} title={label}>
      <svg viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="10.5" fill="currentColor" />
        <circle cx="12" cy="12" r="9" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="0.9" />
        <path
          d="M7.4 12.4l3.1 3.1 6-6.4"
          stroke="#fff"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
