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
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Permite que la app se cargue en iframe desde hub.royal-transports.com
          { key: 'Content-Security-Policy', value: "frame-ancestors 'self' https://hub.royal-transports.com http://hub.royal-transports.com" },
          { key: 'Referrer-Policy',         value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy',      value: 'camera=(), microphone=(), geolocation=()' },
          // Permite que páginas públicas (hub) carguen este servidor local en iframe (Chrome Private Network Access)
          { key: 'Access-Control-Allow-Private-Network', value: 'true' },
          { key: 'Access-Control-Allow-Origin',          value: 'https://hub.royal-transports.com' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
