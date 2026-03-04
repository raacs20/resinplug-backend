import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow CORS in API routes via middleware

  /* ── Cache headers for uploaded images ──
     Filenames include timestamps (e.g. 1709545200-abc123.webp) so they're
     effectively content-addressed. A 1-year immutable cache is safe because
     updating a product image generates a new filename/URL automatically. */
  async headers() {
    return [
      {
        source: "/uploads/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
