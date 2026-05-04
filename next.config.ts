import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
  images: {
    // Trim variants generated per image to keep transformation count low.
    // Defaults are 8 deviceSizes + 8 imageSizes = a lot of variants per src.
    deviceSizes: [640, 828, 1200, 1920],
    imageSizes: [48, 96, 128, 256, 384],
    qualities: [75],
    minimumCacheTTL: 60 * 60 * 24 * 31,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/sponsorfiche",
        destination:
          "https://fjqplmzorlkocowhumjl.supabase.co/storage/v1/object/public/sponsors/sponsorfiche.jpeg",
      },
    ];
  },
};

export default nextConfig;
