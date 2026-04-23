import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "cdn.21st.dev" },
      {
        protocol: "https",
        hostname: "zlvcpaiyjshsjglqicvy.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async redirects() {
    return [
      { source: "/recommend", destination: "/assistant", permanent: true },
    ];
  },
};

export default nextConfig;
