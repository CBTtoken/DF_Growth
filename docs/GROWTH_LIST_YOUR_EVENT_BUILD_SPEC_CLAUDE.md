# GROWTH_LIST_YOUR_EVENT_BUILD_SPEC_CLAUDE.md

## 1. Project Overview

A lightweight, genuinely free events section. Anyone, not just existing Growth members, can register a free account and list an event, no cost, ever, not a trial funnel into a paid tier. A public, browsable, location-aware Events section sits alongside the Marketplace directory, built to be found on Google the same way every other part of Growth is. Phase 1 is informational only, no ticketing or payment, per the earlier confirmed decision, Phase 2 (paid tickets and bookings) is logged separately and not part of this build.

## 2. Account Model

New, standalone account type, `event_organizers`, separate from `growth_clients`. Signup is the lightest possible: email, password (or magic link), nothing else, no plan, no tier, no Paystack step anywhere in this flow. Same underlying Supabase Auth system as the rest of Growth, so it's one login system across the platform, but this is its own distinct role, not a comped or trial business membership.

An existing Growth business member can also list an event through this same flow using their existing login, no need to create a second account if they're already a member.

## 3. Event Listing Fields

- Event name
- Date and time (start required, end optional)
- Location: address plus city, matched against Growth's existing city taxonomy for consistency with Marketplace
- Description
- Organiser contact details (email, phone, WhatsApp)
- Social links (Facebook, Instagram, website)
- A few images, reusing Growth's existing photo upload and Pexels-fallback pattern
- Ticket info, a plain descriptive text field ("Free entry," "R50 at the door," "Book via the organiser"), informational only, no payment or checkout wired to it, Phase 1

## 4. Public Events Section

- New browsable, searchable section, structurally similar to the Marketplace directory: search box, city filter, event type filter (workshop, market, community, fundraiser, and similar, Claude Code's discretion on the exact list, keep it short and genuinely useful).
- Sorted soonest first by default.
- Past events automatically drop out of the public browse view once their date passes, kept in the database, not deleted, just no longer surfaced.
- Each event gets its own dedicated, shareable page, not just a card in a list.

## 5. SEO, This Is Where It Matters Most

Every event page ships with JSON-LD `Event` structured data, Google explicitly supports rendering event date and location directly in search results for pages that do this properly. This is a genuine, concrete way to "pop on every search where applicable" for local searches like "markets this weekend in [city]," not just a nice-to-have on top of a normal page.

## 6. Moderation and Spam Prevention

Since this is open to literally anyone with an email address, quality control matters both for visitor trust and because a domain full of thin, spammy pages can hurt Google's overall view of the site, not just that one page.

**Recommended approach:** Cloudflare Turnstile on submission, plus a basic completeness and spam-pattern check. Clean submissions that pass both auto-publish immediately, keeping the experience genuinely fast and free. Anything that fails those checks, incomplete fields, obvious spam patterns, routes to a manual admin review queue before it goes live, rather than publishing first and cleaning up after. A "report this event" flag, visible on every public event page, routes to the same admin queue, consistent with the pattern already built for Rate & Review.

## 7. Data Model

New table, `events`: `id`, `organizer_account_id`, `event_name`, `description`, `start_datetime`, `end_datetime` (nullable), `location_address`, `city`, `event_type`, `social_links` (jsonb), `contact_details` (jsonb), `images`, `ticket_info_text`, `status` (`published`, `pending_review`, `flagged`, `removed`, `expired`), `created_at`.

## 8. Build Order

**Sprint 1.** Event organiser account and signup flow, event submission form and fields, `events` table, public Events section (browse, search, filters), individual event pages with `Event` JSON-LD.

**Sprint 2.** Turnstile and spam-pattern checks, admin moderation queue for flagged and pending-review events, "report this event" public flag action, automatic archiving of past events from the public browse view.

## 9. Out Of Scope

- No ticketing, payment, or booking capability, Phase 2, not this build.
- No attendee RSVP or headcount tracking in this build, worth considering as a fast follow once Phase 1 is proven, not scoped now.
- No integration with the Rate & Review module, events and business reviews stay separate systems for now.

## 10. Acceptance Checklist

- [ ] Free event organiser signup live, no payment step anywhere in the flow
- [ ] Existing Growth members can list an event with their existing login
- [ ] All listed fields captured, ticket info stored as descriptive text only, no payment logic attached
- [ ] Public Events section live, searchable by city and event type, sorted soonest first
- [ ] Past events auto-drop from public browse, retained in the database
- [ ] Individual event pages live with Event JSON-LD structured data
- [ ] Turnstile and spam checks gate auto-publish vs manual review correctly
- [ ] Admin moderation queue live for flagged and pending-review events
- [ ] "Report this event" flag live on every public event page
