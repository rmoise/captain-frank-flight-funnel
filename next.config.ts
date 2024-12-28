import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['ik.imagekit.io', 'cdn.builder.io'],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination:
          process.env.NODE_ENV === 'development'
            ? 'http://localhost:3000/api/:path*'
            : '/api/:path*',
      },
    ];
  },
};

export default nextConfig;
