import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 'standalone' bundles a minimal Node.js server for Docker/Cloud Run/Railway.
  // Required for the production Dockerfile to work.
  output: 'standalone',
};

export default nextConfig;
