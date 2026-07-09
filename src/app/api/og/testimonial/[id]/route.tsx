import { ImageResponse } from "next/og";
import { createAdminClient } from "@/lib/supabase/admin";

// CLAUDE.md Section 8. Edge runtime for fast cold starts — this route gets
// called once per testimonial (cached in generated_assets afterwards), not
// once per landing-page view, but edge still matters since it's invoked
// live from a Server Action on submit, not from a cache.
export const runtime = "edge";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = createAdminClient();

  const { data: testimonial } = await admin
    .from("testimonials")
    .select("*, growth_clients(business_name, brand_primary_color, brand_secondary_color)")
    .eq("id", id)
    .single();

  if (!testimonial) {
    return new Response("Not found", { status: 404 });
  }

  const client = testimonial.growth_clients as unknown as {
    business_name: string;
    brand_primary_color: string | null;
    brand_secondary_color: string | null;
  };

  const primaryColor = client?.brand_primary_color ?? "#1081b8";
  const secondaryColor = client?.brand_secondary_color ?? "#ffffff";

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: primaryColor,
          padding: "80px",
        }}
      >
        <div
          style={{
            fontSize: 48,
            color: secondaryColor,
            textAlign: "center",
            fontStyle: "italic",
            maxWidth: "85%",
            display: "flex",
          }}
        >
          &ldquo;{testimonial.quote}&rdquo;
        </div>
        <div style={{ fontSize: 32, color: secondaryColor, marginTop: 48, opacity: 0.85, display: "flex" }}>
          {testimonial.author_name}
        </div>
        <div style={{ fontSize: 24, color: secondaryColor, marginTop: 16, opacity: 0.6, display: "flex" }}>
          {client?.business_name}
        </div>
      </div>
    ),
    { width: 1080, height: 1080 }
  );
}
