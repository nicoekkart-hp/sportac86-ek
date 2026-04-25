import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
  images: {
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
