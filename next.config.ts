import type { NextConfig } from "next";
const development = process.env.NODE_ENV !== "production";
const connectSources = [
  "'self'",
  "https://*.supabase.co",
  "https://api.stripe.com",
  "https://api.nal.usda.gov",
  "https://world.openfoodfacts.org",
  ...(development ? ["ws:"] : []),
].join(" ");
const scriptSources = [
  "'self'",
  "'unsafe-inline'",
  ...(development ? ["'unsafe-eval'"] : []),
].join(" ");
const csp = `default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'; img-src 'self' data: https:; font-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src ${scriptSources}; connect-src ${connectSources}`;
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Content-Security-Policy", value: csp },
];
const nextConfig: NextConfig = {
  poweredByHeader: false,
  allowedDevOrigins: ["127.0.0.1"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  experimental: { serverActions: { bodySizeLimit: "1mb" } },
};
export default nextConfig;
