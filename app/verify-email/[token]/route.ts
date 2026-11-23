import { NextResponse } from "next/server";
import { startSession } from "@/lib/auth";
import { sha256Hex } from "@/lib/crypto";
import { flushPendingWrites, mutateDb, refreshDb } from "@/lib/store";

export const dynamic = "force-dynamic";

/** Only same-origin relative paths, so `//evil.com` cannot be used as an open redirect. */
function safeNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/profile";
  return value;
}

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const url = new URL(request.url);
  const next = safeNext(url.searchParams.get("next"));
  const tokenHash = await sha256Hex(token);

  const db = await refreshDb();
  const user = db.users.find(
    (u) => u.verifyTokenHash === tokenHash && u.verifyTokenExpiresAt && +new Date(u.verifyTokenExpiresAt) > Date.now(),
  );
  if (!user) return NextResponse.redirect(new URL("/login?verify=invalid", request.url));

  mutateDb((d) => {
    const target = d.users.find((u) => u.id === user.id);
    if (!target) return;
    target.emailVerified = true;
    delete target.verifyTokenHash;
    delete target.verifyTokenExpiresAt;
  });
  await flushPendingWrites();
  await startSession(user.id);

  return NextResponse.redirect(new URL(next, request.url));
}
