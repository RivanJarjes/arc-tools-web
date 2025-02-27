import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  transpilePackages: ["src/app/simulator", "src/app/utils"],
  webpack: (config) => {
    config.resolve.extensions.push('.ts', '.tsx');
    return config;
  },
};

export default nextConfig;
