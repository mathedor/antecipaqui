import type { NextConfig } from "next";
import { execSync } from "node:child_process";

function readGitVersion(): string {
  // Vercel expõe VERCEL_GIT_COMMIT_SHA; em local pega do git diretamente.
  const fromVercel = process.env.VERCEL_GIT_COMMIT_SHA;
  if (fromVercel) return fromVercel.slice(0, 7);
  try {
    return execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return "dev";
  }
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "img.clerk.com" },
    ],
  },
  allowedDevOrigins: [
    "*.trycloudflare.com",
    "*.loca.lt",
  ],
  env: {
    NEXT_PUBLIC_APP_VERSION: readGitVersion(),
  },
};

export default nextConfig;
