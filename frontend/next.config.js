/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: __dirname,
  },
  productionBrowserSourceMaps: false,
}

module.exports = nextConfig
