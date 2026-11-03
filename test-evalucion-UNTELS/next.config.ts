import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  serverExternalPackages: ['@electric-sql/pglite'],
  outputFileTracingIncludes: {
    '/**': [
      './node_modules/@fontsource/noto-sans/files/noto-sans-latin-400-normal.woff',
      './node_modules/@fontsource/noto-sans/files/noto-sans-latin-700-normal.woff',
      './src/db/migrations/**',
      './public/Logo_UNTELS.png', // lo lee result-image.tsx en el servidor
    ],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
