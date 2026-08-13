import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
    qualities: [75, 95],
  },
  async redirects() {
    return [
      { source: "/events/:path*", destination: "/comunicacao/ex-eventos/:path*", permanent: false },
      { source: "/events", destination: "/comunicacao/ex-eventos", permanent: false },
      { source: "/messages", destination: "/comunicacao/ex-mensagens", permanent: false },
    ];
  },
};

initOpenNextCloudflareForDev();

export default nextConfig;
