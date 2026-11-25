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
      const safeUsers = db.users.map(
      ({ passwordHash, resetTokenHash, resetTokenExpiresAt, verifyTokenHash, verifyTokenExpiresAt, ...safe }) => safe,
    );
  // Owner logins are separate accounts; their hashes never leave the server.
  const safeOwners = (db.ownerAccounts ?? []).map(({ passwordHash, ...safe }) => safe);
  const settings = getSiteSettings(db);
  // Provider keys and the Google OAuth secret never leave the server in a backup.
  const safeSettings = {
    ...settings,
    aiSearch: { ...settings.aiSearch, apiKey: "" },
    security: { ...settings.security, googleClientSecret: "" },
  };
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
    settings: safeSettings,
    adminLog: db.adminLog ?? [],
    categories: db.categories ?? [],
    searchLogs: db.searchLogs ?? [],
    lastRankRecalc: db.lastRankRecalc ?? null,
    notifications: db.notifications ?? [],
    emailOutbox: db.emailOutbox ?? [],
    searchCache: db.searchCache ?? [],
    searchAiReports: db.searchAiReports ?? [],
    searchRequests: db.searchRequests ?? [],
    media: db.media ?? [],
    pages: db.pages ?? [],
    traffic: db.traffic ?? [],
    feedback: db.feedback ?? [],
    pointEvents: db.pointEvents ?? [],
    changelog: db.changelog ?? [],
    appPricing: db.appPricing ?? {},
    priceHistory: db.priceHistory ?? [],
    priceAlerts: db.priceAlerts ?? [],
    subscribers: db.subscribers ?? [],
    claimRequests: db.claimRequests ?? [],
    reviewReplies: db.reviewReplies ?? [],
    aiVisits: db.aiVisits ?? [],
    toolSubmissions: db.toolSubmissions ?? [],
    pricingReports: db.pricingReports ?? [],
    ownerAccounts: safeOwners,
    aiOwners: db.aiOwners ?? [],
    ownerRequests: db.ownerRequests ?? [],
    ownerChanges: db.ownerChanges ?? [],
  };

  const filename = `giglenode-backup-${new Date().toISOString().slice(0, 10)}.json`;
  return new Response(JSON.stringify(payload), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}
