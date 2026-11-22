import { formatVotes } from "@/lib/format";
import { buildView } from "@/lib/rank";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

function escapeXml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

/**
 * Embeddable rating badge: /api/badge/<slug>.svg
 * Vendors put it on their own site, which links back here.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const clean = slug.replace(/\.svg$/i, "");
  const db = readDb();
  const ai = db.ai.find((row) => row.slug === clean && !row.hidden);
  if (!ai) {
    return new Response('<svg xmlns="http://www.w3.org/2000/svg" width="220" height="60"></svg>', {
      status: 404,
      headers: { "content-type": "image/svg+xml", "cache-control": "public, max-age=60" },
    });
  }

  const stat = buildView(db).aiStats.get(ai.id);
  const score = stat ? stat.score.toFixed(1) : "—";
  const votes = stat ? stat.votes : 0;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="250" height="64" viewBox="0 0 250 64" role="img" aria-label="${escapeXml(ai.name)} rated ${score} out of 5 on GigleNode">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#4F46E5"/>
      <stop offset="1" stop-color="#06b6d4"/>
    </linearGradient>
  </defs>
  <rect x="0.5" y="0.5" width="249" height="63" rx="12" fill="#ffffff" stroke="#e2e8f0"/>
  <rect x="10" y="12" width="40" height="40" rx="10" fill="url(#g)"/>
  <text x="30" y="39" font-family="system-ui,-apple-system,Segoe UI,sans-serif" font-size="20" text-anchor="middle" fill="#ffffff">★</text>
  <text x="60" y="27" font-family="system-ui,-apple-system,Segoe UI,sans-serif" font-size="11" font-weight="600" fill="#64748b">${escapeXml(ai.name.slice(0, 22))}</text>
  <text x="60" y="47" font-family="system-ui,-apple-system,Segoe UI,sans-serif" font-size="20" font-weight="700" fill="#0f172a">${score}<tspan font-size="11" font-weight="500" fill="#64748b"> / 5</tspan></text>
  <text x="150" y="47" font-family="system-ui,-apple-system,Segoe UI,sans-serif" font-size="11" fill="#64748b">${formatVotes(votes)} votes</text>
  <text x="150" y="27" font-family="system-ui,-apple-system,Segoe UI,sans-serif" font-size="9" font-weight="700" letter-spacing="0.08em" fill="#94a3b8">GIGLENODE</text>
</svg>`;

  return new Response(svg, {
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": "public, max-age=3600, s-maxage=3600",
      "access-control-allow-origin": "*",
    },
  });
}
