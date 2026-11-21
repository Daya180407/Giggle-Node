import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact GigleNode",
  description: "Tool listing, sponsored placement, galat data ya feedback — humse sampark kijiye.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-3xl font-extrabold">Contact</h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">
        GigleNode pe tool listing, sponsored placement, data correction ya feedback ke liye email kijiye. Hum 2 kaam ke
        din me reply karte hain.
      </p>

      <div className="card mt-5 p-5">
        <dl className="space-y-4 text-sm">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">General & data correction</dt>
            <dd className="font-semibold">hello@giglenode.com</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sponsored listing / verified profile</dt>
            <dd className="font-semibold">partners@giglenode.com</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Fake rating report</dt>
            <dd className="font-semibold">trust@giglenode.com</dd>
          </div>
        </dl>
      </div>

      <p className="mt-4 text-xs text-muted">
        Sponsored placement hamesha “Sponsored” label ke saath dikhta hai — ranking formula par asar nahi hota.
      </p>
    </div>
  );
}
