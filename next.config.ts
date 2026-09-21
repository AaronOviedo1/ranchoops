import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // El default es 1 MB y una foto de celular pesa más: sin esto no pasan
      // las fotos de curaciones ni las de la ficha del animal. Queda abajo de
      // los 10 MB que deja pasar el proxy.
      bodySizeLimit: "8mb",
    },
  },
};

export default nextConfig;
