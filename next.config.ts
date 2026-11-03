import type { NextConfig } from "next";

// 보안 머리글 (CHECK P0-2) — 다른 사이트가 이 화면을 틀 안에 넣거나, 파일 종류를 바꿔 읽거나, 주소를 흘리는 것을 막는다.
// 화면이 쓰는 인라인 스크립트를 막지 않도록 script-src는 정하지 않았다.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'" },
];

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // 내부망 반입용 — 빌드하면 .next/standalone에 node_modules 없이 실행되는 묶음이 생긴다 (INTRANET.md)
  output: "standalone",
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
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
