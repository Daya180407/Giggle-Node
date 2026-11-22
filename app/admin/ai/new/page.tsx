import Link from "next/link";
import AiForm from "@/components/admin/AiForm";
import { requireAreaPage } from "@/lib/permissions";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function NewAiPage() {
  await requireAreaPage("catalogue");
  const db = readDb();
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Add a new AI</h2>
        <Link href="/admin/ai" className="text-xs text-brand">
          ← Back
        </Link>
      </div>
      <div className="card p-4">
        <AiForm allAis={db.ai} />
      </div>
      <p className="text-xs text-muted">
        After creating an AI, add its models — ratings and ranking happen at model level, so an AI without models will
        rank lower.
      </p>
    </div>
  );
}
