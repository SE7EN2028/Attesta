/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      // Source uploads (mp3/mp4/wav/m4a) are far above the 1MB default.
      bodySizeLimit: "200mb",
    },
    // These are Node-native libraries (native bindings / worker files /
    // complex conditional exports) that break when webpack tries to bundle
    // them for server actions — keep them as real `require()`s instead.
    serverComponentsExternalPackages: [
      "pdf-parse",
      "mammoth",
      "@deepgram/sdk",
      // Native binding (skia .node binary) pulled in by pdf-parse for the
      // DOMMatrix polyfill — must stay external or webpack tries to bundle the
      // binary and the build fails.
      "@napi-rs/canvas",
    ],
  },
};

export default nextConfig;
