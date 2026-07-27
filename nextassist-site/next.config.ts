import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  trailingSlash: false,
  async redirects() {
    return [
      {
        source: "/blog/erros-gestao-estoque-pecas-celular",
        destination: "/blog/7-erros-gestao-estoque-pecas-celular",
        permanent: true,
      },
    ];
  },
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
