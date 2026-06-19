/** @type {import('next').NextConfig} */
const nextConfig = {
  // Requerido para imagen Docker con `next start` standalone
  output: 'standalone',

  experimental: {
    serverComponentsExternalPackages: ['mssql', 'tedious'],
  },

  // Cabeceras de seguridad para todas las páginas
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options',    value: 'nosniff' },
          { key: 'X-Frame-Options',           value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy',           value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy',        value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
