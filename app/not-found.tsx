import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <p className="text-5xl font-black text-brand">404</p>
      <h1 className="mt-3 text-xl font-extrabold">Ye page nahi mila</h1>
      <p className="mt-1 text-sm text-muted">
        Ho sakta hai link purana ho. Neeche se ranking ya search try kijiye.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Link href="/category/all" className="btn btn-primary">
          Ranking dekhein
        </Link>
        <Link href="/search" className="btn btn-ghost">
          Search
        </Link>
      </div>
    </div>
  );
}
