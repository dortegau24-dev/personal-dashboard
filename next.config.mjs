/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // ESLint runs separately in CI; don't block the Vercel build on lint warnings
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Type errors are caught locally; don't block Vercel on type warnings
    ignoreBuildErrors: false,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' }
    ]
  }
};

export default nextConfig;
