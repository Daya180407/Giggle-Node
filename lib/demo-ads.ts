import { getCategories } from "./categories";
import { buildView, rankedAis } from "./rank";
import { allApps } from "./software";
import { sponsorPrices } from "./sponsors";
import type { Ai, ChatAd, DB, SponsorPlacement, SponsorSlotKey } from "./types";

/**
 * Demo ads.
 *
 * The owner asked to see every ad product on the live site, so the seed installs
 * one labelled demo of each type: the trending card, a top-3 podium card in
 * every category, a card after every fifth row up to #50, a mobile app and a
 * desktop software placement, plus two sponsored chat campaigns (AI + app).
 *
 * Every demo row carries `demo: true` and a clear name/note, and can be removed
 * in one click from /admin/ads. `demoAdsSeededAt` is kept after removal so the
 * rows are never silently re-added; `demoAdsVersion` lets a later release add
 * the new slots once without touching the old demo rows.
 */

/** Bump when the demo set changes, so existing installs receive the new rows. */
export const DEMO_ADS_VERSION = 2;

function demoId(prefix: string): string {
  return `${prefix}_demo_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

function demoToken(): string {
  return `demorep_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

export const DEMO_AD_NOTE = "Demo ad — remove from /admin/ads with “Remove demo ads”.";

export function seedDemoAds(db: DB): boolean {
  if (db.demoAdsSeededAt && (db.demoAdsVersion ?? 1) >= DEMO_ADS_VERSION) return false;
  const ais = db.ai.filter((row) => !row.hidden);
  if (ais.length === 0) return false;

  // Skip the leaders so the demo cards do not sit on the same tools that already
  // occupy the top of every list.
  const offset = Math.min(6, Math.max(0, ais.length - 1));
  const pick = (index: number) => ais[(offset + index) % ais.length];
  const prices = sponsorPrices(db);
  const now = new Date().toISOString();
  const existing = db.sponsorPlacements ?? [];
  const placements: SponsorPlacement[] = [];

  const addAiPlacement = (ai: Ai, listKey: string, slot: SponsorSlotKey, views: number, clicks: number) => {
    const duplicate = existing.some(
      (row) =>
        row.targetType === "ai" &&
        row.targetId === ai.id &&
        row.listKey === listKey &&
        row.slot === slot,
    );
    if (duplicate) return;
    placements.push({
      id: demoId("sp"),
      targetType: "ai",
      targetId: ai.id,
      targetName: ai.name,
      targetSlug: ai.slug,
      listKey,
      slot,
      amount: prices[slot] ?? 0,
      until: null,
      active: true,
      note: DEMO_AD_NOTE,
      views,
      clicks,
      reportToken: demoToken(),
      createdAt: now,
      demo: true,
    });
  };

  addAiPlacement(pick(0), "trending", "trending", 1842, 57);
  addAiPlacement(pick(1), pick(1).category, "top3", 1510, 44);
  addAiPlacement(pick(2), "all", "list5", 2230, 61);
  addAiPlacement(pick(3), "all", "list10", 1360, 29);
  addAiPlacement(pick(4), "all", "list15", 980, 18);
  addAiPlacement(pick(7), "all", "list20", 910, 17);
  addAiPlacement(pick(8), "all", "list25", 860, 15);
  addAiPlacement(pick(9), "all", "list30", 790, 13);
  addAiPlacement(pick(10), "all", "list35", 730, 12);
  addAiPlacement(pick(11), "all", "list40", 690, 10);
  addAiPlacement(pick(12), "all", "list45", 660, 9);
  addAiPlacement(pick(5), "all", "list50", 640, 9);

  // A podium card in each category, so the champions section shows a paid card
  // on every tab. The 4th ranked tool is used so no demo repeats a champion.
  const view = buildView(db);
  for (const category of getCategories(db)) {
    const alreadyBooked = existing.some(
      (row) => row.targetType === "ai" && row.listKey === category.slug && row.slot === "top3",
    );
    if (alreadyBooked) continue;
    const fourth = rankedAis(view, category.slug)[3];
    if (fourth) addAiPlacement(fourth.ai, category.slug, "top3", 1200, 32);
  }

  const apps = allApps(db.customApps);
  const addAppPlacement = (
    app: (typeof apps)[number] | undefined,
    slot: SponsorSlotKey,
    views: number,
    clicks: number,
  ) => {
    if (!app) return;
    const duplicate = existing.some(
      (row) =>
        row.targetType === "app" &&
        row.targetId === app.slug &&
        row.listKey === app.kind &&
        row.slot === slot,
    );
    if (duplicate) return;
    placements.push({
      id: demoId("sp"),
      targetType: "app",
      targetId: app.slug,
      targetName: app.name,
      targetSlug: app.slug,
      listKey: app.kind,
      slot,
      amount: prices[slot] ?? 0,
      until: null,
      active: true,
      note: DEMO_AD_NOTE,
      views,
      clicks,
      reportToken: demoToken(),
      createdAt: now,
      demo: true,
    });
  };
  addAppPlacement(apps.find((app) => app.kind === "mobile"), "list5", 720, 22);
  addAppPlacement(apps.find((app) => app.kind === "desktop"), "list10", 510, 11);

  if (placements.length) db.sponsorPlacements = [...existing, ...placements];

  const cpm = Number(db.chatAdCpm) > 0 ? Math.round(Number(db.chatAdCpm)) : 200;
  const chatAds: ChatAd[] = [];
  const chatAi = pick(6);
  chatAds.push({
    id: demoId("cad"),
    name: "Demo — Chat campaign (AI tool)",
    advertiserEmail: "demo@giglenode.com",
    targetType: "ai",
    targetId: chatAi.id,
    targetName: chatAi.name,
    targetSlug: chatAi.slug,
    headline: `Demo: ${chatAi.name} sponsored chat card`,
    body: "This is a demo sponsored card. Its views and clicks show up in the advertiser report.",
    ctaLabel: "Visit demo",
    url: chatAi.website || `/ai/${chatAi.slug}`,
    cpm,
    viewsPurchased: 50000,
    viewsServed: 1340,
    clicks: 41,
    until: null,
    active: true,
    reportToken: demoToken(),
    createdAt: now,
    createdBy: "Demo seed",
    demo: true,
  });
  const chatApp = apps.find((app) => app.kind === "mobile");
  if (chatApp) {
    chatAds.push({
      id: demoId("cad"),
      name: "Demo — Chat campaign (app)",
      advertiserEmail: "demo@giglenode.com",
      targetType: "app",
      targetId: chatApp.slug,
      targetName: chatApp.name,
      targetSlug: chatApp.slug,
      headline: `Demo: ${chatApp.name} sponsored chat card`,
      body: "A second demo card, so you can see two campaigns rotate in the same room.",
      ctaLabel: "See app",
      url: chatApp.affiliateUrl || chatApp.website || "/#apps",
      cpm,
      viewsPurchased: 30000,
      viewsServed: 860,
      clicks: 19,
      until: null,
      active: true,
      reportToken: demoToken(),
      createdAt: now,
      createdBy: "Demo seed",
      demo: true,
    });
  }
  db.chatAds = [...(db.chatAds ?? []), ...chatAds];

  // Demo messages come from the site's own demo profile, so they carry the
  // golden official tick. Older seeds are upgraded here too.
  for (const row of db.communityMessages ?? []) {
    if (row.demo) row.official = true;
  }

  // Chat ads sit after every 20 messages, so an empty room would hide the demo.
  // A labelled demo conversation fills the pinned Everyone room just enough to
  // show the card; the cleanup button removes these rows too.
  const demoRoom = { aiId: "__all__", roomId: "__universal__" };
  const roomMessages = (db.communityMessages ?? []).filter(
    (row) => row.aiId === demoRoom.aiId && (row.roomId ?? null) === demoRoom.roomId,
  );
  if (roomMessages.length < 21) {
    const lines = [
      "Welcome to the community demo — this room shows how sponsored chat cards look.",
      "Ask anything about AI tools here. Every room has its own conversation.",
      "Which AI do you use for writing first drafts?",
      "I compare two tools before paying for either — the ratings help.",
      "Voice notes and screenshots are supported in this room.",
      "Tips: rate a tool after you actually use it.",
      "The leaderboard is weighted, so a few 5★ votes cannot buy the top spot.",
      "Does anyone use an AI for spreadsheet formulas?",
      "Try the blind arena if you want to compare without brand names.",
      "Pricing pages change often — check the plan table before subscribing.",
      "A free plan is enough for most weekend projects.",
      "What is the best tool for short product videos?",
      "I keep a shortlist in My List and test one each week.",
      "Reports go straight to the moderators, and every report is reviewed.",
      "Community rules: be respectful, no spam links.",
      "Someone should compare the image models on the same prompt.",
      "The compare page puts two tools side by side.",
      "I like that paid placements are always labelled.",
      "What are you building this week?",
      "This is the 20th demo message — a sponsored card should appear right below.",
      "That sponsored card is a demo; its report shows views and clicks.",
    ];
    const base = Date.now() - lines.length * 60000;
    const demoMessages = lines.map((body, index) => ({
      id: `cm_demo_${index}`,
      aiId: demoRoom.aiId,
      roomId: demoRoom.roomId,
      userId: "demo_member",
      userName: "GigleNode Demo",
      avatar: "D",
      body,
      kind: "text" as const,
      attachment: null,
      createdAt: new Date(base + index * 60000).toISOString(),
      demo: true,
      official: true,
    }));
    db.communityMessages = [...(db.communityMessages ?? []), ...demoMessages];
    if (!Array.isArray(db.communityMembers)) db.communityMembers = [];
    if (!db.communityMembers.some((row) => row.id === "cmm_demo")) {
      db.communityMembers.push({
        id: "cmm_demo",
        userId: "demo_member",
        aiId: demoRoom.aiId,
        roomId: demoRoom.roomId,
        joinedAt: now,
      });
    }
  }

  db.demoAdsSeededAt = now;
  db.demoAdsVersion = DEMO_ADS_VERSION;
  return true;
}
