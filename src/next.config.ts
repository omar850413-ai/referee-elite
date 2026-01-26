
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

// The turbopack config needs to be at the top level for the version of Next.js
// running in this environment. We add it to the config object this way to avoid
// potential TypeScript errors from the installed `next` package version.
(nextConfig as any).turbopack = {
  root: process.cwd(),
};

export default nextConfig;
