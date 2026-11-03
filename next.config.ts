import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Screenshots are downscaled in the browser and voice notes are capped at 90s,
    // so requests stay under this and under Vercel's 4.5 MB function limit.
    serverActions: { bodySizeLimit: "4mb" },
  },
};

export default nextConfig;
