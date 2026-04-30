import type { NextConfig } from "next";

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
};

export default nextConfig;
