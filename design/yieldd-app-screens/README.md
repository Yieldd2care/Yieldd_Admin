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

## Status (as of this snapshot — 2026-08-22)

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

**Not designed yet:** E2–E7 (camera, confirm lead, duplicate detail, manual
entry, voice recording, save confirmation), F1/F3–F5 (lead list, evening
review, bulk send, send handoff), G1–G4 (follow-ups, log outcome, status
change, deal value), H1–H4 (event list, event dashboard, ROI dashboard,
export), I1–I4 (monetization — build once as a variable-headline sheet per
the flow diagram doc, not 4 screens), J1–J3 (settings, profile edit, team
management).

**Suggested next batch:** the core capture loop (E2–E7) — it's what both
planning docs call "the product," and Home's FAB now points at it directly.

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
