import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Smaller, faster JS: only pull the modules actually used from big libraries.
  experimental: {
    optimizePackageImports: ["recharts", "lucide-react", "date-fns", "radix-ui"],
    // Keep already-visited pages in the client cache so back/forward and
    // repeat navigations are instant instead of refetching the segment.
    staleTimes: {
      dynamic: 180,
      static: 300,
    },
  },
  // Strip the "x-powered-by" header and compress responses for better scores.
  poweredByHeader: false,
  compress: true,
  // Hide dev indicators in staging/preview builds (Next.js 16+)
  devIndicators: false,
};

export default nextConfig;

