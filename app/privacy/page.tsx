import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "GigleNode kaise data collect karta hai, ratings kahan store hoti hain aur aapke rights kya hain.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-extrabold">Privacy Policy</h1>
      <p className="mt-2 text-xs text-muted">Last updated: November 2026</p>

      <h2 className="mt-6 text-lg font-bold">Hum kya collect karte hain</h2>
      <ul className="mt-2 space-y-1.5 text-sm text-slate-600">
        <li>• Account: naam aur email (login ke liye).</li>
        <li>• Ratings: aapka star, review aur timestamp — public dikhte hain.</li>
        <li>• Bookmarks aur follows — sirf aapke account me.</li>
        <li>• Abuse rokne ke liye IP address, sirf 24 ghante ke rate-limit ke liye.</li>
      </ul>

      <h2 className="mt-6 text-lg font-bold">Kya public hota hai</h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        Aapka naam, avatar initial, rating aur review AI aur model pages pe public dikhte hain. Email kabhi public nahi
        hota.
      </p>

      <h2 className="mt-6 text-lg font-bold">Data kahan store hota hai</h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        Production me data Supabase (Postgres + Auth) me store hota hai aur frontend Vercel pe chalta hai. Images
        Supabase Storage / Cloudinary par. Email notifications Resend se jate hain — sirf un AI ke liye jinhe aap
        follow karte hain.
      </p>

      <h2 className="mt-6 text-lg font-bold">Aapke rights</h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        Apni rating kabhi bhi edit kar sakte hain (24 ghante ke lock ke saath). Account ya reviews delete karwane ke
        liye privacy@giglenode.com pe likhiye.
      </p>

      <h2 className="mt-6 text-lg font-bold">Cookies</h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        Sirf session cookie use hoti hai — login state yaad rakhne ke liye. Koi third-party tracking cookie nahi.
      </p>
    </div>
  );
}
