/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */

  async headers() {
     return [{
       source: '/images/:path*',
       headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
     }]
   },
};

export default nextConfig;
