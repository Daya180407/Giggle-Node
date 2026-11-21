import type { Metadata } from "next";
import ForgotPasswordForm from "@/components/ForgotPasswordForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Password reset",
  description: "Apna GigleNode password reset kijiye.",
};

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="card p-6">
        <h1 className="text-xl font-extrabold">Password bhool gaye?</h1>
        <p className="mt-1 text-sm text-muted">
          Registered email daaliye. Hum ek reset link banayenge jo 1 ghante ke liye valid hoga.
        </p>
        <div className="mt-5">
          <ForgotPasswordForm />
        </div>
      </div>
    </div>
  );
}
