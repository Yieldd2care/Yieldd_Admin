# Yieldd web dashboard — build blueprint

Derived from the Popl teardown (`popl-dashboard-teardown.md`) and the current Yieldd codebase.

---

## The problem this solves

Yieldd is one Expo bundle. A signed-in browser visitor is sent to `/(app)` and gets the phone UI stretched wide — mobile tab bar, mobile sheets, mobile-width cards. The only genuinely web-native surface in the repo is the public card page `app/c/[slug].tsx`.

An admin running a trade show therefore does everything on a phone: reviewing a day's leads, checking rep performance, exporting, reassigning. Popl's entire manager story is a desktop surface, and this is the widest structural gap between the two products.

The encouraging half: **Yieldd's schema is much stronger than its UI.** `event_stats`, `event_hourly_capture`, `event_leaderboard`, `lead_activity`, `message_sends`, `message_batches` and `event_custom_field_defs` all exist and are RLS-correct. Much of a manager dashboard is already queryable and simply has no browser surface.

## Decision 1 — where it lives

**Recommendation: a `(dash)` route group inside the existing Expo Router app, web-only.**

The repo already proves the split-surface pattern works — `AuthFormWeb` and `AuthFormNative` sit behind one route and diverge only in layout. A `(dash)` group reuses the Supabase client, the auth session, the RLS helpers and the money-formatting utilities with no duplication.

Against: `master` deploys straight to yieldd.co, so anything landing there is a website release. Mitigate by keeping `(dash)` behind the existing signed-in redirect and shipping it dark until it's ready.

The alternative — a separate Next/Vite app — buys better desktop ergonomics and costs a second auth integration, a second deploy target and a permanent risk of the two drifting. Not worth it at this stage.

## Decision 2 — adopt a server-driven field registry

This is the single most transferable idea from Popl, and it should be settled **before** any dashboard screen is written, because it changes what those screens are.

Popl serves one `leads/definitions` registry of ~48 fields, each carrying capability flags (`showOnLeadsPage`, `showOnLeadDetails`, `canAddToForm`, `exportable`, `editableByUser`, `mergable`, `dbcHasAccess`). The leads table, lead detail, mobile capture, CSV export, field manager, CRM mapping and per-tier gating all render from that one list.

Yieldd currently hardcodes its lead columns in every screen — the list, the detail view, the export column picker and the capture confirm screen each know the field set independently. Adding `company_landline` meant touching all of them.

Proposed: a `lead_field_defs` table (or a versioned JSON served by an Edge Function) with `key`, `label`, `value_type`, `category`, `display_order` plus the same capability booleans, including a `plan_tier` gate. Then the web dashboard's table and the phone's capture screen are both projections of it.

Do this first. Building the dashboard on hardcoded columns bakes the current duplication into a second client.

## Screen plan

Order is by value-per-unit-of-work — everything in tier 1 is UI over data that already exists.

### Tier 1 — data exists, needs only a browser surface

| Screen | Data source (already in repo) | Notes |
|---|---|---|
| **Home** | `event_stats`, `active_event_count` | KPI row + active events + recent leads. Add a **setup checklist** — Popl's is 5 steps and visibly drives activation |
| **Leads** | `leads`, `lead_activity` | The screen that most needs a desktop: wide table, multi-column sort, bulk select |
| **Lead detail** | `leads`, `lead_activity`, `voice_notes`, `message_sends` | Activity timeline is already modelled with 10 activity types — surface it |
| **Event dashboard** | `event_stats`, `event_hourly_capture`, `event_leaderboard` | The hourly capture chart and leaderboard exist and are unused on web |
| **ROI** | seven event cost columns + `total_cost_paisa` | Yieldd's cost model is *more* precise than Popl's "avg contract value × leads" — lead with it |
| **Members** | `profiles`, `event_members`, `invites` | Invite, deactivate, reassign |
| **Export** | existing CSV builder | Reuse the formula-injection escaping already tested by `verify:csv` |

**Aggregate rule, non-negotiable:** every metric goes through a security-definer function. Under RLS a rep's client-side count is silently a fraction of the truth — this has already bitten this codebase once. Popl reaches the same conclusion from the other direction: every number on their dashboard is a server endpoint (`/v5/analytics/*`), never a client aggregate.

### Tier 2 — needs a migration

- **Tags** — free-form labels on leads. Yieldd has only fixed `temperature` (hot/warm/cold) and `status` enums. Popl treats tags as a first-class filter, bulk action and CRM-mapping target.
- **Wider lead source enum** — Yieldd has `card_scan` / `manual`; Popl distinguishes six, and the breakdown is a headline Insights chart. Add at least `qr`, `form`, `csv_import`.
- **Saved views / segments** on the leads table.
- **Campaign goals** — `events` already carries dates, costs and templates; a target lead count turns the event dashboard into a progress screen.
- **Subteams** — only if Yieldd starts selling to orgs with more than one sales pod. Not urgent.

### Tier 3 — new subsystems, in priority order

1. **Card analytics.** Yieldd tracks *nothing* about `/c/{slug}` — no views, taps, or saves, no table, no column. Popl's Insights is half view-based. This is the cheapest new subsystem (one append-only events table + the public page firing an insert) and it unlocks a whole Insights half.
2. **Billing.** `subscriptions` and `payments` exist and nothing writes them; the Upgrade sheet's "Pay with UPI" jumps straight to the success screen. Popl's $4 and $9 price points are useful anchors for what Yieldd charges in ₹.
3. **CRM sync.** Model it as an async queue with a **Sync Logs screen**, the way Popl does (`CRM_EXPORT_SQS_V2_*`, `/v4/crmExportLogs`). Note this is *not* a premium differentiator — Popl ships it at $4/member/month.
4. **Web lead-capture form** — `/form`. Blocked today by `leads.event_id` being `NOT NULL`.
5. **Public API / webhooks.**

## The constraint to confront

`leads.event_id` is `NOT NULL`. Yieldd has no concept of a lead captured outside an event; Popl's campaign model is looser and a lead can exist with no campaign.

This blocks a web capture form, any always-on QR, and CSV import of a general contact list. Decide deliberately: either keep the constraint (event-scoping is a genuine product opinion and it makes ROI attribution exact), or relax it to nullable and give the ROI queries an explicit "unattributed" bucket. Do not discover this halfway through building the form.

## What not to copy

Popl is priced and built for US enterprise budgets. Several of its choices are wrong for Yieldd's market:

- **Enrichment depth.** Their company block carries annual revenue, total funding, technologies used, NAICS code, monthly visitors — a paid data vendor. For Indian SME exhibitors, Yieldd's scrape-their-website summary is the right cost/benefit.
- **Accessories.** An NFC hardware SKU line is a physical-inventory business. Yieldd is QR + link and should stay there.
- **Email-first follow-up.** Yieldd's WhatsApp deep-link sending dodges Meta BSP approval and per-message fees. That is an advantage in this market, not a gap.
- **Seat-based pricing.** $4/member/month assumes every employee wants a card. Yieldd's buyer is an exhibitor with a stall and a handful of reps for three days.

## Verification

- Every dashboard metric resolves through a security-definer function — sign in as a `rep` and confirm the numbers match the admin's scoped truth rather than silently under-reporting.
- The leads table, export column picker and capture confirm screen all render from the same field registry; adding a test field to it appears in all three with no client change.
- `(dash)` routes are unreachable while signed out and on native.
- Existing suites still pass, `verify:csv` included.

---

*Companion document: `popl-dashboard-teardown.md`. Capture artifacts are in the session scratchpad, not this repo.*
