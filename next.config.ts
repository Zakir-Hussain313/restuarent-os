import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  // Dev mode + service workers fight each other via HMR — only build
  // the SW for production builds. Test with `npm run build && npm run start`,
  // not `npm run dev`.
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  reactCompiler: {
    compilationMode: "annotation",
  },
  allowedDevOrigins: ['192.168.1.10', 'shout-cilantro-retrain.ngrok-free.dev'],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ztfqvqacwmnvdvqeqaov.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default withSerwist(nextConfig);