# Yieldd app screen redesign — working files

Source files for the mobile app screen redesign (navy/gold direction, built from
the landing page's existing visual language). These are the editable sources
behind two published Claude Artifacts:

- **Working design canvas** (multi-artboard, click-to-edit):
  https://claude.ai/code/artifact/7472246b-7d63-4c3b-95de-2b127fbc6538
- **Status tracker** (approval status + real screenshots, share with stakeholders):
  https://claude.ai/code/artifact/7abec660-b23b-462f-976b-af63ade4ab13

## Governing spec

`ui-development-plan-v1.md` (project root) is the reference for what every
screen should contain — a 41-screen product spec organized into groups (A web,
B signup, C/D onboarding, E core capture, F lead management, G follow-up,
H admin visibility, I monetization, J settings). `MVP_PLAN.md` (project root)
carries the qualitative "why" behind the three moments that decide the
product (4-second capture, 10-minute evening review, admin's 9pm ROI screen)
— read it when a screen's tone/urgency is unclear from the UI plan alone.
`UI Flow Diagrams.docx` (project root) describes three flow diagrams (not
literal images we can render, but their text — extracted once into
`flow-diagram-text.txt` in this folder — describes the structure): pre-auth
onboarding, show-day/weekly, and the upgrade/paywall path. Key point from it:
**build the paywall/upsell sheet once with a variable headline, triggered
from 4 places — never 4 separate screens.** `TASKS.md` (project root) is the
engineering task breakdown; it maps each UI-plan screen code (E1, F3, H3...)
to real file paths in `app/(app)/...` and DB tables, which is useful once a
design here is ready to wire into code.

Confirmed with the user 2026-08-21: **the web landing page (Group A) is
already finalized — do not touch it.** Design work continues on the mobile
app groups (B onward) against the UI plan's per-screen "Purpose / Shows /
User can" bullets, not just visual polish.

**Resolved 2026-08-22:** the earlier flagged conflict (approved auth screen
uses email+password+Google, but the UI plan's Group B describes phone+OTP)
is settled — `TASKS.md` §1.2 commits concretely to Supabase
`signUp`/`signInWithPassword` (email+password), matching what's already built
and approved. The phone/OTP language in the older planning docs is
superseded; don't redesign auth around OTP.

## Wired into real code (2026-08-25)

All 13 screens listed below as "Approved" / "Designed, needs review" (Auth,
Fork, Home, the full C1–C4 solo path, the full D1–D6 admin path) have now
been ported from these `.dc.html` mockups into real Expo Router routes and
NativeWind components — this is a UI/navigation-only pass, no Supabase calls
were added (auth is still the existing Zustand mock). Real file locations:
`app/(auth)/index.tsx`, `app/(auth)/fork.tsx`, `app/(app)/(tabs)/index.tsx`
(new tab shell with a custom center-FAB `TabBar`), `app/(app)/card/{edit,
share,first-scan}.tsx`, `app/(app)/events/new/{index,cost,invite,fields,
templates,complete}.tsx`. A `__DEV__`-only "Continue without an account"
button was added to the auth screen for faster testing. Camera capture (E2)
isn't designed yet, so the scan FAB and "Scan a card" buttons show a
"Coming soon" stub alert rather than a fake camera screen. See the plan file
this was built from for the full spec audit: it cross-checked every screen
against `ui-development-plan-v1.md`/`MVP_PLAN.md` and closed a few gaps
found along the way (Home's missing "switch event" affordance, D4's custom
field type-selector, D5's template edit toggle, D6's missing "edit event"
link). These `.dc.html` files remain the design source of truth for visual
changes — edit them first, then port the change into the real component.

## Status (as of this snapshot — 2026-08-25, updated via Impeccable)

> **Superseded 2026-08-27 — everything below is approved.** The user reviewed
> the built screens directly in Expo Go on 27 Aug and approved all of them.
> The per-screen "Designed, needs review" labels further down are historical
> notes from the 25 Aug snapshot; they no longer mean a screen is pending.
> Nothing is awaiting design approval. Remaining work is backend/wiring, not
> design — see `TASKS.md` Phases 1-6.

**Approved:**
- Sign up / Sign in — `AuthNavy.dc.html` (interactive tabs, both states)
- Team or Solo fork — `Fork.dc.html` (original line-art illustration — clipboard
  with two checked-off items and a pen, "setup checklist" — no repeated brand
  logo. 4 alternate illustrations sketched in `ForkIllustrationOptions.dc.html`,
  kept on the canvas for reference)

**Designed, needs review:**
- **Home / scan (E1)** — `Main.dc.html` — rebuilt twice this cycle. First pass
  matched an AudioPen home-screen reference structurally (flat light bg, no
  navy header, offline banner, one hero number, two small entry-point cards,
  center-FAB bottom bar). Second pass **fixed a real spec violation**: the
  first FAB design gave scan/manual-entry/voice-note three equal-weight
  buttons, but E1 and `MVP_PLAN.md` are explicit — *"One screen, one button:
  SCAN. Nothing competing for the thumb."* Now there's one dominant gold scan
  FAB with a small "Type it in instead" text link beneath it; the voice-note
  button was removed from Home entirely (voice notes attach during
  confirm/manual entry, they're not a Home-level action per spec).
- **Solo onboarding (C1–C4)** — new this session: `CardBuilder.dc.html` (live
  card preview above the form, name/company shown locked/pre-filled per spec),
  `CardPreview.dc.html` (finished card + a representative QR pattern — not a
  real scannable code, just visually correct), `ShareSheet.dc.html` (mocked
  as a bottom sheet since a real OS share sheet can't be styled — WhatsApp
  surfaced first per spec), `FirstScanPrompt.dc.html` (navy hero inviting a
  first real scan, matches the Auth/Fork/D6 hero-moment treatment).
- **Admin onboarding (D1–D6)** — new this session: `EventCreate.dc.html`
  (name with show-name suggestion chips, city, dates), `EventCost.dc.html`
  (5 optional cost fields + running total card, framed per spec as "what the
  ROI dashboard is built on"), `EventInvite.dc.html` (rep rows, WhatsApp-green
  send button — deliberate real-brand-color exception, same precedent as
  Google's actual colors on the auth screen), `EventFields.dc.html` (toggle
  cards for the 3 pre-built field templates + add-custom-field affordance),
  `EventTemplates.dc.html` (WhatsApp bubble + email block previews with
  merge-field highlighting), `EventComplete.dc.html` (navy hero close-out,
  matches the Auth/Fork celebratory-moment treatment, summary card + "works
  offline from here" reassurance). All 6 share a consistent wizard shell:
  back chevron + title + thin gold progress bar + "Step N of 6" caption,
  sticky bottom CTA, "Skip for now" where the spec allows skipping.
- Capture Lead — `Capture.dc.html` (pre-dates the navy direction; also
  pre-dates the realization that spec E2/E3/E5/E6 want camera/confirm/manual/
  voice as more distinct screens than the current single tabbed mockup —
  needs reconciling against the now-built D/C onboarding pattern before
  it's trustworthy)
- Lead Detail — `LeadDetail.dc.html` (pre-dates the navy direction; spec F2
  lists more fields — activity log, assignment history, consent status —
  than currently shown)
- Events — `Events.dc.html` (pre-dates the navy direction; the real spec has
  no single "Events" screen quite like this one — closest match is H1 Event
  list + H2 Event dashboard, two separate screens. Worth splitting next)

**Designed, needs review (added 2026-08-25, via the Impeccable skill):**
- **Core capture loop (E2–E7)** — `Camera.dc.html`, `ConfirmLead.dc.html`,
  `DuplicateDetail.dc.html`, `ManualEntry.dc.html`, `VoiceNote.dc.html`,
  `SaveConfirmation.dc.html`. Built directly against the established
  navy/gold system as a precise extension (per Impeccable's own rule: no
  concept tournament for a narrow, already-spec'd request), matching
  `flow-diagram-text.txt`'s structural point exactly — the duplicate flag
  surfaces inline on Confirm (a tappable banner), and `DuplicateDetail` is
  the read-only sheet it opens, not a separate flow branch. E2 has no fake
  status bar/keyboard per the design skill's mobile-prototype rule and
  simulates a camera feed with a layered gradient (not a literal photo)
  since no real capture exists yet. E7 uses the same navy hero-moment
  treatment as Auth/Fork/D6 for the celebratory save. Sample data continues
  the Rajesh Menon / Northline Engineering person already used on the
  landing page's hero and "How it works" mockups, for cross-surface
  continuity. `PRODUCT.md` (project root) now records durable product
  context for the Impeccable skill — read there before another init round.

- **F3. Evening review** — `EveningReview.dc.html` — a card-stack, one
  incomplete lead at a time (not a list), with the "closeable number" tally
  (captured today / need a note / remaining) fixed above it. Hot/Warm/Cold
  stays inside the existing token set (gold-filled / outline) rather than
  introducing a new traffic-light palette. Two ghost cards peek behind the
  active one, reusing the layered-card depth motif already established on
  the landing page's hero art.
- **H3. ROI dashboard** — `ROIDashboard.dc.html` — deliberately
  screenshot-forward per spec (it's what the admin forwards to their MD):
  a dark navy-elevated hero card carries the headline ROI% and cost-per-lead
  in gold-on-navy, echoing the same dashboard-mockup treatment already used
  in the landing page's Hero.tsx card. Pipeline-by-status uses one color
  per status (grey/blue/gold/green/red) reserved for that purpose only.

With these two, all three screens `ui-development-plan-v1.md`'s "Build
order note" calls out as deciding the product (E2/E3, F3, H3) are now
designed.
- **F1. Lead list** — `LeadList.dc.html` — the "Leads" tab, reusing
  `Main.dc.html`'s tabbar/topbar chrome exactly. Reverse-chronological rows
  with a status pill, a voice-note mic badge, and a small gold dot flagging
  "needs a note" rows, plus search, status filter chips, and an
  event-switcher in the header.
- **G1. Today's follow-ups** — `TodaysFollowUps.dc.html` — overdue items
  surfaced in their own section above today's, each entry showing the
  transcript-summary quote (same visual pattern as `DuplicateDetail.dc.html`'s
  note card) so the call feels informed rather than cold, per spec. Call is
  the dominant action per row; WhatsApp and defer are secondary icon buttons.

**Fixed after an Impeccable review pass (2026-08-25):** the six Group E
files initially used the `--label` token (`#8A98B0`) for field/section
labels, which fails WCAG AA contrast on white/`--section` backgrounds
(~2.9:1, needs 4.5:1) — none of the already-approved screens actually use
that token for readable text (`EventCreate.dc.html` uses `--navy` for plain
field labels, `Main.dc.html`/`EventCreate.dc.html` use `--slate` for
tracked-caption microcopy). All new files now follow that same split.
Also added: the consent toggle `ManualEntry.dc.html` was missing (spec
lists it as shared between Confirm lead and Manual entry), a discard
control on `ConfirmLead.dc.html`'s footer, and `VoiceNote.dc.html`'s
central button now shows Play (not an ambiguous stop-square) since the
depicted state is post-recording review.

- **I1+I2. Upgrade sheet** — `UpgradeSheet.dc.html` — deliberately ONE file
  for both spec entries, per `flow-diagram-text.txt`'s explicit instruction
  not to design four upsell screens. Shows the strongest/primary trigger
  (lead 101 saved) as the drawn example; the headline block is the only
  piece meant to vary per trigger in the real build.
- **I3. Payment success** — `PaymentSuccess.dc.html` — navy hero-moment
  treatment (same family as Auth/Fork/D6/E7), what's unlocked as a
  checklist, single dominant return-to-scanning CTA, GST invoice note.
- **I4. Payment failure** — `PaymentFailure.dc.html` — deliberately NOT the
  celebratory navy treatment (a failure shouldn't look triumphant); light
  background, calm icon, an explicit green reassurance card ("nothing was
  lost, no money was taken") before any retry action.
- **J1. Settings** — `Settings.dc.html` — profile card, plan/billing status,
  grouped rows (account, preferences, sync &amp; storage, support), logout
  as its own visually distinct row.

- **F2. Lead detail** — `LeadDetailNew.dc.html` (the old `LeadDetail.dc.html`
  stays on the canvas as reference, superseded — swap it out once this is
  approved and ported). Now includes everything the old version was missing
  per spec: voice player with mini-waveform + transcript link + summary,
  full captured-fields list, consent status, activity timeline, and an
  admin-only reassign row, plus a call/WhatsApp/email/save-to-contacts
  action row up top.
- **G2. Log outcome** — `LogOutcome.dc.html` — 4 outcome cards
  (Connected/No answer/Not interested/Meeting set), optional note, and the
  same follow-up date quick-picks as `EveningReview.dc.html`, as a sheet.
- **G3. Status change** — `StatusChange.dc.html` — 5-state list, current
  state highlighted. Selecting Won shows an inline hint that it opens G4
  next rather than silently jumping (spec: "Selecting Won opens G4").
- **G4. Deal value** — `DealValue.dc.html` — large currency input (required,
  matches the DB's won-requires-value rule), optional close date/note,
  Cancel returns to the previous status per spec.

**Fixed after a second Impeccable review pass:** `Settings.dc.html`'s sync
row showed status but had no way to actually trigger a manual sync (spec
requires one) — added a "Sync now" link.

- **H1. Event list** — `EventList.dc.html` — events grouped by status
  (Live/Upcoming/Closed) rather than one flat list, since that's the actual
  question an admin has ("which show am I in right now"); Live gets a
  highlighted card treatment.
- **H2. Event dashboard** — `EventDashboard.dc.html` — today's leads +
  cumulative as twin stat cards, an hourly capture-rate bar chart, and a
  rep leaderboard with its own visibility toggle (admin-only per spec), all
  under an "as of last sync" timestamp row.
- **H4. Export** — `Export.dc.html` — scope (event/date-range/status-only),
  a field checklist, Excel called out explicitly as the format (not a
  generic "choose format" picker, since spec says this customer already
  lives in Excel).
- **J3. Team management** — `TeamManagement.dc.html` — seats-used-against-
  plan-limit as a navy stat card up top, active members with role pills,
  a deactivated member shown dimmed with "leads retained" (never deleted,
  per spec), and a separate pending-invites group with resend.
- **F4. Bulk select and send** — `BulkSend.dc.html` — reuses `LeadList.dc.html`'s
  row pattern with checkboxes added, channel choice up top (WhatsApp/Email),
  and the same editable-template-preview pattern as `EventTemplates.dc.html`.
- **F5. Send handoff** — `SendQueue.dc.html` — one lead at a time with a
  progress bar (matches the spec's "queue," not a list), skip/cancel always
  visible, "Open in WhatsApp" as the actual hand-off action.

**All 38 in-app screens from `ui-development-plan-v1.md` are now designed**
(minus J2, which is intentionally not a separate file — its spec is
identical to C1/C2's fields+preview+QR, already covered by
`CardBuilder.dc.html`/`CardPreview.dc.html`; the real code equivalent
already exists at `app/(app)/settings/card.tsx` reusing `card/edit.tsx` per
`TASKS.md`). The 3 old pre-navy files (`Capture.dc.html`, `LeadDetail.dc.html`,
`Events.dc.html`) stay on the canvas as superseded reference — safe to
delete once their replacements are approved and ported.

**Not designed yet:** A2 (pricing page) and A3 (hosted digital card page) —
both marketing/public web pages, not app screens, and belong to the same
code-first pipeline as the already-approved Landing page
(`components/web/*.tsx`) rather than this `.dc.html` canvas. Worth a
separate pass through that pipeline rather than squeezing them in here.

**Fixed after a third Impeccable review pass:** `TeamManagement.dc.html`'s
pending-invite row and `EventDashboard.dc.html`'s #4 leaderboard rep were
both named "Kavita Rao," reading as the same person simultaneously
not-yet-joined and actively capturing 57 leads — renamed the pending
invite to Meera Iyer. `BulkSend.dc.html` showed a "8 selected" badge over
only 3 checked + 1 unchecked visible rows with no indication the list was
truncated — added a "+ 5 more selected" row so the math is legible
(3 shown + 5 more = 8). Also removed two dead CSS rules in
`TeamManagement.dc.html`.

**Suggested next step:** review this full batch, then start porting
approved screens into real Expo Router code following the same pattern
used for the 13 screens already ported (see "Wired into real code" above).

## Home screen redesign options (2026-08-27)

User shared a fintech wallet-app screenshot as a structural reference
(greeting header, dark hero balance card, two pill actions, a
currency-tab row, a 4-icon quick-action grid, a recent-list, a floating
tab bar with a raised center action) and asked for 3-4 options in
Yieldd's own navy/gold theme before committing to one. Built on a new
canvas **page** ("Home Redesign", not the main spine — the canvas now
has multiple pages; `launch` opens straight to this one) since these
are drafts, not yet part of the approved flow:

- **`HomeQuietAuthority.dc.html`** ("A") — closest evolution of the
  current shipped Home: navy hero (stat + delta), a gold Scan pill +
  quiet outline "Add manually" pill, a small secondary event-chip row,
  a 4-icon quick-action grid (Follow-ups/All leads/Search/Reports), the
  existing Recent leads list, and a redesigned floating navy pill tab
  bar with the gold Scan FAB inset into its top edge (replaces today's
  flat white full-width bar + separately-floating FAB).
- **`HomeOneButton.dc.html`** ("B") — the purest reading of the
  product spec's "one button, nothing competes for the thumb": one
  huge hero CTA, manual entry demoted to a plain text link (matches
  today's real pattern), no event-tabs row, a single quiet stat strip
  (reuses `LeadList.dc.html`'s divider-stat pattern) instead of stat
  cards, most whitespace of the four.
- **`HomeEventCommand.dc.html`** ("C") — for reps/admins juggling
  multiple concurrent events: a prominent horizontally-scrollable
  event-switcher row (live/upcoming, today's count per card) sits
  *above* the hero, mirroring the reference's wallet-tabs placement
  most literally; hero and recent-leads both scope to the selected
  event.
- **`HomeLayeredEditorial.dc.html`** ("D") — boldest/most distinctive:
  a layered ghost-card stack behind the hero (echoes
  `EveningReview.dc.html`'s card-depth motif and the landing page's
  hero art), the gold Scan FAB embedded into the hero card's own
  bottom-right corner instead of floating separately, quick actions as
  a horizontal-scroll card row, and the most-recent lead shown as a
  featured "Just captured" card (slightly rotated, drop shadow) above a
  quieter flat list for the rest.

All four share exact tokens lifted from `tailwind.config.js` (navy
`#0B132B`/elevated `#101C3E`, gold `#F4B000`, slate `#5A6B87`, hairline
`#E3E7EF`, section `#F5F7FB`, surface `#EEF1F7`, success `#4ED17F`),
`Typography.tsx`'s type ramp, and exact SVG paths copied from
`components/ui/icons.tsx` (Camera, Clock, Users, Edit, BarChart,
Bell, Home/Calendar/Profile, Mic, ChevronRight, Search) — no new icon
vocabulary invented. Sample data reuses the Rajesh Menon/Sneha
Kulkarni/Amit Shah leads already used in `data/leads.ts` and
`LeadList.dc.html` for cross-surface continuity.

**2026-08-27 (later):** user picked a hybrid — A's header/hero/event-
switcher/quick-actions on top, B's stat-strip/recent-leads/tab-bar on
the bottom. Built as a 5th artboard, **`HomeMergedAB.dc.html`** ("E.
Merged"), on the same Home Redesign page rather than baked straight
into `Main.dc.html` — the user explicitly wants it reviewed as its own
option first, not silently promoted. `Main.dc.html` was reverted back
to its pre-existing content (offline banner, old FAB cluster, 4-tab
bar including Leads) — it is untouched by this whole redesign effort
so far.

**2026-08-27 (later still):** user liked E overall but asked for the
hero's Scan/Add-manually buttons removed (camera FAB is the only scan
entry point now), then picked F (flat tab bar, camera centered inline)
over E's inset-FAB pill bar, then requested a full polish + real-code
port:
- Camera button fixed from a stretched oval to a true circle — React
  Native's `borderRadius` isn't a per-axis CSS percentage, so
  `rounded-full` on a non-square box renders a stadium/pill shape, not
  a smooth ellipse. This is why "a little bit oval" (the original ask)
  read as malformed once built — a real RN constraint worth
  remembering for any future non-square rounded shape.
- Added a header "draft" icon (pencil, `EditIcon`) beside the bell —
  represents offline-captured leads pending sync, per the product's
  offline-first story. Stubbed for now (no real drafts/sync queue
  exists yet).
- Stat strip ("64 this event · 7 follow-ups due · N need a note") was
  overflowing its card with no way to see the rest — wrapped in a
  horizontal-scroll container as a safety net and tightened its sizing
  so it fits without scrolling in the common case.
- Quick-action columns widened (76px → 80px) and label font reduced
  slightly (11px → 10.5px) — "Follow-ups" was wrapping to two lines.
- Recent-leads rows: status pill + time replaced with a small color
  dot (gold/slate/blue/green matching Qualified/New/Contacted/Won,
  now `STATUS_DOT` in `data/leads.ts`) + 4 small touchable action
  icons — Call, WhatsApp (green, real-brand-color exception, matching
  `LeadList.dc.html`'s precedent), Email, Save-to-contacts — in that
  order, matching the sequence already established in
  `LeadDetailNew.dc.html`'s action row. Time moved inline after
  company name to make room.

**Ported into real code** (not just designed): `app/(app)/(tabs)/index.tsx`
and `components/app/TabBar.tsx` now implement F, including all the
polish above. `app/(app)/(tabs)/_layout.tsx` hides `profile` from tab
linking (`href: null`, same pattern as `leads`) since the header avatar
is now its only entry point. `Main.dc.html` (the pre-existing approved
Home mockup) is still untouched/superseded-but-not-updated — worth
reconciling next: either promote F's content into `Main.dc.html` now
that it's live in the app, or treat `HomeFlatTabBar.dc.html` as the new
source of truth going forward and retire `Main.dc.html`.

**Alternate (un-chosen) sign-in directions**, kept for reference:
`Auth.dc.html` (warm cream), `AuthLight.dc.html` (token-safe light),
`AuthEditorial.dc.html` (typographic).

## Files

- `*.dc.html` — Design Component sources (raw HTML/CSS/JS, the `design` skill's
  format). `canvas.json` lays out their positions/titles on the canvas —
  4 rows, 924px apart vertically (844px frame height + 80px minimum gap):
  alt sign-in options (y=-1848), solo onboarding C1–C4 (y=-924), the main
  spine Auth→Fork→Home→Capture→LeadDetail→Events (y=0), admin onboarding
  D1–D6 (y=924).
- `yieldd-lockup-transparent-sm.png` / `yieldd-mark-transparent-sm.png` —
  downsampled versions of the real brand assets at
  `assets/brand/yieldd-lockup-transparent.png` / `yieldd-mark-transparent.png`,
  used by the mockups (kept under ~70KB per the design skill's image guidance).
- `preview-*.html` / `shot-*.png` — standalone static renders (no editor runtime
  needed) used to screenshot individual states locally, and the resulting
  crops embedded in the status tracker page. **Keep these in sync with their
  matching `.dc.html` file** — `preview-fork.html` drifted out of sync once
  already and produced a stale screenshot; always diff before shooting. Not
  every `.dc.html` has a matching `preview-*.html` yet — only the ones
  actually screenshotted so far (create one on demand following the existing
  pattern: same markup, strip `<x-dc>`/`support.js`/templating down to plain
  resolved HTML).
- `yieldd-status.html` — source for the status tracker artifact above.
- `flow-diagram-text.txt` — raw text extracted from `UI Flow Diagrams.docx`
  (the Read tool can't open .docx directly; re-extract with
  `python -c "import zipfile,re; ..."` on `word/document.xml` if this file
  goes missing — see git history of this README for the exact one-liner).

## To resume editing

1. Invoke the `design` skill (`/design`) to get `seed-canvas.mjs` +
   `payload.template.html` again (bundled-skills path is version-pinned and
   changes between Claude Code releases, so don't hardcode an old path).
2. Edit the relevant `.dc.html` file(s) here.
3. Re-seed (full current artboard list):
   ```
   node <skill-base>/seed-canvas.mjs \
     --template <skill-base>/payload.template.html \
     --out yieldd-app-screens.html --title "Yieldd App Screens" \
     --artboard Main.dc.html --artboard Capture.dc.html --artboard LeadDetail.dc.html --artboard Events.dc.html \
     --artboard Auth.dc.html --artboard AuthNavy.dc.html --artboard AuthLight.dc.html --artboard AuthEditorial.dc.html --artboard Fork.dc.html \
     --artboard ForkIllustrationOptions.dc.html \
     --artboard CardBuilder.dc.html --artboard CardPreview.dc.html --artboard ShareSheet.dc.html --artboard FirstScanPrompt.dc.html \
     --artboard EventCreate.dc.html --artboard EventCost.dc.html --artboard EventInvite.dc.html --artboard EventFields.dc.html --artboard EventTemplates.dc.html --artboard EventComplete.dc.html \
     --artboard Camera.dc.html --artboard ConfirmLead.dc.html --artboard DuplicateDetail.dc.html --artboard ManualEntry.dc.html --artboard VoiceNote.dc.html --artboard SaveConfirmation.dc.html \
     --artboard EveningReview.dc.html --artboard ROIDashboard.dc.html --artboard LeadList.dc.html --artboard TodaysFollowUps.dc.html \
     --artboard UpgradeSheet.dc.html --artboard PaymentSuccess.dc.html --artboard PaymentFailure.dc.html --artboard Settings.dc.html \
     --artboard LeadDetailNew.dc.html --artboard LogOutcome.dc.html --artboard StatusChange.dc.html --artboard DealValue.dc.html \
     --artboard EventList.dc.html --artboard EventDashboard.dc.html --artboard Export.dc.html --artboard TeamManagement.dc.html \
     --artboard BulkSend.dc.html --artboard SendQueue.dc.html \
     --artboard HomeQuietAuthority.dc.html --artboard HomeOneButton.dc.html --artboard HomeEventCommand.dc.html --artboard HomeLayeredEditorial.dc.html --artboard HomeMergedAB.dc.html \
     --image yieldd-lockup-transparent-sm.png --image yieldd-mark-transparent-sm.png \
     --canvas canvas.json
   ```
   Adding a new screen? Append its `--artboard` flag here AND add it to this
   list for next time — this doc is the source of truth for the full command,
   not just canvas.json.
4. `--check` it, then publish with `url` set to the working-canvas link above
   (never omit `url` — that would create a separate artifact) and
   `contract: "0.1.31"`. If `--check` warns about overlapping artboards, you
   likely need 924px vertical spacing between rows, not 844 — the name strip
   above each frame needs room too.
5. If a screen just got approved: re-screenshot it and swap it into
   `yieldd-status.html`, then republish that too with its own `url`.

### Screenshotting a `.dc.html` locally

The chrome-devtools MCP tool this was built with can be unreliable/disconnect
mid-session (happened twice so far). Fallback that doesn't depend on it —
drive Chrome headless directly from the command line:

1. Make sure the matching `preview-<name>.html` (a plain static HTML mirror
   of the `.dc.html`'s current markup — no `<x-dc>`/`support.js`/templating,
   just the resolved output; `sc-for`/`sc-if` loops can become a plain
   `<script>` that builds the repeated DOM nodes, see `preview-cardpreview.html`
   for the QR-grid example) is up to date.
2. ```powershell
   $chrome = "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"  # or Edge at a similar path
   $file = "<full path to preview-<name>.html>"
   $out = "<full path to shot-<name>.png>"
   $url = "file:///" + ($file -replace '\\','/')
   Start-Process -FilePath $chrome -ArgumentList @("--headless","--disable-gpu","--hide-scrollbars","--force-device-scale-factor=1","--window-size=390,844","--virtual-time-budget=4000","--screenshot=`"$out`"","`"$url`"") -Wait -PassThru -NoNewWindow
   ```
   `--virtual-time-budget=4000` matters — without it the shot can be taken
   before the Google Fonts `@font-face` finishes loading and falls back to a
   system serif. Use `Start-Process -Wait` (not the `&` call operator without
   waiting) or the screenshot file can be read before Chrome finishes writing it.
   Output comes out at exact 390×844 with `--force-device-scale-factor=1` —
   no cropping needed.
