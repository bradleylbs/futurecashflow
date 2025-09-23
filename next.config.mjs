/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: '/site.webmanifest',
        headers: [
          { key: 'Content-Type', value: 'application/manifest+json' },
          { key: 'Cache-Control', value: 'no-store, must-revalidate' },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          { key: 'Service-Worker-Allowed', value: '/' },
          { key: 'Cache-Control', value: 'no-cache' },
        ],
      },
    ]
  },
  async rewrites() {
    return [
  // Route PWA icon paths to a valid existing PNG (no need to generate files now)
  { source: '/icons/icon-192.png', destination: '/apple-touch-icon.png' },
  { source: '/icons/icon-512.png', destination: '/apple-touch-icon.png' },
  { source: '/android-chrome-192x192.png', destination: '/apple-touch-icon.png' },
  { source: '/android-chrome-512x512.png', destination: '/apple-touch-icon.png' },
  { source: '/placeholder-logo.png', destination: '/apple-touch-icon.png' },
  // Favicons fall back to placeholder logo to avoid 404s in dev
  { source: '/favicon-32x32.png', destination: '/placeholder-logo.png' },
  { source: '/favicon-16x16.png', destination: '/placeholder-logo.png' },
    ]
  },
}

export default nextConfig
