// next.config.ts
import type { NextConfig } from 'next';
import type { Configuration as WebpackConfig } from 'webpack';

const nextConfig: NextConfig = {
  experimental: { turbo: {} },
  webpack: (config: WebpackConfig) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      // ✅ Make sure each package resolves to itself 
      '@tensorflow/tfjs-core': require.resolve('@tensorflow/tfjs-core'),
      '@tensorflow/tfjs-converter': require.resolve('@tensorflow/tfjs-converter'),
      '@tensorflow/tfjs-backend-webgl': require.resolve('@tensorflow/tfjs-backend-webgl'),
      '@tensorflow/tfjs-backend-cpu': require.resolve('@tensorflow/tfjs-backend-cpu'),
      '@tensorflow/tfjs-backend-wasm': require.resolve('@tensorflow/tfjs-backend-wasm'),
      'face-api.js': require.resolve('face-api.js'),
    };
    return config;
  },
  transpilePackages: ['face-api.js'], // keeps Turbo/ESM happy
};

export default nextConfig;
