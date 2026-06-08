/** @type {import('next').NextConfig} */
const nextConfig = {
  // Vercel free plan: keep serverless functions lean
  serverExternalPackages: ['@google-cloud/bigquery'],
};

export default nextConfig;
