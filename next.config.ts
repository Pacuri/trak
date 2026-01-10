import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  reactStrictMode: false, // Disabled to fix drag and drop "Cannot find draggable entry" error
};

export default nextConfig;
