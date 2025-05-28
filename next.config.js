// Safe loading function for next-intl plugin
function safeLoadNextIntl() {
  try {
    const withNextIntl = require('next-intl/plugin')(
      './src/app/[lang]/i18n/server.ts'
    );
    return withNextIntl;
  } catch (error) {
    console.warn('Failed to load next-intl plugin:', error.message);
    // Return identity function if plugin fails to load
    return (config) => config;
  }
}

const withNextIntl = safeLoadNextIntl();

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
    ],
    unoptimized: true,
  },
  // Development settings
  ...(process.env.NODE_ENV === 'development' ? {
    experimental: {
      optimizeCss: true,
      serverActions: {
        bodySizeLimit: '2mb',
      },
    },
    serverExternalPackages: [],
    webpack: (config, { isServer }) => {
      // Only run this on the client side
      if (!isServer) {
        // Empty module for problematic 3rd party scripts in development
        config.resolve.alias['cookiebot'] = false;
        config.resolve.alias['hotjar'] = false;
      }
      return config;
    },
  } : {
    // Production settings
    experimental: {
      optimizeCss: true,
      serverActions: {
        bodySizeLimit: '2mb',
      },
    },
    serverExternalPackages: [],
  }),
  async rewrites() {
    return [
      // Handle direct API paths
      {
        source: '/api/:path*',
        destination: 'http://localhost:8888/.netlify/functions/:path*',
      },
      // Handle direct Netlify function paths
      {
        source: '/.netlify/functions/:path*',
        destination: 'http://localhost:8888/.netlify/functions/:path*',
      },
      // Handle language-prefixed API paths
      {
        source: '/:lang/api/:path*',
        destination: 'http://localhost:8888/.netlify/functions/:path*',
      },
      // Handle language-prefixed Netlify function paths
      {
        source: '/:lang/.netlify/functions/:path*',
        destination: 'http://localhost:8888/.netlify/functions/:path*',
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

// Using the withNextIntl HOC to enable internationalization
// Configured in ./src/app/[lang]/i18n/server.ts
// This plugin adds the middleware necessary for handling i18n routing
module.exports = withNextIntl(nextConfig);