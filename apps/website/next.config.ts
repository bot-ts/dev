import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  transpilePackages: [
    "@ghom/bot.ts-cli",
    "@ghom/bot.ts-docs",
    "@ghom/event-emitter",
    "@ghom/handler",
    "@ghom/logger",
    "@ghom/orm",
    "@ghom/query",
  ],
}

export default nextConfig
