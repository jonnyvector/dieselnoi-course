/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost'], // Add your video CDN domains here (e.g., 'mux.com', 'bunny.net')
  },
}

module.exports = nextConfig
