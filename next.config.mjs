/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */

  images: {
    // Files in /images are never replaced in place (see public/sw.js), so
    // their optimized copies can be kept for a year instead of re-made and
    // re-downloaded every few hours.
    minimumCacheTTL: 31536000,
  },

  async headers() {
     return [{
       source: '/images/:path*',
       headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
     }, {
       source: '/audio/:path*',
       headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
     }]
   },
};

export default nextConfig;
