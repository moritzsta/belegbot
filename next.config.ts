import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    // Beleg-Bilder koennen groesser sein — Upload-Limit fuer Server Actions anheben
    serverActions: {
      bodySizeLimit: "15mb",
    },
  },
};

export default nextConfig;
