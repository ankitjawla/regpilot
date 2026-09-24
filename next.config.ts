import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure the Jev model metadata ships with the /api/jevmeta function.
  outputFileTracingIncludes: {
    "/api/jevmeta": ["./jev/meta.json"],
  },
  // Allow local browser harnesses / agents hitting 127.0.0.1
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};

export default nextConfig;
