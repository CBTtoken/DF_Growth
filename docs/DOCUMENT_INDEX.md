# WHERE EVERY DOCUMENT LIVES

Fifty-nine markdown documents sit across seven folders in this repository.
This says where each one is and, more usefully, which are current and which
have been overtaken.

**Nothing has been moved, deliberately.** Dozens of source files cite these
paths in comments, for instance `BizUp/docs/bizup-phase1-spec.md Sec 15.1` in
`src/app/bizup/actions.ts`. In this codebase those comments are the project's
memory, and a tidy-up that silently invalidated them would cost more than the
mess it cleaned. An index gives the same navigation with nothing broken.

Last verified 3 August 2026.

---

## START HERE

| You want | Read |
|---|---|
| Which repository am I supposed to be in | `ESTATE.md` at the repo root |
| How to work in this repo without colliding with another session | `CLAUDE.md` section 0.0 |
| What this product is and how it is built | `CLAUDE.md` |
| Where a spec lives | this file |

---

## CURRENT: pick these up

| Document | Where | About |
|---|---|---|
| Growth Build Kit | `../DigitalFlyer/Clients/Growth_Build_Kit_v1.md` | The reusable process for a done-for-you member build. Not in this repo. |
| `HANDOFF-slip-management.md` | `BizUp/docs/` | **Next KatisoBiz mission**: expense slip photos, OCR, review, accountant export, purge-after-export. Agreed 5 Aug 2026. |
| `Handoff_Growth_Shop_and_Payments.md` | `docs/` | Shop and payments. Sprint 1 done; Sprint 2 payments core **shipped 5 Aug** (Bob Pay + connect flow + refunds); remaining: Bob Go waybills/tracking, Bob Pay sandbox e2e pending Dewald's credentials. |
| `HANDOFF_old_good_demo.md` | `Jordan/` | Jordan's demo thrift shop. **Built and live** at /old-good and oldgood.co.za; pending: Jordan's account link, stall view, unlisted flip. |
| `Report_Sprint1_Shop.md` | `docs/` | What Sprint 1 delivered, every criterion, what was assumed. |
| `Handoff_Desk_HealthCheck.md` | `TheDesk/` | Estate health and cost monitoring. **Not started**, unblocked. |
| `Handoff_WhatsApp_Lead_Switchboard_v1.md` | `WhatsApp/` | Lead switchboard. |
| `Theme_Library.md` | `docs/` | Every page theme, what each does differently. **Add a row when you add a theme.** |
| `GROWTH_DESIGN_SKILLS_AND_TEMPLATE_DIVERSITY_CLAUDE.md` | `docs/` | The template and anchor system these themes are built on. |
| `Moxie_Editorial_and_Design_Reference_2026.md` | `eMag/` | House style for the magazine. |
| `06_DigitalFlyer_Growth_Brand_and_Content_Directive.md` | `docs/` | Brand and copy rules. |

## CLIENT WORK

| Document | Where |
|---|---|
| `Report_WeCare_Products.md` | `docs/` |
| `Report_JettingWorx.md` | `docs/` |
| `JettingWorx_Client_Email.md` | `docs/` |
| `WeCare_Client_Email.md` | `docs/` |
| `Partner_Outreach_Emails.md` | `docs/` |

## BY PRODUCT

**Kwaai Press and Moxie** live in `eMag/`: `Handoff_Moxie_eMag_v2.md`,
`Handoff_MoxieMag_Site.md`, `Moxie_Editorial_and_Design_Reference_2026.md`,
`Moxie-Project-Instructions.md`, `Moxie_Project_Instructions_Clean.md`,
`Moxie_Edition03_August2026_CopyPack.md`, `BUILD_NOTES.md`,
`WORDPRESS_EXPORT_CHECKLIST.md`.

**The Desk** lives in `TheDesk/`: handoffs v1 and v2, build reports v1 and v2,
the health check addendum (`Handoff_Desk_HealthCheck.md`) and its phase 2
report (`Report_Desk_HealthCheck_Phase2.md`).

**The Board** lives in `The Board/`: handoff v1, phase reports 1 to 3, and a
tester brief.

