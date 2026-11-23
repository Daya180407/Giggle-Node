import Link from "next/link";
import { redirect } from "next/navigation";
import OwnerLoginForm from "@/components/owner/OwnerLoginForm";
import { getCurrentOwner } from "@/lib/owner-auth";

export const dynamic = "force-dynamic";

export const metadata = { title: "Owner sign in", robots: { index: false, follow: false } };

export default async function OwnerLoginPage() {
  const owner = await getCurrentOwner();
  if (owner) redirect("/owner");

  return (
    <div className="mx-auto max-w-md space-y-4">
      <OwnerLoginForm />
      <p className="text-center text-[11px] text-muted">
        Listed site account?{" "}
        <Link href="/login" className="font-semibold text-brand hover:underline">
          Sign in here
        </Link>
      </p>
    </div>
  );
}
