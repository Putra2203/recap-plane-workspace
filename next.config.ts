import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdfkit"],
  turbopack: {
    root: __dirname,
  },
  allowedDevOrigins: ["app.erdavid.my.id"],
};

export default nextConfig;
