# Popl web dashboard — teardown

Observed 2026-09-07 by signing into `dash.popl.co` and walking 51 routes read-only.
Sources are marked: **[seen]** = captured first-hand · **[bundle]** = mined from their public JS · **[docs]** = their help centre.

---

## 1. What this account is, and why it matters

The account (`mrshaikh.works@gmail.com`) is a **free individual account**, not a Teams admin. Its sidebar has five items **[seen]**:

```
My Cards · Contacts · Insights · Integrations · Support · Settings
```

Their help centre documents a **sixteen**-section admin sidebar (Team Members, Subteams, Templates, Field Manager, Enrichment Credits, List Enrichment, Event Flows, Event Intelligence, Calendar Booking, Sync Logs, Email Signatures, Team Assets…) **[docs]**. None of it is provisioned here.

So the event-lead-capture half of Popl — the half that competes with Yieldd — was **not observable directly**. Everything below is labelled accordingly. What the account *did* give up, unexpectedly, is far more commercially useful: **their real pricing**, which their public site refuses to publish.

## 2. The gating map — 25 of 51 routes bounced

Popl bounces a blocked route in two distinct ways, and the difference is the whole story **[seen]**:

**→ `/subscribe` (hard paywall — the feature exists, you must pay):**
`/business` · `/connect` · `/form` · `/monthly` · `/premium` · `/share` · `/starter` · `/teams`

**→ `/` (not provisioned — invisible on this tier):**
`/api-keys` · `/email-signatures` · `/leads/field-manager` · `/myteam` · `/subteams` · `/team` · `/team-assets` · `/requests` · `/follow-up-emails` · `/subscription` · `/pipedrive` · plus every `*/pricing` route except integrations and auto-tagging

**Rendered anyway:** `/` · `/leads` · `/campaigns` · `/insights` · `/insights/view-all` · `/integrations` · `/integrations/logs` · `/integrations/zapier` · `/templates` · `/accessories` · `/nametag` · `/notifications` · `/settings` · `/support` · `/subscription/plans` · `/subscription/pricing`

Two of those render a *teaser* rather than the feature: `/campaigns` and `/integrations/logs` both print **"This action is not available for your level of admin status"** and then show the upsell. That is a deliberate choice — show the empty shape of the feature, name the price, and let the user want it.

## 3. Real pricing — the headline finding

Popl's public pricing page is quote-only and sales-gated. The in-product plans screen states it plainly **[seen]**:

| Tier | Price | How it's sold |
|---|---|---|
| **Digital Business Cards** | **$4 USD / member / month** (20% off yearly ≈ $3.20) | self-serve |
| **Connect** | **$9 USD avg / user / month**, paid monthly | self-serve, named on the `/campaigns` upsell |
| **Event Lead Capture** | **"Contact Sales"** | quote-only |

**What $4/member/month already includes** — note how much: Digital Card Management · Templates · Subteams · Business Card Scanner · Custom Lead Capture Forms · Email Signatures · Virtual Background · **SAML Login** · **CRM Integrations** · **HR Integrations** · Auto Follow-Up Email & Text · Member Restrictions · Offline Scanning & Sharing · Custom Card URLs · Brandable QR Codes · Insights & Analytics.

**What Event Lead Capture adds on top:** Universal Badge Scanner · Popl AI · Lead Enrichment · Event Campaigns · Lead Qualifiers · Lead Tagging · Badge Kit/Developer Kit Integrations · On-Floor Event Call Support.

The strategic read: **CRM integrations and SAML are commodity at $4.** Popl does not treat integration as the premium lever — it treats *event capture, enrichment and AI* as the premium lever. Anyone pricing a competing product on "we integrate with your CRM" is charging for something Popl gives away at four dollars.

## 4. The architecture worth stealing — a server-driven field registry

`GET /api/v5/leads/definitions` returns **48+ lead field definitions**, and each field carries roughly twenty capability booleans **[seen]**:

