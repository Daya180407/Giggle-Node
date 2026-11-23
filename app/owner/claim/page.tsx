import OwnerClaimForm from "@/components/owner/OwnerClaimForm";
import { domainsForAi } from "@/lib/owners";
import { refreshDb } from "@/lib/store";

export const dynamic = "force-dynamic";

export const metadata = { title: "Claim your AI listing", robots: { index: false, follow: false } };

export default async function OwnerClaimPage() {
  const db = await refreshDb();
  const owned = new Set((db.aiOwners ?? []).map((row) => row.aiId));
  const ais = db.ai
    .filter((ai) => !ai.hidden && !owned.has(ai.id))
    .map((ai) => ({ id: ai.id, name: ai.name, domains: domainsForAi(ai) }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="mx-auto max-w-2xl">
      <OwnerClaimForm ais={ais} />
    </div>
  );
}
