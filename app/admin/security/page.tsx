import Link from "next/link";
import { blockIpAction, saveSecurityAction, unblockIpAction } from "@/app/actions";
import { requestIp } from "@/lib/auth";
import { requireAreaPage } from "@/lib/permissions";
import { getSiteSettings } from "@/lib/settings";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function AdminSecurityPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  await requireAreaPage("security");
  const { saved, error } = await searchParams;
  const db = readDb();
  const security = getSiteSettings(db).security;
  const currentIp = await requestIp();
  const dayAgo = Date.now() - 86400000;
  const recent = new Map<string, number>();
  for (const event of db.rateEvents) {
    if (+new Date(event.at) < dayAgo) continue;
    recent.set(event.ip, (recent.get(event.ip) ?? 0) + 1);
  }
  const ipRows = [...recent.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">System</p>
          <h2 className="display mt-1 text-2xl text-ink">Spam & security</h2>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted">
            Block noisy networks, auto-hide abusive reviews and decide which login methods stay on. Every change is in
            the audit log.
          </p>
        </div>
        <Link href="/admin/activity" className="btn btn-ghost text-xs">
          Open audit log →
        </Link>
      </div>

      {saved ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800">
          Security settings saved.
        </div>
      ) : null}
      {error === "ip" ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700">
          That does not look like an IP address.
        </div>
      ) : null}

      <form action={saveSecurityAction} className="space-y-4">
        <section className="card p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold">IP block</h3>
              <p className="text-xs text-muted">
                Blocked IPs cannot submit ratings. The threshold auto-blocks a network after too many ratings in 24h.
              </p>
            </div>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
              <input
                type="checkbox"
                name="ipBlockEnabled"
                defaultChecked={security.ipBlockEnabled}
                className="h-4 w-4 accent-indigo-600"
              />
              Auto-block by volume
            </label>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-[200px_1fr]">
            <div>
              <label className="label" htmlFor="ipRatingThreshold">
                Ratings per IP / 24h
              </label>
              <input
                id="ipRatingThreshold"
                name="ipRatingThreshold"
                type="number"
                min={1}
                max={10000}
                defaultValue={security.ipRatingThreshold}
                className="field !py-2 text-xs"
              />
            </div>
            <div>
              <label className="label" htmlFor="blockedIps">
                Blocked IPs (one per line)
              </label>
              <textarea
                id="blockedIps"
                name="blockedIps"
                rows={4}
                defaultValue={security.blockedIps.join("\n")}
                className="field font-mono text-[11px]"
                placeholder={"203.0.113.24\n2001:db8::1"}
              />
            </div>
          </div>
        </section>

        <section className="card p-4 sm:p-5">
          <h3 className="text-sm font-bold">Bad words filter</h3>
          <p className="text-xs text-muted">
            Reviews containing these words are hidden or held for moderation before they appear on the site.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_200px]">
            <div>
              <label className="label" htmlFor="badWords">
                Words / phrases (one per line or comma separated)
              </label>
              <textarea
                id="badWords"
                name="badWords"
                rows={5}
                defaultValue={security.badWords.join("\n")}
                className="field text-xs"
              />
            </div>
            <div>
              <label className="label" htmlFor="badWordAction">
                When a word matches
              </label>
              <select
                id="badWordAction"
                name="badWordAction"
                defaultValue={security.badWordAction}
                className="field !py-2 text-xs"
              >
                <option value="pending">Hold the review for approval</option>
                <option value="hide">Hide the review automatically</option>
              </select>
            </div>
          </div>
        </section>

        <section className="card p-4 sm:p-5">
          <h3 className="text-sm font-bold">Login control</h3>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <label className="flex items-start gap-2 rounded-xl border border-line bg-slate-50/60 p-3 text-xs">
              <input
                type="checkbox"
                name="emailLogin"
                defaultChecked={security.emailLogin}
                className="mt-0.5 h-4 w-4 accent-indigo-600"
              />
              <span>
                <span className="block font-semibold">Email & password login</span>
                <span className="text-[11px] text-muted">Used by every account on this site.</span>
              </span>
            </label>
            <label className="flex items-start gap-2 rounded-xl border border-line bg-slate-50/60 p-3 text-xs">
              <input
                type="checkbox"
                name="googleLogin"
                defaultChecked={security.googleLogin}
                className="mt-0.5 h-4 w-4 accent-indigo-600"
              />
              <span>
                <span className="block font-semibold">Google sign-in</span>
                <span className="text-[11px] text-muted">
                  Stored preference. Google OAuth is not configured in this build, so email login stays available.
                </span>
              </span>
            </label>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-muted">
            Google sign-in needs OAuth client credentials and a callback route, which this build does not have. Treat
            that toggle as a stored preference. If you switch email login off, new sign-ins are blocked until you turn it
            back on — existing admin sessions keep working.
          </p>
        </section>

        <div className="flex justify-end">
          <button className="btn btn-primary">Save security settings</button>
        </div>
      </form>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="card p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold">Networks rating in the last 24h</h3>
              <p className="text-xs text-muted">Your current IP is {currentIp}. Raw IPs are used only for rate limiting.</p>
            </div>
          </div>
          <div className="admin-table-scroll mt-2">
            <table className="admin-table w-full text-[11px] sm:text-xs">
              <thead>
                <tr className="border-b border-line text-left text-[10px] uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-3">IP</th>
                  <th className="py-2 pr-3">Ratings</th>
                  <th className="py-2 pr-3">State</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {ipRows.map(([ip, count]) => {
                  const blocked = security.blockedIps.includes(ip);
                  return (
                    <tr key={ip}>
                      <td className="py-2 pr-3 font-mono text-[11px]">{ip}</td>
                      <td className="py-2 pr-3">{count}</td>
                      <td className="py-2 pr-3">
                        <span className={`chip ${blocked ? "bg-rose-50 text-rose-600" : "bg-slate-100 text-slate-600"}`}>
                          {blocked ? "blocked" : count >= security.ipRatingThreshold ? "over threshold" : "normal"}
                        </span>
                      </td>
                      <td className="py-2 text-right">
                        <form action={blocked ? unblockIpAction : blockIpAction}>
                          <input type="hidden" name="ip" value={ip} />
                          <button className="text-[11px] font-semibold text-brand hover:underline">
                            {blocked ? "Unblock" : "Block"}
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
                {ipRows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-muted">
                      No ratings in the last 24 hours.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card p-4 sm:p-5">
          <h3 className="text-sm font-bold">Currently blocked</h3>
          <p className="text-xs text-muted">{security.blockedIps.length} addresses blocked.</p>
          <div className="mt-2 divide-y divide-line">
            {security.blockedIps.map((ip) => (
              <div key={ip} className="flex items-center gap-2 py-2">
                <span className="min-w-0 flex-1 truncate font-mono text-[11px]">{ip}</span>
                <form action={unblockIpAction}>
                  <input type="hidden" name="ip" value={ip} />
                  <button className="text-[11px] font-semibold text-rose-600 hover:underline">Unblock</button>
                </form>
              </div>
            ))}
            {security.blockedIps.length === 0 ? <p className="py-4 text-xs text-muted">No blocked IPs.</p> : null}
          </div>
        </section>
      </div>
    </div>
  );
}
