/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['mongoose'],
  turbopack: {
    root: __dirname,
  },
  productionBrowserSourceMaps: false,
}

module.exports = nextConfig
