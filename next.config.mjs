/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep Chromium / Playwright out of the webpack bundle (needed on Vercel).
  experimental: {
    serverComponentsExternalPackages: [
      "playwright-core",
      "@sparticuz/chromium-min",
    ],
    outputFileTracingIncludes: {
      "/api/check-nh": ["./node_modules/@sparticuz/chromium-min/**/*"],
      "/api/check-fl": ["./node_modules/@sparticuz/chromium-min/**/*"],
      "/api/check-oh": ["./node_modules/@sparticuz/chromium-min/**/*"],
      "/api/check-pa": ["./node_modules/@sparticuz/chromium-min/**/*"],
    },
  },
}

export default nextConfig
