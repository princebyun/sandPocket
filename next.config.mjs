/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: "/project/:path*",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/:path*/tools.jar",
        destination: "/tools.jar",
      },
    ];
  },
};

export default nextConfig;
