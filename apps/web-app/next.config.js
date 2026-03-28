/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@ledgerium/process-engine', '@ledgerium/intelligence-engine'],
  webpack: (config) => {
    // Resolve .js imports to .ts files in workspace packages (ESM → TS source)
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
    };
    return config;
  },
};

module.exports = nextConfig;
