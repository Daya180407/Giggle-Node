import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <p className="display gradient-text text-6xl">404</p>
      <h1 className="display mt-3 text-2xl text-ink">This page took a wrong turn</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        The link may be outdated. Try the live leaderboard or search for the tool you need.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link href="/category/all" className="btn btn-primary">
          Browse rankings
        </Link>
        <Link href="/search" className="btn btn-ghost">
          Search AI
        </Link>
      </div>
    </div>
  );
}
