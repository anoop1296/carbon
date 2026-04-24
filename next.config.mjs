/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    outputFileTracingIncludes: {
      '/*': ['./data/csvSeed/**/*.csv'],
    },
  },
};

export default nextConfig;
