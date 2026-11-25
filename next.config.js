/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
  async redirects() {
    return [
      // /matches was merged into the home page; keep old shared links working.
      { source: '/matches', destination: '/', permanent: true },
    ];
  },
};

module.exports = nextConfig;
