/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ik.imagekit.io',
      },
      {
        protocol: 'https',
        hostname: 'cdn.builder.io',
      },
      {
        protocol: 'https',
        hostname: 'cdn.sanity.io',
      },
    ],
    unoptimized: true,
  },
  // Development settings
  ...(process.env.NODE_ENV === 'development' ? {
    optimizeFonts: true,
    swcMinify: true,
    experimental: {
      optimizeCss: true,
      optimizeServerReact: true,
    },
  } : {
    // Production settings
    optimizeFonts: true,
    experimental: {
      optimizeCss: true,
      optimizeServerReact: true,
    },
  }),
  async rewrites() {
    return [
      // Handle direct API paths
      {
        source: '/api/:path*',
        destination: 'http://localhost:9999/.netlify/functions/:path*',
      },
      // Handle direct Netlify function paths
      {
        source: '/.netlify/functions/:path*',
        destination: 'http://localhost:9999/.netlify/functions/:path*',
      },
      // Handle language-prefixed API paths
      {
        source: '/:lang/api/:path*',
        destination: 'http://localhost:9999/.netlify/functions/:path*',
      },
      // Handle language-prefixed Netlify function paths
      {
        source: '/:lang/.netlify/functions/:path*',
        destination: 'http://localhost:9999/.netlify/functions/:path*',
      },
    ];
  },
  async headers() {
    if (process.env.NODE_ENV === 'development') {
      return [
        {
          source: '/:path*',
          headers: [
            {
              key: 'Cache-Control',
              value: 'no-cache, no-store, max-age=0, must-revalidate',
            },
          ],
        },
      ];
    }
    return [];
  },
};

module.exports = nextConfig;