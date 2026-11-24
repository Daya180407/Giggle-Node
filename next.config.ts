import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: { remotePatterns: [{ protocol: "https", hostname: "**" }] },
  // Keep the Cloudflare adapter out of the Vercel/Node server bundle. It is only
  // imported lazily when a Worker context or R2 binding is actually present.
  serverExternalPackages: ["@opennextjs/cloudflare"],
  // Media uploads and JSON restores arrive through server actions.
  experimental: { serverActions: { bodySizeLimit: "12mb" } },
  // Allows the cloud preview host to load dev assets in this workspace.
  allowedDevOrigins: ["pv-aa990e4b1d64-99c7cced-6f31-485d-9aed-3f541ed65932.style.dev"],
};

export default nextConfig;
