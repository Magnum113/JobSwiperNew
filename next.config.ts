import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep the resume text-extraction libs out of the bundle (they use Node APIs).
  serverExternalPackages: ["mammoth", "unpdf"],
};

export default nextConfig;
