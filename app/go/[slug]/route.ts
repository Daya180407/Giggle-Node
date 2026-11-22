import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { recordAiVisit } from "@/lib/community";
import { mutateDb, readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * Public Visit button target: counts the click for the "most visited" dashboard,
 * marks a signed-in user as a verified user of this tool, and then forwards to the
 * affiliate link (when an admin set one) or the official site.
 */
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  void request;
  const db = readDb();
  const ai = db.ai.find((a) => a.slug === slug);
  if (!ai || ai.hidden) redirect("/");

  const user = await getCurrentUser();

  mutateDb((draft) => {
    const row = draft.ai.find((a) => a.id === ai.id);
    if (row) row.visits = (row.visits || 0) + 1;
    if (user) recordAiVisit(draft, user.id, ai.id);
  });

  const raw = ai.affiliateUrl || ai.website || "/";
  // Never redirect to a non-web scheme (javascript:, data:) even if old data contains one.
  const target = raw === "/" || /^https?:\/\//i.test(raw) ? raw : "/";
  redirect(target);
}