**KatisoBiz** lives in `BizUp/docs/`. **Cited directly from source comments,
so do not move it.** Note the folder keeps the old BizUp name: the product was
renamed KatisoBiz on 27 July 2026 and only internal identifiers still say
BizUp.

**Bob Go** research is in `BobGo/`, which is **gitignored**. See the warning
below.

**KatisoBiz Jobs** (`jobs.katisobiz.co.za`) lives in `docs/`. Read them in
this order: `SPEC-katisobiz-jobs-public-launch.md` is the current one, the
full flow map and functional spec as the product stands at launch, written
for business analyst review. `REPORT-jobs-prelaunch.md` and
`REPORT-katisobiz-jobs-sprints-1-2.md` are the two builds before it and are
still accurate about how the taxonomy, entitlements and moderation work.
The original build spec and the pre-launch handoff are in `scripts/`
(`spec-katisobiz-jobs.md`, `handoff-jobs-pre-launch-improvements.md`).

**The agent programme** lives in `docs/`: `agent-programme-build-spec.md`,
`agent-page-v3-final.md`, `agent-terms-and-faq-v2.md` and the copy files.

---

## SUPERSEDED: read for history, do not build from

These describe states the product has moved past. Several contain sprint plans
that were completed, changed or abandoned. Check against the live system
before believing anything in them.

- `CLAUDE_PROJECT_HANDOFF.md`, `CURRENT_STATE_AND_HANDOVER.md`
- `GROWTH_COMBINED_BUILD_SPEC_CLAUDE.md`, `GROWTH_CONSOLIDATED_SPRINT_BUILD_SPEC_CLAUDE.md`
- `GROWTH_NEXT_SPRINT_BUILD_SPEC_CLAUDE.md`, `GROWTH_SPRINT1_LAUNCH_READINESS_CLAUDE.md`
- `GROWTH_PUBLIC_BETA_POLISH_SPRINT_CLAUDE.md`
- `GROWTH_BOOKING_SHOP_MODULES_CLAUDE.md`, on the shop specifically. **The
  shop handoff of 2 August supersedes it**, and the two disagree: this one
  routes member payments through a DigitalFlyer split, which is now
  explicitly forbidden.
- `agent-terms-and-faq.md`, superseded by the v2 file
- `Moxie_Project_Instructions_Clean.md` and `Moxie-Project-Instructions.md`
  overlap. Check dates before trusting either.

**The rule when two specs disagree: the newer one wins, and the live system
beats both.** Verify before building.

---

---

## NOT IN GIT: these exist on one machine only

Found while building this index, and worth acting on. These documents are not
committed, so they are not on GitHub, not on any other clone, and not in any
backup that covers the repository. If this laptop died they would be gone.

| What | Why it is not in git |
|---|---|
| `BobGo/` in full | `/BobGo/` is listed in `.gitignore` |
| `WhatsApp/` in full, including `Handoff_WhatsApp_Lead_Switchboard_v1.md` | never added |
| `BizUp/docs/katisobiz-site-audit-fixes*.md`, three files | never added |
| `docs/AGENT-QUESTIONS-ANSWERED.md`, `docs/PRODUCT-BRIEF-FOR-AGENTS.md`, `docs/Database/`, `docs/New Builds/` | never added |

`TheDesk/Handoff_Desk_HealthCheck.md` was on this list until 3 August 2026,
when it was committed alongside the phase 2 report that builds from it. The
rest still needs Dewald's call.

The Bob Go one is the odd case: something deliberately gitignored the folder.
Worth deciding whether that was intentional, because the outstanding Bob Go
questions with the courier are recorded in there and Sprint 2 depends on them.

Nothing here is a secret, so committing them is the obvious fix, but it is
Dewald's call and a parallel session may own some of them.

## HOUSEKEEPING

Two Word lock files are sitting in `docs/` and should not be in git:
`~$Care_Client_Email.md` and `~$rtner_Outreach_Emails.md`. They appear when a
`.md` is open in Word. Harmless, but worth adding to `.gitignore`.

When you add a document:

- A handoff or report for a product goes in that product's folder.
- Anything Growth-wide goes in `docs/`.
- Add it to this index, and mark what it supersedes.
- If a spec is finished and its work shipped, move it to the superseded list
  rather than deleting it. The history is worth keeping.