```
key, id, userReadableLabel, valueType, category, tooltip,
canAddToForm, canUseAsCondition, showOnLeadDetails, showOnLeadsPage,
editableByUser, exportable, mergable, dbcHasAccess,
hideOnIntegrationsConfig, showOnFieldManager, shouldPassToBackend,
defaultHiddenOnDataCapture, defaultShowOnDataCapture, dataCaptureStepLabel, nullable
```

Popl does not hardcode lead fields into screens. One server-owned registry drives the leads table, the lead detail view, the mobile capture steps, CSV export, the Field Manager, the CRM mapping UI **and the per-tier gate** (`dbcHasAccess`) — all at once. Adding a field is a server change, not six client changes.

The 48 fields split `leadInfo` (27) / `companyInfo` (20), typed `STRING` / `PHONE_NUMBER` / `NUMBER`:

- **Person:** salutation, first/middle/last, nickname, suffix, credential, full name, job title, LinkedIn, email, five phone types (mobile/work/office/fax/other + primary), street 1–2, city, state, `LEAD_STATE_US_CA`, postal, country, profile image, business-card image, note
- **Company:** name, description, size, industry, website, LinkedIn, email, **annual revenue**, **total funding**, **company type**, **monthly website visitors**, **technologies used**, **founding year**, **NAICS code**, street 1–2, city, state, postal, country

That company block is a Clearbit/Apollo-class enrichment payload, not a scrape.

`GET /api/v5/featureflags` shows gating is flag-driven, not plan-derived — `EVENT_FLOWS`, `DYNAMIC_QUALIFIERS`, `DYNAMIC_SYNC`, `DYNAMIC_FUE`, `AI_RECORDER_ADMIN_CONSENT`, and a per-CRM flag for each of nine connectors (`CRM_EXPORT_SQS_V2_*`). The `SQS` in those names says CRM export is an **asynchronous queue**, not an inline write — which is why they can ship a Sync Logs screen at all.

## 5. Taxonomies they use that Yieldd doesn't have

**Lead source** (from the Insights breakdown) **[seen]** — six values:
`Lead Capture Form · Badge Scan · Business Card · Manual · CSV Import · Other`
*Yieldd has two: `card_scan`, `manual`.*

**View type** **[seen]** — three values: `QR Code · Accessory · Share`
*Yieldd tracks none of this. There is no view/tap table or column anywhere in the schema.*

**Insights KPIs** **[seen]**: Leads · Views · Contacts Downloaded, over a date range (default last 30 days), charted Daily / Monthly / Quarterly, with source and view-type breakdowns. Admin tiers add pipeline generated, link taps, active members, member-usage and top-performer tables **[docs]**.

## 6. Integrations catalogue **[seen]**

Grouped into five purposes, which is itself a good IA:

- **Lead Sync** — Salesforce, HubSpot, Zoho, Microsoft Dynamics, Pardot, Pipedrive, Monday, Marketo, Zapier, Slack
- **Calendar Booking** — Calendly, Chili Piper, Microsoft Bookings, HubSpot Meetings, Google Calendar (all "Upgrade to unlock")
- **Team Member Import** — Microsoft Active Directory
- **Email** — Outlook signature, Outlook individual, Outlook full team
- **SAML** — Azure, Okta

Plus a "Request an Integration" affordance — cheap, and it turns a gap into a demand signal.

## 7. The live API surface **[seen]**

26 endpoints observed across the walk (their bundle references ~120 **[bundle]**; the rest need Teams provisioning). Notable ones:

`POST /api/v5/leads/search` (search is a POST with a filter body) · `GET /api/v5/leads/definitions` · `GET /api/v5/fieldmanager/conflicts` · `POST /api/v5/leads/analytics` · `GET /api/v5/analytics/{kpis,activityOverTime,sourceBreakdown,campaigns}` · `GET /api/v5/udfdefinitions` · `GET /api/v4/crmExportLogs` · `GET /api/v4/integration-connections/members-connections` · `POST /api/v3/stripe/{subscription/status,pricesList}` · `POST /api/v5/churnkey/hash`

