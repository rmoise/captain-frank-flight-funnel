/** @type {import('next').NextConfig} */
const nextConfig = {
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
      {
        source: '/phases/:path*',
        destination: '/phases/:path*',
      },
    ];
  },
  experimental: {
    appDir: true,
  },
};

module.exports = nextConfig;