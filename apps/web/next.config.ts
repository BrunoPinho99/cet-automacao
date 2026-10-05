import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@cet/db", "@cet/shared", "@cet/core"],
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
