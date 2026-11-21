import { getCurrentUser } from "@/lib/auth";
import { getSiteSettings } from "@/lib/settings";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return new Response("Forbidden", { status: 403 });
  }

  const db = readDb();
  const safeUsers = db.users.map(({ passwordHash, resetTokenHash, resetTokenExpiresAt, ...safe }) => safe);
  const payload = {
    exportedAt: new Date().toISOString(),
    exportedBy: user.email,
    version: db.version,
    ai: db.ai,
    models: db.models,
    ratings: db.ratings,
    posts: db.posts,
    prompts: db.prompts,
    bookmarks: db.bookmarks,
    follows: db.follows,
    users: safeUsers,
    settings: getSiteSettings(db),
    adminLog: db.adminLog ?? [],
  };

  const filename = `giglenode-backup-${new Date().toISOString().slice(0, 10)}.json`;
  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}
