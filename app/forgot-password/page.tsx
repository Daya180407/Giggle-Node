import type { Metadata } from "next";
import ForgotPasswordForm from "@/components/ForgotPasswordForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Password reset",
  description: "Reset your GigleNode password.",
};

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:py-16">
      <div className="card p-6 sm:p-7">
        <span className="eyebrow">Account recovery</span>
        <h1 className="display mt-1.5 text-2xl text-ink">Forgot your password?</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">
          Enter your registered email and we will generate a reset link that stays valid for one hour.
        </p>
        <div className="mt-5">
          <ForgotPasswordForm />
        </div>
      </div>
    </div>
  );
}
