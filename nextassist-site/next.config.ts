import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  trailingSlash: false,
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
