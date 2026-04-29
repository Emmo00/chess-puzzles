/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['mongoose'],
  turbopack: {},
  productionBrowserSourceMaps: true,
}

module.exports = nextConfig