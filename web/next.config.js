/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://assembleia-de-deus-production.up.railway.app',
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'https://assembleia-de-deus-production.up.railway.app'}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;