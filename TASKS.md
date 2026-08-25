# Yieldd — MVP Task Breakdown

Everything needed to take the app from "database exists, auth screens look right" to a working MVP matching [MVP_PLAN.md](MVP_PLAN.md) and [ui-development-plan-v1.md](ui-development-plan-v1.md). Cross-references screen codes (E1, F3, H3, etc.) from the UI plan and table names from [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) throughout, so you can jump between the three documents.

**Status legend:** `Not Started` · `In Progress` · `Complete`

---

## Progress overview

| Phase | Area | Status | Tasks | Depends on |
|---|---|---|---|---|
| 0 | Foundation (DB, RLS, auth config) | **Complete** | — | — |
| 1 | Authentication integration | Not Started | 6 | Phase 0 |
| 2 | Core feature flow (capture) | Not Started | 15 | Phase 1 |
| 3 | Secondary features (leads, follow-up, dashboards, card) | Not Started | 19 | Phase 2 |
| 4 | Monetization (payment gateway) | Not Started | 7 | Phase 1 |
| 5 | Pro/premium feature gating | Not Started | 6 | Phases 3 & 4 |
| 6 | Settings and polish | Not Started | 6 | Phase 3 |

**Screens with real UI today:** 4 of 41 (auth sign-in/sign-up, fork question, web landing page, an `(app)` placeholder home screen with no actual capture functionality).
**Database tables wired to any UI:** 0 of 14 (schema is live on Supabase; nothing in the app talks to it yet — that connection was built and then deliberately reverted to keep this session's scope to "database only").

### Dependency order, plainly
Phase 1 unblocks everything (nothing else can write real data without a real signed-in user). Phase 2 unblocks Phase 3 (leads/events must exist before you can list, follow up on, or report on them). Phase 4 only needs Phase 1 — you can build the payment flow in parallel with Phase 2/3 if useful, but Phase 4 is **blocked on you registering a payment gateway** (see Phase 4 note). Phase 5 needs both real features to gate (Phase 3) and a real `plan_tier` source (Phase 4, or a manual flip in the meantime — see below). Phase 6 is cleanup once the core app works.

---

## Phase 0 — Foundation *(Complete)*

Already done this session, no action needed:
- 14 tables, enums, indexes, RLS policies, helper functions (`is_pro_user()`, `can_use_ai()`, `current_organization_id()`, `is_admin()`, `find_duplicate_lead()`) — see [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)
- `handle_new_user()` trigger (signup → `organizations` + `profiles`, or attach to an org via invite token)
- Auto-confirm enabled on Supabase Auth (no email verification step)
- Supabase project linked, migrations applied, GitHub repo pushed

---

## Phase 1 — Authentication integration

*Depends on: Phase 0.*

This exact work was implemented and verified working earlier this session, then reverted to keep that turn scoped to database-only. Redoing 1.1–1.4 is short — see the conversation for the working version.

### 1.1 — Supabase client
- **Status:** Not Started
- **Files:** `lib/supabase.ts` (new)
- **Description:** Recreate the client singleton — `createClient` with `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` (already in `.env`), AsyncStorage as the auth storage adapter, `persistSession: true`, `autoRefreshToken: true`.
- **Acceptance criteria:** App builds; `supabase.auth.getSession()` resolves without throwing on a cold start.

### 1.2 — Real auth in the session store
- **Status:** Not Started
- **Files:** `stores/useSessionStore.ts`, `types/session.ts`
- **Description:** Replace the mock with `supabase.auth.signUp` / `signInWithPassword` / `signOut`. `signUp` passes `full_name`/`company_name` as signup metadata (the trigger already reads these). After auth, fetch the `profiles` row joined with `organizations(name)` to populate `user`. Make `signUp`/`signIn` async and return `{ error: string | null }` so the UI can show real failures.
- **Acceptance criteria:** Creating an account produces one row each in `organizations` and `profiles`. Signing in with the wrong password returns an error string instead of throwing. Signing out clears `user` and the Supabase session.

### 1.3 — Session restore on launch
- **Status:** Not Started
- **Files:** `app/_layout.tsx`
- **Description:** Call an `initialize()` store action on mount (checks `getSession()`, fetches profile if present, subscribes to `onAuthStateChange`). Keep the splash screen visible until both fonts *and* the session check are ready.
- **Acceptance criteria:** Force-quitting and reopening the app while logged in lands directly in `(app)`, never flashes the auth screen first.

### 1.4 — Auth screen error/pending UX
- **Status:** Not Started *(the screen's layout, branding, and keyboard handling are already done)*
- **Files:** `app/(auth)/index.tsx`
- **Description:** Make `handleSubmit` async, disable the button and show a pending label while in flight, render the returned error inline.
- **Acceptance criteria:** A duplicate-email signup or wrong-password sign-in shows a visible message; the button can't be double-tapped mid-submit.

### 1.5 — Rep invite acceptance
- **Status:** Not Started
- **Files:** `app/(auth)/index.tsx` or a new `app/(auth)/invite.tsx`, deep-link handling in `app.json`
- **Description:** Per D3/B4 ("rep invite deep links bypass B3 and B4 entirely"): a rep tapping a WhatsApp invite link should land on signup with the `invite_token` already captured, passed through as signup metadata. `handle_new_user()` already handles the server side (attaches to the existing org + event instead of creating a new org).
- **Acceptance criteria:** A rep who signs up via an invite link ends up with `role = 'rep'` in the inviter's org, an `active` row in `event_members` for the invited event, and skips the fork screen entirely.

### 1.6 — Fork screen makes a real choice
- **Status:** Not Started *(UI exists, both buttons currently do the same no-op routing)*
- **Files:** `app/(auth)/fork.tsx`
- **Description:** "For my team" → event creation flow (Phase 2, D1). "Just me" → digital card builder (Phase 3, C1). Neither should just drop into the empty `(app)` home.
- **Acceptance criteria:** Each option visibly leads somewhere different.

---

## Phase 2 — Core feature flow (capture)

*Depends on: Phase 1. This is the product — MVP_PLAN calls the 4-second capture "the single most important interaction decision in the build."*

### Infrastructure (build before the screens that need it)

#### 2.1 — Offline-first local queue
- **Status:** Not Started
- **Files:** new `lib/offlineQueue.ts` (or equivalent), likely `expo-sqlite` or an AsyncStorage-backed queue
- **Description:** Captures must never wait on network — MVP_PLAN: *"the image is stored and the screen advances immediately... the rep never waits for OCR."* Leads/voice notes get written to a local queue first, then synced to Supabase in the background when connectivity returns. **Open design decision:** plain AsyncStorage queue + a sync loop, vs. `expo-sqlite`, vs. a library like WatermelonDB or PowerSync — worth a quick discussion before building, since it's the foundation everything in this phase writes through.
- **Acceptance criteria:** Airplane mode: capturing a lead still saves locally and shows success. Reconnecting drains the queue without duplicating rows (idempotent — a `client_id` or similar on each queued item to dedupe against `leads.id`).

#### 2.2 — Storage buckets
- **Status:** Not Started
- **Files:** new `supabase/migrations/*_storage_buckets.sql`
- **Description:** Two private buckets, `card-images` and `voice-notes`, with RLS policies mirroring the `leads`/`voice_notes` table policies (flagged as open item in DATABASE_SCHEMA.md §9). Blocks 2.5 and 2.9.
- **Acceptance criteria:** An authenticated rep can upload to their own event's folder; another org's rep gets denied.

#### 2.3 — Card OCR extraction (Edge Function)
- **Status:** Not Started
- **Files:** new `supabase/functions/extract-card/index.ts`
- **Description:** Triggered after a card image uploads (via a DB webhook or client-invoked call). Calls Anthropic (`ANTHROPIC_API_KEY` already in `.env`) with the image, extracts name/company/designation/phone/email, writes them to the `leads` row, flips `extraction_status` to `completed` or `failed`.
- **Acceptance criteria:** Uploading a real business card photo populates the lead's fields within a few seconds without the rep waiting on the capture screen for it.

#### 2.4 — Voice transcription + summary pipeline (Edge Function)
- **Status:** Not Started
- **Files:** new `supabase/functions/transcribe-voice-note/index.ts`
- **Description:** Triggered after a voice note uploads. Deepgram (`DEEPGRAM_API_KEY`) for transcript, then an LLM call for the summary. Writes `transcript`/`summary`/`transcribed_at`, flips `transcription_status`. Per MVP_PLAN's flagged risk: *"judge success on whether the summary is useful, not whether the transcript is word-perfect."*
- **Acceptance criteria:** A recorded voice note shows a transcript and summary in the lead detail screen (Phase 3, F2) after sync, without the rep having to do anything.

### Event setup (D1–D6) — required before any capture, since every lead needs an `event_id`

#### 2.5 — Create event (D1)
- **Status:** Not Started
- **Files:** new `app/(app)/events/new.tsx`
- **Table:** `events`
- **Acceptance criteria:** Creates a row with `organization_id`/`created_by` set. On a Free org with an existing `upcoming`/`live` event, the RLS insert rejection surfaces as a clear "upgrade to create a second event" message, not a raw Postgres error.

#### 2.6 — Event cost (D2)
- **Status:** Not Started
- **Files:** part of the event creation flow above, or `app/(app)/events/[id]/cost.tsx`
- **Table:** `events` (the five `cost_*_paisa` columns)
- **Acceptance criteria:** `total_cost_paisa` (generated column) reflects whatever subset of the five fields was filled in.

#### 2.7 — Invite reps (D3)
- **Status:** Not Started
- **Files:** `app/(app)/events/[id]/invite.tsx`
- **Table:** `invites`
- **Acceptance criteria:** Each row added creates a `pending` `invites` record with a unique token and opens a WhatsApp deep link pre-filled with the invite text.

#### 2.8 — Custom fields (D4)
- **Status:** Not Started
- **Files:** `app/(app)/events/[id]/fields.tsx`
- **Table:** `event_custom_field_defs`
- **Acceptance criteria:** Fields defined here appear as real inputs on the confirm-lead screen (2.12) for that event.

#### 2.9 — Message templates (D5)
- **Status:** Not Started
- **Files:** `app/(app)/events/[id]/templates.tsx`
- **Table:** `events.whatsapp_template` / `email_template`
- **Acceptance criteria:** Saved templates are what pre-fill the bulk-send screen later (Phase 3, F4).

#### 2.10 — Setup complete (D6)
- **Status:** Not Started
- **Files:** `app/(app)/events/[id]/complete.tsx`
- **Acceptance criteria:** Summary screen only, no new writes; routes into the home/scan screen (2.11) with this event as current.

### Capture (E1–E7) — the loop reps live in all day

#### 2.11 — Home / scan (E1)
- **Status:** Not Started *(current file is a placeholder with no scan button or event context)*
- **Files:** `app/(app)/index.tsx`
- **Description:** Offline-ready banner, dominant SCAN button, today's capture count (`leads` count by `captured_by` + current event + today), current event name, entry points to lead list and follow-ups.
- **Acceptance criteria:** Capture count matches the actual number of `leads` rows captured today by the signed-in rep.

#### 2.12 — Camera capture (E2)
- **Status:** Not Started
- **Files:** new `app/(app)/capture/camera.tsx`, `expo-camera`
- **Acceptance criteria:** Tapping capture advances to the confirm screen (2.13) immediately — the photo write and any upload happen after navigation, never blocking it.

#### 2.13 — Confirm lead (E3)
- **Status:** Not Started
- **Files:** new `app/(app)/capture/confirm.tsx`
- **Table:** `leads` (insert), calls `find_duplicate_lead()` RPC
- **Acceptance criteria:** Saving inserts a `leads` row via the offline queue (2.1) with `captured_by` = current rep, correct `event_id`, `consent_given`/`consent_at` from the toggle. If `find_duplicate_lead()` returns a match, the duplicate flag (2.14) shows before save completes.

#### 2.14 — Duplicate detail (E4)
- **Status:** Not Started
- **Files:** new `components/capture/DuplicateFlag.tsx`
- **Description:** Read-only peek via the `find_duplicate_lead()` RPC — deliberately narrow per MVP_PLAN ("reps do not browse each other's leads"); this is the one sanctioned exception.
- **Acceptance criteria:** Shows who captured the earlier contact, when, and their note/summary — nothing else about that rep's other leads is reachable from here.

#### 2.15 — Manual entry (E5)
- **Status:** Not Started
- **Files:** new `app/(app)/capture/manual.tsx`
- **Table:** `leads` (insert, `source = 'manual'`)
- **Acceptance criteria:** Name + phone save in under 15 seconds of interaction — no required fields beyond those two.

#### 2.16 — Voice note recording (E6)
- **Status:** Not Started
- **Files:** new `app/(app)/capture/voice.tsx`
- **Table:** `voice_notes` (insert)
- **Description:** On a Free org past 3 voice notes, the RLS `can_use_ai()` check rejects the insert — catch that specific failure and show the voice-lock upsell (Phase 5, 5.5) instead of a generic error.
- **Acceptance criteria:** Recording, playback, re-record, delete all work locally before upload; the 4th voice note on a Free org shows the lock message, not a crash.

#### 2.17 — Save confirmation (E7)
- **Status:** Not Started
- **Files:** new `app/(app)/capture/saved.tsx`
- **Acceptance criteria:** Shows the captured lead's name and the day's running count, then auto-returns to scan (2.11). Free-org lead-101 upsell (Phase 5, 5.1) fires *after* this renders, never instead of it.

---

## Phase 3 — Secondary features

*Depends on: Phase 2 (needs real `leads`/`events` to operate on).*

### Lead management (F1–F5)

#### 3.1 — Lead list (F1)
- **Status:** Not Started · **Files:** new `app/(app)/leads/index.tsx` · **Table:** `leads`
- **Acceptance criteria:** Reps see their own captured/assigned leads by default; admins see all leads in the event (matches the RLS policy exactly — nothing extra to build server-side).

#### 3.2 — Lead detail (F2)
- **Status:** Not Started · **Files:** new `app/(app)/leads/[id].tsx` · **Tables:** `leads`, `voice_notes`, `lead_activity`
- **Acceptance criteria:** Editing a field, changing status, or reassigning (admin only — DB trigger already blocks reps from changing `assigned_to`) all persist and show up in the activity log.

#### 3.3 — Evening review (F3)
- **Status:** Not Started · **Files:** new `app/(app)/leads/review.tsx`
- **Description:** The 10-minute ritual MVP_PLAN says the whole CRM/ROI layer depends on. Queue of today's leads missing a note, one at a time; hot/warm/cold tap; follow-up date.
- **Acceptance criteria:** Stepping through 47 leads and marking/dating each takes a real user well under 10 minutes (informal test, not automatable, but keep the interaction count per lead minimal).

#### 3.4 — Bulk select and send (F4)
- **Status:** Not Started · **Files:** new `app/(app)/leads/bulk-send.tsx`
- **Acceptance criteria:** Selecting N leads and a channel previews the event's template (2.9) with merge fields filled per lead.

#### 3.5 — Send handoff (F5)
- **Status:** Not Started · **Files:** new `app/(app)/leads/send-queue.tsx` · **Table:** `message_sends`
- **Acceptance criteria:** Each `wa.me`/`mailto:` send logs a `message_sends` row before handing off to the OS; the queue advances to the next lead on return.

### Follow-up and pipeline (G1–G4)

#### 3.6 — Today's follow-ups (G1)
- **Status:** Not Started · **Files:** new `app/(app)/follow-ups/index.tsx` · **Table:** `leads` (`follow_up_date <= today`)
- **Acceptance criteria:** Each entry shows the voice note summary from the original capture — this is explicitly "the payoff for the whole voice feature" per MVP_PLAN.

#### 3.7 — Log outcome (G2)
- **Status:** Not Started · **Files:** new `app/(app)/follow-ups/[id]/outcome.tsx` · **Table:** `lead_activity` (insert), `leads.follow_up_date` (update)

#### 3.8 — Status change (G3)
- **Status:** Not Started · **Files:** part of lead detail (3.2) · **Table:** `leads.status`, `lead_activity`
- **Acceptance criteria:** Selecting "Won" routes into 3.9 before the status change commits.

#### 3.9 — Deal value entry (G4)
- **Status:** Not Started · **Files:** new component used from 3.8 · **Table:** `leads.deal_value_paisa`
- **Acceptance criteria:** Cannot reach "Won" without entering a value — the DB `leads_won_requires_value` check is the backstop, but the UI shouldn't let a rep hit that error in normal use.

### Admin visibility (H1–H4)

#### 3.10 — Event list (H1)
- **Status:** Not Started · **Files:** new `app/(app)/events/index.tsx` · **Table:** `events`

#### 3.11 — Event dashboard (H2)
- **Status:** Not Started · **Files:** new `app/(app)/events/[id]/dashboard.tsx`
- **Description:** Rep-wise live counts, leaderboard (respecting `leaderboard_visible_to_reps`), last-sync timestamp.

#### 3.12 — ROI dashboard (H3)
- **Status:** Not Started · **Files:** new `app/(app)/events/[id]/roi.tsx`
- **Description:** The 9pm screen — MVP_PLAN calls it one of the three moments that decide the product. Cost per lead, ROI %, pipeline value, rep split. Build this one with real design care, not a placeholder table.
- **Acceptance criteria:** Screenshot-friendly layout (admin sends it to their MD per the spec).

#### 3.13 — Export (H4)
- **Status:** Not Started · **Files:** new `app/(app)/events/[id]/export.tsx`, likely an Edge Function generating the `.xlsx`
- **Acceptance criteria:** Produces a real Excel file, shareable via WhatsApp/email/Drive share sheet.

### Digital business card (C1–C4, A3, J2)

#### 3.14 — Card builder + preview (C1, C2)
- **Status:** Not Started · **Files:** new `app/(app)/card/edit.tsx` · **Table:** `business_cards`
- **Acceptance criteria:** Saving creates/updates the one `business_cards` row for this profile (unique constraint already enforces one card per user); QR code renders from the public slug URL.

#### 3.15 — Share sheet (C3)
- **Status:** Not Started · **Files:** part of 3.14, native `Share` API

#### 3.16 — First scan prompt (C4)
- **Status:** Not Started · **Files:** new `app/(app)/card/first-scan.tsx`

#### 3.17 — Hosted public card page (A3)
- **Status:** Not Started · **Files:** new `app/(web)/card/[slug].tsx`
- **Description:** Unauthenticated, must render on any device/browser. Reads `business_cards` by slug — RLS already allows public `select` where `is_published = true`.
- **Acceptance criteria:** Opens correctly with no app installed, on a slow connection; save-to-contacts (vCard) works.

#### 3.18 — Profile/card edit (J2)
- **Status:** Not Started · **Files:** new `app/(app)/settings/card.tsx` (same fields as 3.14, reused)

#### 3.19 — Save lead to phone contacts
- **Status:** Not Started · **Files:** part of 3.2 (lead detail) and 2.17 (save confirmation) · **Table:** `leads.saved_to_contacts`
- **Description:** Free-tier feature explicitly called out in MVP_PLAN — don't let it slip behind a Pro gate by accident in Phase 5.

---

## Phase 4 — Monetization (payment gateway)

*Depends on: Phase 1 only — can be built in parallel with Phase 2/3.*

> **Flag before starting:** your instructions here said "Monetization (Stripe)," but every earlier decision in this project (MVP_PLAN's "one tap to pay, UPI," the sales-room framing, `DATABASE_SCHEMA.md`'s `subscriptions.provider` default) pointed at **Razorpay** as the Indian UPI processor, and you've said no gateway is registered yet either way. Confirm which one before 4.2 — the schema doesn't care (it's a `text` column), but the Edge Function code does.

#### 4.1 — Register a payment gateway
- **Status:** Not Started — **blocked on you**, not a code task. Nothing else in this phase can go live without it (the app itself doesn't need to wait, per Phase 4/5 notes on manual `plan_tier` flips).

#### 4.2 — Payment webhook Edge Function
- **Status:** Not Started · **Files:** new `supabase/functions/payment-webhook/index.ts`
- **Description:** Service-role only, per the DATABASE_SCHEMA.md design principle that `plan_tier`/`subscriptions`/`payments` are never client-writable. Verifies the gateway's webhook signature, writes `subscriptions` + `payments`, flips `organizations.plan_tier`.
- **Acceptance criteria:** A test payment flips the org to Pro within seconds; a failed/refunded payment does not.

#### 4.3 — Free limit sheet (I1)
- **Status:** Not Started · **Files:** new `components/monetization/FreeLimitSheet.tsx`
- **Acceptance criteria:** Appears after the save confirmation (2.17) renders, never instead of it — repeats every 25 leads past 100, not every lead.

#### 4.4 — Upgrade modal (I2)
- **Status:** Not Started · **Files:** new `components/monetization/UpgradeModal.tsx`
- **Description:** One component, four trigger variants (`lead_wall`, `voice_lock`, `roi_curiosity`, `second_person`) per the `upgrade_trigger` enum already in the DB — don't build four separate screens.
- **Acceptance criteria:** "WhatsApp to sales" action works today with zero gateway dependency; "Pay with UPI"/checkout only needs to work once 4.1/4.2 exist.

#### 4.5 — Payment success (I3)
- **Status:** Not Started · **Files:** new `app/(app)/payment/success.tsx`

#### 4.6 — Payment failure (I4)
- **Status:** Not Started · **Files:** new `app/(app)/payment/failure.tsx`
- **Description:** Explicitly reassure the user nothing was lost and no money was taken — MVP_PLAN flags UPI failing more on congested venue networks than in testing.

#### 4.7 — Upgrade funnel logging
- **Status:** Not Started · **Files:** wherever 4.3/4.4 render · **Table:** `upgrade_events`
- **Acceptance criteria:** Every shown/dismissed/upgraded action for all four triggers produces a row — this is your actual monetization funnel data.

---

## Phase 5 — Pro/premium feature gating

*Depends on: Phase 3 (features must exist to gate) and Phase 4 (for a real `plan_tier`) — though you can test all of this before Phase 4 finishes by manually flipping a test org's `plan_tier` from the Supabase dashboard, since it's intentionally not client-writable.*

Per MVP_PLAN: **"greyed rather than hidden, so the user knows what exists"** — every gate below is a visual/UX treatment, not a removed feature.

#### 5.1 — Custom fields gate (D4)
- **Status:** Not Started · **Files:** 2.8

#### 5.2 — ROI dashboard gate (H3)
- **Status:** Not Started · **Files:** 3.12
- **Description:** Exact copy from MVP_PLAN: *"Add your event cost to see ROI — Pro."*

#### 5.3 — Follow-up pipeline gate (G1–G4)
- **Status:** Not Started · **Files:** 3.6–3.9

#### 5.4 — Team invites gate (D3, J3)
- **Status:** Not Started · **Files:** 2.7, 6.x team management
- **Note:** the DB does not hard-block a second `event_members` row on Free (deliberate — see DATABASE_SCHEMA.md §9, item 2). This gate is app-level only; flag if you'd rather it be a hard DB block too.

#### 5.5 — Voice lock upsell copy (E6)
- **Status:** Not Started · **Files:** 2.16
- **Description:** The DB already hard-blocks the 4th voice note via `can_use_ai()`. This task is just catching that specific RLS error and showing the right message instead of a generic failure.

#### 5.6 — Second-event lock upsell copy (H1)
- **Status:** Not Started · **Files:** 3.10, 2.5
- **Description:** Same pattern as 5.5 — the DB already hard-blocks it (`events_admin_insert` policy); catch the error, show the modal.

---

## Phase 6 — Settings and polish

*Depends on: Phase 3 (most of what's being configured/polished needs to exist first).*

#### 6.1 — Settings screen (J1)
- **Status:** Not Started · **Files:** new `app/(app)/settings/index.tsx`
- **Description:** Profile, team (admin), plan/billing, GST invoices (`payments.gst_invoice_url`), notification prefs, manual sync, storage used, WhatsApp support link, logout.

#### 6.2 — Team management (J3)
- **Status:** Not Started · **Files:** new `app/(app)/settings/team.tsx` · **Table:** `profiles` (status), `invites`
- **Acceptance criteria:** "Deactivating" a rep sets `profiles.status = 'deactivated'` — never deletes the row (the `leads.captured_by` foreign key is `ON DELETE RESTRICT` specifically so this can't be gotten wrong).

#### 6.3 — Offline/sync indicator (shared component)
- **Status:** Not Started · **Files:** new `components/shared/SyncIndicator.tsx`
- **Description:** Visible only when it needs attention — MVP_PLAN: *"sync is invisible unless it fails."* Reads from the offline queue (2.1).

#### 6.4 — Event context bar (shared component)
- **Status:** Not Started · **Files:** new `components/shared/EventContextBar.tsx`
- **Description:** "Which event am I capturing into" — MVP_PLAN calls getting this wrong "the single worst data error in the product." Appears on all capture/lead screens.

#### 6.5 — Empty and error states
- **Status:** Not Started · **Files:** spread across the relevant screens above
- **Checklist** (each is one line of copy + one action, per the UI plan):
  - [ ] No leads yet (lead list)
  - [ ] No follow-ups today (good-news state, not a failure)
  - [ ] No event created (admin skipped setup)
  - [ ] Extraction failed (offer manual entry, keep the image attached)
  - [ ] Camera permission denied (path to Settings)
  - [ ] Microphone permission denied (same)
  - [ ] Sync failed (what failed, what's safe, retry — never imply data loss)
  - [ ] Payment pending verification (UPI can hang)
  - [ ] Free plan, feature locked (greyed, not hidden — reused across Phase 5)

#### 6.6 — Weekly WhatsApp digest + annual renewal message
- **Status:** Not Started · **Files:** new `supabase/functions/weekly-digest/index.ts` (scheduled)
- **Description:** MVP_PLAN's retention mechanism for the ~340 dormant days/year: *"IMTEX: 312 leads · 41 contacted this week · 12 pending · 1 won (₹4.2L) · ROI 35% recovered."* No login required. Needs a scheduled Edge Function (`pg_cron` or Supabase's scheduled triggers) and a WhatsApp send integration — the latter isn't scoped anywhere else in this doc, worth a decision on which WhatsApp API you'll use before building this one.

---

## Notes for whoever picks this up

- Every "Not Started" task in Phases 2–6 assumes Phase 1 is done first — none of them will have a real signed-in user to attach data to otherwise.
- The DB is intentionally ahead of the app right now: RLS already enforces most of the hard rules (won-requires-value, voice-note cap, second-event cap, reassignment-is-admin-only). Several UI tasks above are explicitly "catch this error and show good copy," not "implement this rule" — the rule already exists.
- Update this file's Status column as you go; it's meant to stay the single source of truth for what's left, not a one-time snapshot.
