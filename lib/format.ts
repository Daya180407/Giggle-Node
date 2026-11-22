/** Compact public vote label: 5M+, 840K+, 9,400. */
export function formatVotes(votes: number): string {
  if (!Number.isFinite(votes) || votes <= 0) return "0";
  // Floor instead of round so 5.9M never prints as "6M+".
  const trim = (value: number) => {
    const floored = Math.floor(value * 10) / 10;
    return floored >= 10 ? String(Math.floor(floored)) : String(floored);
  };
  if (votes >= 1_000_000) return `${trim(votes / 1_000_000)}M+`;
  if (votes >= 1_000) return `${trim(votes / 1_000)}K+`;
  return Math.round(votes).toLocaleString("en-US");
}
