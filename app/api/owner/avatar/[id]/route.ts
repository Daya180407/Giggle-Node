import { getAsset } from "@/lib/assets";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

/** Serves an owner's uploaded picture straight from the FILES bucket. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = readDb();
  const owner = (db.ownerAccounts ?? []).find((row) => row.id === id);
  if (!owner?.avatarKey) return new Response("Not found", { status: 404 });

  const asset = await getAsset(owner.avatarKey, "image/jpeg");
  if (!asset) return new Response("Not found", { status: 404 });

  return new Response(asset.body, {
    headers: {
      "content-type": asset.contentType,
      "cache-control": "public, max-age=31536000, immutable",
      "content-length": String(asset.body.byteLength),
    },
  });
}
