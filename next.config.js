/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
  env: {
    STORAGE_SUPABASE_URL: process.env.STORAGE_SUPABASE_URL,
    STORAGE_SUPABASE_ANON_KEY: process.env.STORAGE_SUPABASE_ANON_KEY,
  },
}

module.exports = nextConfig
