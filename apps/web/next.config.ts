import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@cet/db", "@cet/shared"],
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
