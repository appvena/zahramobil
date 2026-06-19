/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/zahramobil',
  assetPrefix: '/zahramobil/',
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
};

module.exports = nextConfig;