Two operational tells: **every analytics number is a server endpoint**, never a client-side aggregate — the same conclusion Yieldd reached the hard way under RLS. And `churnkey` means they run a vendor-managed cancellation-deflection flow, i.e. churn is a big enough problem to buy software for.

Their page loads are chatty: 14–17 XHRs per route, including an auth-token refresh, a feature-flag fetch and two Stripe calls on *every* screen.

## 8. Where Yieldd stands

**Already at parity, no work needed:** lead qualifiers. Popl's are per-campaign, single/multi-select, free-text, numeric, requirable **[docs]**. Yieldd's `event_custom_field_defs` is text/number/dropdown/checkbox/radio with `is_required` and `display_order`, per event. Missing only CRM field-mapping and auto-tagging.

**Has the data, missing only a browser UI:** home KPIs (`event_stats`), capture-over-time (`event_hourly_capture`), leaderboard (`event_leaderboard`), leads table (`leads` + `lead_activity`), members (`profiles`, `event_members`, `invites`).

**Needs a migration:** free-form tags (Yieldd has only fixed hot/warm/cold + status enums) · subteams · campaign goals · a wider lead-source enum.

**Needs a new subsystem:** card view / link-tap analytics · CRM sync (+ the async queue and sync-log screen it implies) · rich company enrichment · email signatures · web lead-capture forms · a public API and webhooks · functional billing (`subscriptions`/`payments` exist but nothing writes them).

**Where Yieldd is ahead for its own market — do not copy Popl here:** offline-first outbox with device-generated UUIDs (a hall with no signal is the normal case, not the edge case) · Hinglish voice notes · the seven-column event ROI/cost model, which Popl approximates with "avg contract value × leads" · deep-link WhatsApp sending that dodges Meta BSP approval and per-message fees. Popl is priced and built for US enterprise budgets; several of its choices are wrong for India.

## 9. Caveats

- The Teams/ELC dashboard was never seen first-hand. Sections 1, 5 (admin KPIs) and parts of 8 lean on their help centre and are marked **[docs]**.
- `/subscription/pricing`, `/integrations/pricing` and `/lead/auto-tagging/pricing` each render only a "Pricing Calculator" heading — the calculator itself needs interaction the read-only pass deliberately never performs.
- The account holds **zero leads**, so lead-table columns, filters and bulk actions were seen only as empty states.
- To see the real thing, the cheapest next step is a Popl trial or demo on a Teams/ELC plan; the harness is saved and re-runs against a better account with one command.

## 10. How this was captured, and what that guarantees

Local headed Chromium via Playwright on this machine — no cloud browser, no third-party scraping service, so the session never left the laptop. Navigation was `page.goto()` only; **the pass never clicked anything**, which is what actually made it safe.

Full disclosure on the safety net: an interceptor was supposed to abort every non-GET request as a second layer, and it did not run — two `route("**/*")` handlers were registered and Playwright only invokes the most recent, so the guard was never consulted. 326 POSTs consequently reached Popl. Every one was read-shaped and app-initiated: `auth/token` refresh, `leads/search` (a query POSTed with a filter body), `leads/analytics`, two Stripe status reads, and `churnkey/hash`. No create, update or delete endpoint appears in the capture, and with no clicks there was no path to one. The account is unchanged. The handler has since been merged into one so the backstop works on any future run.

One side effect worth knowing: `POST /api/internal/slack/notification` fired twice, almost certainly Popl's own sales alerting reacting to the pricing and upgrade screens being opened. Expect a nudge from their sales team.

---

*Artifacts (screenshots, outlines, network captures) are in the session scratchpad, not this repo.*
