/** @type {import('next').NextConfig} */
const nextConfig = {
  // Backlog #283 (CEO 2026-10-02): production serves NO public source maps.
  // To debug the hydration error locally use `next dev`, or build with
  // LEDGERIUM_SOURCE_MAPS=1 (default off) and keep the output private.
  productionBrowserSourceMaps: process.env.LEDGERIUM_SOURCE_MAPS === '1',
  transpilePackages: ['@ledgerium/process-engine', '@ledgerium/intelligence-engine', '@ledgerium/process-graph'],
  webpack: (config) => {
    // Resolve .js imports to .ts files in workspace packages (ESM → TS source)
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
    };
    return config;
  },
  async redirects() {
    return [
      {
        source: '/demo',
        destination: '/product',
        permanent: true,
      },
      {
        source: '/install-extension',
        destination: '/install',
        permanent: true,
      },
      {
        source: '/docs.html',
        destination: '/docs',
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
