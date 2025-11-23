/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  // Disable Turbopack
  experimental: {
    turbo: false,
  },
  
  // Use webpack 5
  webpack5: true,
  
  // Configure page extensions
  pageExtensions: ['js', 'jsx', 'ts', 'tsx'],
  
  // Webpack configuration
  webpack: (config, { isServer }) => {
    // Add project root to module resolution
    config.resolve.modules = [
      path.resolve(__dirname, './'),
      'node_modules',
    ];
    
    // Add path alias
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, './src'),
    };

    // Handle Node.js modules that shouldn't be bundled for the client
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        path: false,
        os: false,
        'fs-extra': false
      };
    }

    return config;
  }
};

// Disable Turbopack
process.env.TURBOPACK = 'false';

module.exports = nextConfig;
