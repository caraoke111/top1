import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // La fuente que usa la generación de imágenes (sharp/opentype) tiene que
  // viajar dentro de las funciones serverless de Vercel.
  outputFileTracingIncludes: {
    "/api/king-card.png": ["./lib/PermanentMarker.ttf"],
    "/api/cron/king-watch": ["./lib/PermanentMarker.ttf"],
  },
  // sharp es un binario nativo: que no lo intente empaquetar el bundler.
  serverExternalPackages: ["sharp"],
};

export default nextConfig;
