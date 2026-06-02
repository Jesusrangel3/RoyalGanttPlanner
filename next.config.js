/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['mssql', 'tedious'],
  },
};
module.exports = nextConfig;
