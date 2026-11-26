import { NextResponse } from "next/server";
import { startSession } from "@/lib/auth";
import { sha256Hex, timingSafeEqual } from "@/lib/crypto";
import { isStaffRole, resolveRoles } from "@/lib/roles";
import { flushPendingWrites, mutateDb, readDb, refreshDb } from "@/lib/store";

export const dynamic = "force-dynamic";

/** Consumes a one-time magic-link token and starts the session. */
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const url = new URL(request.url);
  const rawNext = url.searchParams.get("next") ?? "/";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";

  if (!token || token.length < 20) {
    return NextResponse.redirect(new URL("/login?magic=invalid", request.url));
  }

  await refreshDb();
  // A file-backed dev server (and any instance that booted earlier) must re-read
  // the document so a token created after boot is still found.
  const db = readDb();
  const tokenHash = await sha256Hex(token);
  const user = db.users.find(
    (row) =>
      Boolean(row.loginTokenHash) &&
      Boolean(row.loginTokenExpiresAt) &&
      +new Date(row.loginTokenExpiresAt!) > Date.now() &&
      timingSafeEqual(row.loginTokenHash!, tokenHash) &&
      !row.banned,
  );
  if (!user) return NextResponse.redirect(new URL("/login?magic=invalid", request.url));

  // Single use: the token is cleared before the session cookie is written.
  mutateDb((draft) => {
    const target = draft.users.find((row) => row.id === user.id);
    if (!target) return;
    delete target.loginTokenHash;
    delete target.loginTokenExpiresAt;
    // Opening the link proves control of the inbox.
    target.emailVerified = true;
  });
  await flushPendingWrites();

  await startSession(user.id);
  const staff = isStaffRole(user.role, resolveRoles(db.roles));
  const target = next.startsWith("/admin") && !staff ? "/" : next;
  return NextResponse.redirect(new URL(target, request.url));
}
