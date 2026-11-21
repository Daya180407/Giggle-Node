import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About GigleNode",
  description: "GigleNode kya hai, rating kaise kaam karti hai aur ranking formula kya hai.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-extrabold">About GigleNode</h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">
        GigleNode ek AI trust system hai. Har kaam ke liye best AI dhoondhna confusing ho gaya hai — har hafte naya
        tool, naya model, naya claim. Hum isi confusion ko khatam karte hain: real user ratings, model wise detail aur
        expert posts, teeno ek jagah.
      </p>

      <h2 className="mt-7 text-lg font-bold">Rating kaise kaam karti hai</h2>
      <ul className="mt-2 space-y-2 text-sm text-slate-600">
        <li>• Rating dene ke liye login zaroori hai. Ek user, ek model, ek rating.</li>
        <li>• Edit karne par purani rating update hoti hai — nayi entry nahi banti.</li>
        <li>• Ek edit ke baad 24 ghante ka lock lagta hai, taaki koi ranking na badal sake.</li>
        <li>• Ek IP se 24 ghante me 20 se zyada rating allowed nahi.</li>
      </ul>

      <h2 className="mt-7 text-lg font-bold">Ranking formula</h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        Hum sirf average ya total stars nahi dekhte. Weighted + recency method use hota hai:
      </p>
      <pre className="mt-2 overflow-x-auto rounded-xl bg-slate-900 p-4 text-xs text-slate-100">
        Weighted Score = (Votes / (Votes + 50)) × AI ka Average + (50 / (Votes + 50)) × Sabhi AI ka Average
      </pre>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        Iska matlab: jab tak 50 votes nahi milte, AI thoda neeche rehta hai. 50 votes ke baad uski asli rating hi
        ranking banti hai — isliye 2 vote wala 5.0 star, 500 vote wale 4.7 star se upar nahi ja sakta. Pichle 30 din ki
        ratings ko 1.5x weight milta hai, 90 din se purani ratings ka weight dheere dheere kam hota hai.
      </p>

      <h2 className="mt-7 text-lg font-bold">Sponsored listings</h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        Koi bhi paid placement hamesha “Sponsored” label ke saath dikhta hai. Ranking formula par paise ka asar nahi
        hota — sirf admin manual boost lag sakta hai, jo AI page pe disclose kiya jata hai.
      </p>

      <div className="mt-8 flex flex-wrap gap-2">
        <Link href="/category/all" className="btn btn-primary">
          Ranking dekhein
        </Link>
        <Link href="/contact" className="btn btn-ghost">
          Contact
        </Link>
      </div>
    </div>
  );
}
