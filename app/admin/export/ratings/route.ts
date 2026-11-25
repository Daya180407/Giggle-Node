import { getCurrentUser } from "@/lib/auth";
import { toCsv } from "@/lib/csv";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return new Response("Forbidden", { status: 403 });
  }

  const db = readDb();
  const aiById = new Map(db.ai.map((ai) => [ai.id, ai]));
  const modelById = new Map(db.models.map((model) => [model.id, model]));
  const userById = new Map(db.users.map((row) => [row.id, row]));

  const rows: (string | number)[][] = [
    ["ai", "model", "category", "user", "email", "stars", "status", "review", "created_at", "scope"],
  ];
  for (const rating of db.ratings) {
    const model = rating.modelId ? modelById.get(rating.modelId) : undefined;
    // Overall ratings point at the AI directly; "scope" keeps them distinguishable in the export.
    const ai = model ? aiById.get(model.aiId) : rating.aiId ? aiById.get(rating.aiId) : undefined;
    const reviewer = userById.get(rating.userId);
    rows.push([
      ai?.name ?? "",
      model?.name ?? "",
      ai?.category ?? "",
      reviewer?.name ?? rating.userId,
      reviewer?.email ?? "",
      rating.stars,
      rating.status ?? "approved",
      rating.review ?? "",
      rating.createdAt,
      rating.modelId ? "model" : "overall",
    ]);
  }

  const filename = `gigglenode-ratings-${new Date().toISOString().slice(0, 10)}.csv`;
  return new Response(`\uFEFF${toCsv(rows)}`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}
