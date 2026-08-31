# Yieldd — MVP Task Breakdown

Everything needed to take the app from "database exists, auth screens look right" to a working MVP matching [MVP_PLAN.md](MVP_PLAN.md) and [ui-development-plan-v1.md](ui-development-plan-v1.md). Cross-references screen codes (E1, F3, H3, etc.) from the UI plan and table names from [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) throughout, so you can jump between the three documents.

**Status legend:** `Not Started` · `In Progress` · `Complete`

---

## Progress overview

| Phase | Area | Status | Tasks | Depends on |
|---|---|---|---|---|
| 0 | Foundation (DB, RLS, auth config) | **Complete** | — | — |
| 1 | Authentication integration | **Complete** | 6 | Phase 0 |
| 2 | Core feature flow (capture) | **In Progress** | 15 | Phase 1 |
| 3 | Secondary features (leads, follow-up, dashboards, card) | **In Progress** | 19 | Phase 2 |
| 4 | Monetization (payment gateway) | Not Started | 7 | Phase 1 |
| 5 | Pro/premium feature gating | Not Started | 6 | Phases 3 & 4 |
| 6 | Settings and polish | Not Started | 6 | Phase 3 |

**Screens with real UI today:** all 60 route files exist with final design.
**Screens reading or writing the real database:** events (list, wizard, dashboard, ROI, custom fields), capture (confirm, manual, saved, drafts), leads (list, detail, status, deal value), follow-ups, log outcome, team, member detail, reassign, export picker, home.

**Still on mock or placeholder data:** notifications, and payment (the whole of Phase 4).

The digital card screens and the hosted public card page went real in `6e8991e`; the AI company summary in `5e1560e` (built, **not yet deployed** — `supabase functions deploy summarise-company`; its migration is already applied). Duplicate detection and save-to-contacts went real on 2026-08-31, which closes MVP_PLAN's six-step build sequence: only Phases 4–6 remain.

### What was built on 2026-08-28

