import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@cet/db", "@cet/shared"],
};

export default nextConfig;
