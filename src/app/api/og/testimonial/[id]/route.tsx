import { ImageResponse } from "next/og";
import { createAdminClient } from "@/lib/supabase/admin";
import { renderCard, type AssetStyleId } from "@/lib/assets/styles";

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
    .select("*, growth_clients(business_name, brand_primary_color, brand_secondary_color, asset_style)")
    .eq("id", id)
    .single();

  if (!testimonial) {
    return new Response("Not found", { status: 404 });
  }

  const client = testimonial.growth_clients as unknown as {
    business_name: string;
    brand_primary_color: string | null;
    brand_secondary_color: string | null;
    asset_style: AssetStyleId | null;
  };

  const primaryColor = client?.brand_primary_color ?? "#1081b8";
  const secondaryColor = client?.brand_secondary_color ?? "#ffffff";
  const style = client?.asset_style ?? "clean";

  return new ImageResponse(
    renderCard(style, {
      quote: testimonial.quote,
      authorName: testimonial.author_name,
      businessName: client?.business_name ?? "",
      rating: testimonial.rating,
      primaryColor,
      secondaryColor,
    }),
    { width: 1080, height: 1080 }
  );
}
