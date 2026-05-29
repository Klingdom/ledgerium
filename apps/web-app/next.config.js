/** @type {import('next').NextConfig} */
const nextConfig = {
  // TEMP (hydration-debug): emit browser source maps so the production
  // hydration error (#418/#425) resolves to a real component/file/line.
  // Remove after the root cause is identified.
  productionBrowserSourceMaps: true,
  transpilePackages: ['@ledgerium/process-engine', '@ledgerium/intelligence-engine'],
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
