import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Generated social assets and any future uploaded photos/logos live
      // in Supabase Storage — wildcarded so it isn't tied to one project ref.
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
    ],
  },
  experimental: {
    serverActions: {
      // Default is 1MB, silently rejecting the whole request (including the
      // other Brand Kit fields, not just the file) before it ever reaches
      // saveStep3 — found live when a real logo upload broke the wizard
      // with a generic "This page couldn't load" error. The client-logos
      // Storage bucket already caps uploads at 2MB, so 3MB here just needs
      // to comfortably clear that plus the rest of the form/multipart
      // overhead, not raise the real limit.
      bodySizeLimit: "3mb",
    },
  },
};

export default nextConfig;
