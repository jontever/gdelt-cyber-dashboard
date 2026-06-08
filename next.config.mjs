/** @type {import('next').NextConfig} */
const nextConfig = {
  // Vercel free plan: keep serverless functions lean
  experimental: {
    serverComponentsExternalPackages: ['@google-cloud/bigquery'],
  },
};

export default nextConfig;
