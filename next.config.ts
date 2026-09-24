import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure the Jev model metadata ships with the /api/jevmeta function.
  outputFileTracingIncludes: {
    "/api/jevmeta": ["./jev/meta.json"],
  },
};

export default nextConfig;
