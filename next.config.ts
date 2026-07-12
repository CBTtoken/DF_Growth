import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Generated social assets and any future uploaded photos/logos live
      // in Supabase Storage — wildcarded so it isn't tied to one project ref.
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
      // Stock photography for the Left-Heavy Split landing template
      // (src/lib/images/pexels.ts), searched live by the client's industry.
      { protocol: "https", hostname: "images.pexels.com" },
    ],
  },
  experimental: {
    serverActions: {
      // Default is 1MB, silently rejecting the whole request before it ever
      // reaches the Server Action — found live twice now: once for a single
      // logo upload (fixed by raising this from 1MB to 3MB), and again for
      // real client photos, which the UI promises can be "under 5MB each"
      // (PhotoGallery.tsx). 3MB didn't leave room for that promise on a
      // single file, let alone the old multi-file-in-one-request upload
      // path (now fixed separately in PhotoUploadInput.tsx to send one
      // file per request, removing the combined-batch-size problem
      // entirely) — this just needs to comfortably clear one photo up to
      // 5MB plus multipart overhead, not raise some general "big upload"
      // ceiling.
      bodySizeLimit: "8mb",
    },
  },
};

export default nextConfig;
