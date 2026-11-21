import Link from "next/link";
import AiForm from "@/components/admin/AiForm";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

export default function NewAiPage() {
  const db = readDb();
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Naya AI Add Kijiye</h2>
        <Link href="/admin/ai" className="text-xs text-brand">
          ← Wapas
        </Link>
      </div>
      <div className="card p-4">
        <AiForm allAis={db.ai} />
      </div>
      <p className="text-xs text-muted">
        AI banane ke baad uske models add kijiye — rating aur ranking model level par hoti hai, isliye bina model ke AI
        ranking me neeche rahega.
      </p>
    </div>
  );
}