- **Events** — the create-event wizard writes a real `events` row at step 1 (so a Free plan's one-event refusal arrives on the first screen, not after five), plus invites with per-person tokens, custom field definitions and org-level message templates. Migration `20260828120000` makes whoever creates an event an active `event_members` row — without it the person who built the event was the one person RLS would not let capture on it.
- **Leads** — captured through an offline queue that IS the lead list: a `draft` lead has not reached the server, a `pendingPatch` holds edits that have not landed. Ids are generated on the device with `expo-crypto` and are the real primary key, so a replayed insert collides instead of duplicating.
- **Team** — `profiles` and `invites`, with seats from `seats_included + seats_purchased`. Deactivating is reversible.
- **Event figures** — migration `20260828140000` adds `event_stats`, `event_hourly_capture` and `event_leaderboard` as `security definer` aggregates. Necessary, not tidy-up: `leads_select_own_or_admin` hides other reps' leads, so counting on the device gave a rep a fraction of the total and cost-per-lead then divided the full event cost by that fraction. Money is admin-only and the database returns NULL for a rep rather than trusting the client to hide it.

These checks are runnable at any time:

```
npm run verify:roi            # 31 arithmetic checks on lib/roi.ts
npm run verify:stats          # 32 checks against the live database, cleans up after itself
npm run verify:card           # card reading + the storage upload rules, end to end
npm run compare:card-models   # accuracy/latency/tokens per model, to justify the choice
npm run verify:voice          # recording -> upload -> transcript -> summary, plus the free-plan cap
npm run verify:messaging      # merge fields and wa.me/mailto links — the text customers actually read
npm run verify:csv            # export escaping, incl. Excel formula injection
npm run verify:phone          # 20 checks on phoneMatchKey — mirrors the duplicate-match SQL
npm run verify:duplicate      # 31 live checks on duplicate detection, incl. the anon refusal
npm run verify:contacts       # 36 checks on the contact/vCard shape a lead becomes
```

And before any migration is pushed:

```
npm run db:rehearse -- supabase/migrations/<file>.sql --probe "select ..."
npm run db:rehearse -- --sql "select ..."     # read-only, no transaction
```

`db:rehearse` applies a migration inside `begin; … rollback;` against the live
database, so syntax errors, blocked drops and the resulting ACL are all visible
before anything is committed. TASKS.md has claimed since Phase 0b that migrations
were "each rehearsed in a rolled-back transaction" — that was done by hand and
lived only in a commit message. It is a script now. It does **not** show lock
contention, so a `CREATE INDEX` still needs thinking about separately.

### Dependency order, plainly
Phase 1 unblocks everything (nothing else can write real data without a real signed-in user). Phase 2 unblocks Phase 3 (leads/events must exist before you can list, follow up on, or report on them). Phase 4 only needs Phase 1 — you can build the payment flow in parallel with Phase 2/3 if useful, but Phase 4 is **blocked on you registering a payment gateway** (see Phase 4 note). Phase 5 needs both real features to gate (Phase 3) and a real `plan_tier` source (Phase 4, or a manual flip in the meantime — see below). Phase 6 is cleanup once the core app works.

---

## Phase 0 — Foundation *(Complete)*

- 16 tables, 20 enums, indexes, 37 table policies, 11 helper functions — see [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) and `supabase/migrations/`
- `handle_new_user()` trigger (signup → `organizations` + `profiles`, or attach to an org via invite token)
- Auto-confirm enabled on Supabase Auth (no email verification step)
- Supabase project linked, migrations applied, GitHub repo pushed

### Phase 0b — database completion *(Complete, 2026-08-27)*

**The project moved to `ap-south-1` (Mumbai).** `Yieldd Production` / `azpanagwuskruelbwtvb` replaced the Tokyo project `phsvjnvyugivmfpmknay`, which is paused and retained as a rollback. ~250 ms → ~150 ms per request. `.env` and the CLI link point at Mumbai; **the Vercel env vars still need updating by hand.**

Eight further migrations (`20260827130000`–`20260827130700`), each rehearsed in a rolled-back transaction against the live database before push:

- **Closed a live privilege-escalation hole.** `profiles_update_self` had no column restriction, so any rep could `update profiles set role='admin' where id = auth.uid()`. Now guarded by `enforce_profile_update_rules()`.
- Hardened `handle_new_user()`: trimmed metadata, `for update` on the invite lookup, and a raise on a supplied-but-invalid token (it used to silently create a stray admin org).
- Event costs 5 → 7 columns with the generated total widened; `stall_number`; `timezone`.
- `business_cards` gains 6 card fields; `anon` moved to an explicit column grant.
- `organizations.category` / `onboarding_intent`, with the column-level GRANT that the initial `revoke update` made necessary.
- `message_templates` + `message_batches`, both with RLS; legacy template text columns dropped.
- Typed `lead_outcome`, `leads.reviewed_at`, `invites.email`, `payments.event_id`, `profiles.notifications_enabled`.
- 4 storage buckets + 14 `storage.objects` policies; `*_url` columns renamed to `*_path`.

Also: `types/database.ts` generated, `lib/db.ts` added (money lives in exactly one place), `supabase/seed.sql` placeholder, `db:*` npm scripts, CLI pinned. 17 assertions pass; `db lint` clean; `tsc --noEmit` clean.

**Persist-version bump schedule** (each store's mock data is purged when its phase wires it to Supabase — do not do these early or you blank working screens):

| AsyncStorage key | Bump in |
|---|---|
| `yieldd-session` | Phase 1 → v2 |
| `yieldd-leads` (7 mock leads) | Phase 2 (2.11–2.17) |
| `yieldd-event-fields` | Phase 2 (2.8) |
| `yieldd-templates` (2 seeded) | Phase 2 (2.9) |
| `yieldd-card-profile` | Phase 3 (3.14) |
| `yieldd-team` (4 fake + 1 invite) | Phase 6 (6.2) |
| `yieldd-company` | Phase 6 (6.1) |

---

## Phase 1 — Authentication integration *(Complete)*

*Depends on: Phase 0.*

This exact work was implemented and verified working earlier this session, then reverted to keep that turn scoped to database-only. Redoing 1.1–1.4 is short — see the conversation for the working version.

### 1.1 — Supabase client
- **Status:** **Complete**
- **Files:** `lib/supabase.ts` (new)
- **Description:** Recreate the client singleton — `createClient` with `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` (already in `.env`), AsyncStorage as the auth storage adapter, `persistSession: true`, `autoRefreshToken: true`.
- **Acceptance criteria:** App builds; `supabase.auth.getSession()` resolves without throwing on a cold start.

### 1.2 — Real auth in the session store
- **Status:** **Complete**
- **Files:** `stores/useSessionStore.ts`, `types/session.ts`
- **Description:** Replace the mock with `supabase.auth.signUp` / `signInWithPassword` / `signOut`. `signUp` passes `full_name`/`company_name` as signup metadata (the trigger already reads these). After auth, fetch the `profiles` row joined with `organizations(name)` to populate `user`. Make `signUp`/`signIn` async and return `{ error: string | null }` so the UI can show real failures.
- **Acceptance criteria:** Creating an account produces one row each in `organizations` and `profiles`. Signing in with the wrong password returns an error string instead of throwing. Signing out clears `user` and the Supabase session.

### 1.3 — Session restore on launch
- **Status:** **Complete**
- **Files:** `app/_layout.tsx`
- **Description:** Call an `initialize()` store action on mount (checks `getSession()`, fetches profile if present, subscribes to `onAuthStateChange`). Keep the splash screen visible until both fonts *and* the session check are ready.
- **Acceptance criteria:** Force-quitting and reopening the app while logged in lands directly in `(app)`, never flashes the auth screen first.

### 1.4 — Auth screen error/pending UX
- **Status:** **Complete**
- **Files:** `app/(auth)/index.tsx`
- **Description:** Make `handleSubmit` async, disable the button and show a pending label while in flight, render the returned error inline.
- **Acceptance criteria:** A duplicate-email signup or wrong-password sign-in shows a visible message; the button can't be double-tapped mid-submit.

### 1.5 — Rep invite acceptance
- **Status:** **Complete**
- **Files:** `app/(auth)/index.tsx` or a new `app/(auth)/invite.tsx`, deep-link handling in `app.json`
- **Description:** Per D3/B4 ("rep invite deep links bypass B3 and B4 entirely"): a rep tapping a WhatsApp invite link should land on signup with the `invite_token` already captured, passed through as signup metadata. `handle_new_user()` already handles the server side (attaches to the existing org + event instead of creating a new org).
- **Acceptance criteria:** A rep who signs up via an invite link ends up with `role = 'rep'` in the inviter's org, an `active` row in `event_members` for the invited event, and skips the fork screen entirely.

### 1.6 — Fork screen makes a real choice
- **Status:** **Complete** — the choice is persisted to `organizations.onboarding_intent`, and Team now lands on Home rather than walling a new user into Create Event (PENDING.md #2).
- **Files:** `app/(auth)/fork.tsx`
- **Description:** "For my team" → event creation flow (Phase 2, D1). "Just me" → digital card builder (Phase 3, C1). Neither should just drop into the empty `(app)` home.
- **Acceptance criteria:** Each option visibly leads somewhere different.

---

## Phase 2 — Core feature flow (capture)

*Depends on: Phase 1. This is the product — MVP_PLAN calls the 4-second capture "the single most important interaction decision in the build."*

### Infrastructure (build before the screens that need it)

#### 2.1 — Offline-first local queue
- **Status:** **Complete** — built into `stores/useLeadsStore.ts` rather than a separate module. For lead capture the queue and the list are the same thing, so a `draft` lead IS the outbox entry. Device-generated UUIDs as the real primary key make replays collide instead of duplicating.
- **Files:** new `lib/offlineQueue.ts` (or equivalent), likely `expo-sqlite` or an AsyncStorage-backed queue
- **Description:** Captures must never wait on network — MVP_PLAN: *"the image is stored and the screen advances immediately... the rep never waits for OCR."* Leads/voice notes get written to a local queue first, then synced to Supabase in the background when connectivity returns. **Open design decision:** plain AsyncStorage queue + a sync loop, vs. `expo-sqlite`, vs. a library like WatermelonDB or PowerSync — worth a quick discussion before building, since it's the foundation everything in this phase writes through.
- **Acceptance criteria:** Airplane mode: capturing a lead still saves locally and shows success. Reconnecting drains the queue without duplicating rows (idempotent — a `client_id` or similar on each queued item to dedupe against `leads.id`).

#### 2.2 — Storage buckets
- **Status:** **Complete** (2026-08-27) — four buckets with object-level policies. Nothing uploads to them yet; that is 2.12 and 2.16.
- **Files:** new `supabase/migrations/*_storage_buckets.sql`
- **Description:** Two private buckets, `card-images` and `voice-notes`, with RLS policies mirroring the `leads`/`voice_notes` table policies (flagged as open item in DATABASE_SCHEMA.md §9). Blocks 2.5 and 2.9.
- **Acceptance criteria:** An authenticated rep can upload to their own event's folder; another org's rep gets denied.

#### 2.3 — Card OCR extraction (Edge Function)
- **Status:** **Complete** (2026-08-28) — `supabase/functions/extract-card`. Called from the confirm screen with the image in the request body, NOT from a storage trigger: the lead row does not exist yet at that point, and the bucket policies join back to it. Returns fields and writes nothing; the rep reviews and saves. Model chosen by measurement (`npm run compare:card-models`): Sonnet 5 scored 168/168 fields over 7 card types x 3 runs, Haiku 4.5 163/168, Opus 5 no better and slower.
- **Files:** new `supabase/functions/extract-card/index.ts`
- **Description:** Triggered after a card image uploads (via a DB webhook or client-invoked call). Calls Anthropic (`ANTHROPIC_API_KEY` already in `.env`) with the image, extracts name/company/designation/phone/email, writes them to the `leads` row, flips `extraction_status` to `completed` or `failed`.
- **Acceptance criteria:** Uploading a real business card photo populates the lead's fields within a few seconds without the rep waiting on the capture screen for it.

#### 2.4 — Voice transcription + summary pipeline (Edge Function)
- **Status:** **Complete** (2026-08-29) — `supabase/functions/transcribe-voice-note`. Deepgram `nova-3` with `language=multi` (reps switch between English and Hindi mid-sentence; on clean English it transcribed identically to `en-IN`), then Haiku 4.5 for the summary — a plain text task with none of the misread-a-digit risk that made card extraction pick Sonnet. Uses the caller's token to let RLS answer "may this person touch this note?", and the service role only to read the private audio and write the result.
- **Files:** new `supabase/functions/transcribe-voice-note/index.ts`
- **Description:** Triggered after a voice note uploads. Deepgram (`DEEPGRAM_API_KEY`) for transcript, then an LLM call for the summary. Writes `transcript`/`summary`/`transcribed_at`, flips `transcription_status`. Per MVP_PLAN's flagged risk: *"judge success on whether the summary is useful, not whether the transcript is word-perfect."*
- **Acceptance criteria:** A recorded voice note shows a transcript and summary in the lead detail screen (Phase 3, F2) after sync, without the rep having to do anything.

### Event setup (D1–D6) — required before any capture, since every lead needs an `event_id`

#### 2.5 — Create event (D1)
- **Status:** **Complete**
- **Files:** new `app/(app)/events/new.tsx`
- **Table:** `events`
- **Acceptance criteria:** Creates a row with `organization_id`/`created_by` set. On a Free org with an existing `upcoming`/`live` event, the RLS insert rejection surfaces as a clear "upgrade to create a second event" message, not a raw Postgres error.

#### 2.6 — Event cost (D2)
- **Status:** **Complete**
- **Files:** part of the event creation flow above, or `app/(app)/events/[id]/cost.tsx`
- **Table:** `events` (the five `cost_*_paisa` columns)
- **Acceptance criteria:** `total_cost_paisa` (generated column) reflects whatever subset of the five fields was filled in.

#### 2.7 — Invite reps (D3)
- **Status:** **Complete**
- **Files:** `app/(app)/events/[id]/invite.tsx`
- **Table:** `invites`
- **Acceptance criteria:** Each row added creates a `pending` `invites` record with a unique token and opens a WhatsApp deep link pre-filled with the invite text.

#### 2.8 — Custom fields (D4)
- **Status:** **Complete**
- **Files:** `app/(app)/events/[id]/fields.tsx`
- **Table:** `event_custom_field_defs`
- **Acceptance criteria:** Fields defined here appear as real inputs on the confirm-lead screen (2.12) for that event.

#### 2.9 — Message templates (D5)
- **Status:** **Complete**
- **Files:** `app/(app)/events/[id]/templates.tsx`
- **Table:** `events.whatsapp_template` / `email_template`
- **Acceptance criteria:** Saved templates are what pre-fill the bulk-send screen later (Phase 3, F4).

#### 2.10 — Setup complete (D6)
- **Status:** **Complete**
- **Files:** `app/(app)/events/[id]/complete.tsx`
- **Acceptance criteria:** Summary screen only, no new writes; routes into the home/scan screen (2.11) with this event as current.

### Capture (E1–E7) — the loop reps live in all day

#### 2.11 — Home / scan (E1)
- **Status:** **Complete** — reads the current event, today's real capture count and the event switcher.
- **Files:** `app/(app)/index.tsx`
- **Description:** Offline-ready banner, dominant SCAN button, today's capture count (`leads` count by `captured_by` + current event + today), current event name, entry points to lead list and follow-ups.
- **Acceptance criteria:** Capture count matches the actual number of `leads` rows captured today by the signed-in rep.

#### 2.12 — Camera capture (E2)
- **Status:** **Complete** — the photo is kept on the device, the screen advances immediately, and the file uploads to `card-images` after the lead row lands (the policy requires that order). Reading the card is 2.3.
- **Files:** new `app/(app)/capture/camera.tsx`, `expo-camera`
- **Acceptance criteria:** Tapping capture advances to the confirm screen (2.13) immediately — the photo write and any upload happen after navigation, never blocking it.

#### 2.13 — Confirm lead (E3)
- **Status:** **Complete**
- **Files:** new `app/(app)/capture/confirm.tsx`
- **Table:** `leads` (insert), calls `find_duplicate_lead()` RPC
- **Acceptance criteria:** Saving inserts a `leads` row via the offline queue (2.1) with `captured_by` = current rep, correct `event_id`, `consent_given`/`consent_at` from the toggle. If `find_duplicate_lead()` returns a match, the duplicate flag (2.14) shows before save completes.

#### 2.14 — Duplicate detail (E4)
- **Status:** **Complete** (2026-08-31) · **Files:** new `components/capture/DuplicateFlag.tsx`, new `hooks/useDuplicateLead.ts`, rewritten `app/(app)/(modals)/duplicate-detail.tsx`, migration `20260831090000`
- **Description:** Read-only peek via the `find_duplicate_lead()` RPC — deliberately narrow per MVP_PLAN ("reps do not browse each other's leads"); this is the one sanctioned exception.
- **Acceptance criteria:** Shows who captured the earlier contact, when, and their note/summary — nothing else about that rep's other leads is reachable from here. **Asserted**, not assumed: `verify:duplicate` check 6 has rep B read the `leads` table directly and get zero rows.
- **It was worse than "not started."** The banner on `confirm.tsx` had no condition on it, so every capture the app ever made showed *"Possible duplicate — Captured by Amit Shah · 2 days ago"* about a person who does not exist, and the sheet behind it was hardcoded down to a fake quote. `findDuplicateLead()` had been written correctly and called by nothing.
- **The matching had to be fixed in SQL first.** The RPC compared `l.phone = p_phone` as raw strings while `toInsert()` stores whatever the rep typed, so `9820441720` and `+91 98204 41720` never matched — the feature could not have fired. Migration `20260831090000` compares the **last 10 digits**, both sides gated at 8. Deliberately not solved by normalising the stored column: `normalizePhone()` turns a US visitor's `4155550134` into `+914155550134` and an 8-digit landline into `+24931234`, and `leads.phone` is what the dialler dials and the CSV export hands the customer.
- **No merge button.** The mock had one; it merged nothing. A real one needs a *second* security-definer write-door into another rep's data (`leads_update_own_or_admin` blocks the write, `enforce_lead_update_rules()` makes `captured_by` immutable). `leads.duplicate_of_lead_id` is still there for a link-not-merge feature later.
- **Self-matches branch the copy.** The RPC does not exclude the caller, and on Free (1 user) a self-match is the only case that can happen — so the "You captured this earlier" branch is the *only* one a free account sees. Compared on `captured_by`, never on names.
- **No index, deliberately.** An expression index on `leads` would add write cost to the hottest INSERT path for an unmeasured gain, and would need `CREATE INDEX CONCURRENTLY`, which cannot share a transaction with the drop+create. If the RPC ever gets slow: `select count(*) from public.leads`, `explain analyze`, then give the index its own migration.

#### 2.15 — Manual entry (E5)
- **Status:** **Complete**
- **Files:** new `app/(app)/capture/manual.tsx`
- **Table:** `leads` (insert, `source = 'manual'`)
- **Acceptance criteria:** Name + phone save in under 15 seconds of interaction — no required fields beyond those two.

#### 2.16 — Voice note recording (E6)
- **Status:** **Complete** (2026-08-29) — real recording with expo-audio, a live level meter rather than a fixed waveform, playback, re-record and discard. `can_use_ai()` is checked on entry so a Free org meets the three-note limit before speaking into the phone rather than after.
- **Files:** new `app/(app)/capture/voice.tsx`
- **Table:** `voice_notes` (insert)
- **Description:** On a Free org past 3 voice notes, the RLS `can_use_ai()` check rejects the insert — catch that specific failure and show the voice-lock upsell (Phase 5, 5.5) instead of a generic error.
- **Acceptance criteria:** Recording, playback, re-record, delete all work locally before upload; the 4th voice note on a Free org shows the lock message, not a crash.

#### 2.17 — Save confirmation (E7)
- **Status:** **Complete**
- **Files:** new `app/(app)/capture/saved.tsx`
- **Acceptance criteria:** Shows the captured lead's name and the day's running count, then auto-returns to scan (2.11). Free-org lead-101 upsell (Phase 5, 5.1) fires *after* this renders, never instead of it.

---

## Phase 3 — Secondary features

*Depends on: Phase 2 (needs real `leads`/`events` to operate on).*

### Lead management (F1–F5)

#### 3.1 — Lead list (F1)
- **Status:** **Complete** · **Files:** new `app/(app)/leads/index.tsx` · **Table:** `leads`
- **Acceptance criteria:** Reps see their own captured/assigned leads by default; admins see all leads in the event (matches the RLS policy exactly — nothing extra to build server-side).

#### 3.2 — Lead detail (F2)
- **Status:** **Complete** · **Files:** new `app/(app)/leads/[id].tsx` · **Tables:** `leads`, `voice_notes`, `lead_activity`
- **Acceptance criteria:** Editing a field, changing status, or reassigning (admin only — DB trigger already blocks reps from changing `assigned_to`) all persist and show up in the activity log.

#### 3.3 — Evening review (F3)
- **Status:** **Complete** (2026-08-29) — today's unreviewed leads, one at a time: note, temperature, follow-up date. `reviewed_at` makes it resumable; Skip deliberately leaves the flag alone so "not now" differs from "nothing to add". · **Files:** new `app/(app)/leads/review.tsx`
- **Description:** The 10-minute ritual MVP_PLAN says the whole CRM/ROI layer depends on. Queue of today's leads missing a note, one at a time; hot/warm/cold tap; follow-up date.
- **Acceptance criteria:** Stepping through 47 leads and marking/dating each takes a real user well under 10 minutes (informal test, not automatable, but keep the interaction count per lead minimal).

#### 3.4 — Bulk select and send (F4)
- **Status:** **Complete** (2026-08-29) — real leads, the event's own template previewed with merge fields filled in, and leads with no number (or no email) left out rather than silently failing later. · **Files:** new `app/(app)/leads/bulk-send.tsx`
- **Acceptance criteria:** Selecting N leads and a channel previews the event's template (2.9) with merge fields filled per lead.

#### 3.5 — Send handoff (F5)
- **Status:** **Complete** (2026-08-29) — one lead at a time, opening the rep's own WhatsApp or mail app. Records `sent` (the draft was opened for them) or `skipped` against a `message_batches` row. It never records "delivered", because a deep link cannot tell us whether the rep pressed send. · **Files:** new `app/(app)/leads/send-queue.tsx` · **Table:** `message_sends`
- **Acceptance criteria:** Each `wa.me`/`mailto:` send logs a `message_sends` row before handing off to the OS; the queue advances to the next lead on return.

### Follow-up and pipeline (G1–G4)

#### 3.6 — Today's follow-ups (G1)
- **Status:** **Complete** · **Files:** new `app/(app)/follow-ups/index.tsx` · **Table:** `leads` (`follow_up_date <= today`)
- **Acceptance criteria:** Each entry shows the voice note summary from the original capture — this is explicitly "the payoff for the whole voice feature" per MVP_PLAN.

#### 3.7 — Log outcome (G2)
- **Status:** **Complete** · **Files:** new `app/(app)/follow-ups/[id]/outcome.tsx` · **Table:** `lead_activity` (insert), `leads.follow_up_date` (update)

#### 3.8 — Status change (G3)
- **Status:** **Complete** · **Files:** part of lead detail (3.2) · **Table:** `leads.status`, `lead_activity`
- **Acceptance criteria:** Selecting "Won" routes into 3.9 before the status change commits.

#### 3.9 — Deal value entry (G4)
- **Status:** **Complete** · **Files:** new component used from 3.8 · **Table:** `leads.deal_value_paisa`
- **Acceptance criteria:** Cannot reach "Won" without entering a value — the DB `leads_won_requires_value` check is the backstop, but the UI shouldn't let a rep hit that error in normal use.

### Admin visibility (H1–H4)

#### 3.10 — Event list (H1)
- **Status:** **Complete** · **Files:** new `app/(app)/events/index.tsx` · **Table:** `events`

#### 3.11 — Event dashboard (H2)
- **Status:** **Complete** · **Files:** new `app/(app)/events/[id]/dashboard.tsx`
- **Description:** Rep-wise live counts, leaderboard (respecting `leaderboard_visible_to_reps`), last-sync timestamp.

#### 3.12 — ROI dashboard (H3)
- **Status:** **Complete** · **Files:** new `app/(app)/events/[id]/roi.tsx`
- **Description:** The 9pm screen — MVP_PLAN calls it one of the three moments that decide the product. Cost per lead, ROI %, pipeline value, rep split. Build this one with real design care, not a placeholder table.
- **Acceptance criteria:** Screenshot-friendly layout (admin sends it to their MD per the spec).

#### 3.13 — Export (H4)
- **Status:** **Complete** (2026-08-29) — **CSV, not .xlsx.** No Edge Function needed; the rows are queried under RLS (a rep exports their own leads, an admin the organisation's) and written on device. UTF-8 BOM so Excel renders Devanagari, and formula injection is neutralised — lead names come from photographs of cards, so they are untrusted input. · **Files:** new `app/(app)/events/[id]/export.tsx`, likely an Edge Function generating the `.xlsx`
- **Acceptance criteria:** Produces a real Excel file, shareable via WhatsApp/email/Drive share sheet.

### Digital business card (C1–C4, A3, J2)

#### 3.14 — Card builder + preview (C1, C2)
- **Status:** **Complete** (2026-08-29, `6e8991e`) · **Files:** `app/(app)/card/edit.tsx`, `lib/api/businessCard.ts`, `hooks/useBusinessCard.ts` · **Table:** `business_cards`
- **Acceptance criteria:** Saving creates/updates the one `business_cards` row for this profile (unique constraint already enforces one card per user); QR code renders from the public slug URL.

#### 3.15 — Share sheet (C3)
- **Status:** **Complete** (2026-08-29, `6e8991e`) · **Files:** `app/(app)/card/share.tsx`, native `Share` API

#### 3.16 — First scan prompt (C4)
- **Status:** **Complete** · **Files:** `app/(app)/card/first-scan.tsx` — a static prompt with no data behind it, so there was nothing to wire.

#### 3.17 — Hosted public card page (A3)
- **Status:** **Complete** (2026-08-29, `6e8991e`) · **Files:** `app/c/[slug].tsx` — at the route **root**, not inside `(app)` or `(web)`: both those groups guard on having a session, and the entire audience for this page has no account.
- **Description:** Unauthenticated, must render on any device/browser. Reads `business_cards` by slug — RLS already allows public `select` where `is_published = true`.
- **Acceptance criteria:** Opens correctly with no app installed, on a slow connection; save-to-contacts (vCard) works.

#### 3.18 — Profile/card edit (J2)
- **Status:** **Complete** (2026-08-29, `6e8991e`) · **Files:** reuses `app/(app)/card/edit.tsx` rather than a second screen at `settings/card.tsx` — same fields, one implementation.

#### 3.19 — Save lead to phone contacts
- **Status:** **Complete** (2026-08-31) · **Files:** new `lib/contactCard.ts` (pure) + `lib/contacts.ts` (device), `app/(app)/leads/[id].tsx` · **Table:** `leads.saved_to_contacts`
- **Description:** Free-tier feature explicitly called out in MVP_PLAN — don't let it slip behind a Pro gate by accident in Phase 5.
- **Lead detail only, not the save-confirmation screen.** TASKS.md said "part of 2.17" too, but `capture/saved.tsx` auto-returns to scan after 2200 ms: a tap there opens the OS permission dialog while the timer keeps running, so the app navigates away underneath it. Making that safe means cancelling the timer and rewriting the "Returning to scan…" caption — a behaviour change to an approved screen, for a button nobody has 2.2 seconds to find. Deliberate deviation.
- **`presentFormAsync`, not `addContactAsync`.** Expo Go on Android has no `WRITE_CONTACTS` permission, so `addContactAsync` would need a dev build there. Routing through the system contact form avoids that — and lets the rep fix a mis-OCR'd name before it lands in their address book. **So this adds no dev-build requirement** (unlike PENDING.md #8c). The cost: it resolves on dismissal and cannot report Save vs Cancel, so `saved_to_contacts` means "the form was opened", not "a contact exists" — the same honest limit `message_sends` already accepts in 3.5.
- **The note and voice summary are deliberately left out of the contact.** A rep's address book syncs to iCloud and Google; "budget 40 lakhs, decides Friday" should not leave the app's control. `verify:contacts` asserts their absence so it cannot be helpfully re-added.
- **The button stays tappable once saved**, showing "Saved" in the voice-note green. The flag is per-lead on the server, not per-device, so a lead saved on one phone reads as saved on another where the contact does not exist — and contacts get deleted. Disabling it would make both cases a dead end.
- **Round-tripping needed four changes**, meaningless apart: `Lead.savedToContacts`, `toLead()`, the `applyPatch()` branch, and a named `markSavedToContacts()` store action (`editLead` alone only queues — it does not sync).
- **One manual check, on a real device** — a live-DB script for one boolean column would be disproportionate: tap Contacts on lead detail → the system form opens pre-filled → the button flips to "Saved" → force-quit and reopen → still "Saved". That last step is what proves the patch synced rather than only updating optimistically.

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
- **Confirmed live** while building 2.14: `events_admin_insert` is `… AND (is_pro_user() OR active_event_count() = 0)`, so a Free org's second event is refused by the database, not by the app. `verify:duplicate` has to flip its throwaway org to Pro to create a second event at all.

#### 5.7 — Two Free-tier features that must NOT be gated
- **Status:** N/A — a note, not a task.
- **Save lead to phone contacts (3.19)** is listed under MVP_PLAN's "What Free gets". Do not let a Phase 5 sweep catch it.
- **Duplicate detection (2.14)** is listed under Pro ("Team: assignment, reassignment, roles, duplicate detection") — but Free is **1 user**, so the only match a free account can ever produce is *your own* earlier capture, which is not a team feature and genuinely stops a rep double-entering the same walk-up. It ships **ungated**. If this is gated later, gate only the other-rep branch (`captured_by !== auth.uid()`), never the self branch.

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
