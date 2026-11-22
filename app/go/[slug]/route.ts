import { redirect } from "next/navigation";
import { mutateDb, readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * Public Visit button target: counts the click for the "most visited" dashboard
 * and then forwards to the affiliate link (when an admin set one) or the official site.
 */
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = readDb();
  const ai = db.ai.find((a) => a.slug === slug);
  if (!ai || ai.hidden) redirect("/");

  void request;
  mutateDb((draft) => {
    const row = draft.ai.find((a) => a.id === ai.id);
    if (row) row.visits = (row.visits || 0) + 1;
  });

  const target = ai.affiliateUrl || ai.website || "/";
  redirect(target);
}
