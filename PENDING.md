# PENDING — Corrections To Do

Running list of app corrections that are **reported but not yet fixed**.
When asked "what is pending?", read this file.

Status legend: `[ ]` pending · `[~]` in progress · `[x]` done (move to Done section)

---

## Status board — updated 2026-09-08

Working order agreed 2026-09-02. Solving one at a time, top down.
Full diagnosis for each is in its numbered section below.

**Corrections queue**

| Order | # | Correction | Status |
|---|---|---|---|
| 1 | 17a | Repoint the 5 links that open wizard steps for the wrong event | `[x]` done 2026-09-02 |
| 2 | 16 | Four dead lead buttons (Call / WhatsApp / Email / Save contact) | `[x]` done 2026-09-02 |
| 3 | 17b | Edit-event screen — name, city, dates, costs | `[x]` done 2026-09-02 |
| 4 | 19 | Event lead count stale until pull-to-refresh | `[x]` done 2026-09-02 |
| 5 | 14 | Template editor behind the keyboard (3 screens) | `[x]` done 2026-09-02 |
| 6 | 15 | Variable instructions — **and** the subject-line context bug | `[x]` done 2026-09-02 |
| 7 | 13 | Scanning your own card fills nothing | `[x]` done 2026-09-02 |
| 8 | 18 | Back-of-card scan + branch address field | `[x]` done 2026-09-02 |
| 9 | 20 | Export Leads hides an event that already has leads | `[x]` done 2026-09-02 |

**Reported 2026-09-11 — not started, some of it needs your answers first**

| # | Item | Status |
|---|---|---|
| 33a | Sign-up becomes email → code → name + password | `[x]` done 2026-09-14 |
| 33b | Referral — "where did you hear about us" + sub-lists | `[x]` done 2026-09-14 |
| 33c | Skip on every onboarding screen | `[x]` done 2026-09-14 — every screen that should take one now does; the two older screens take none by decision |
| 33d | First-run tutorial on Home (collage + Next) | `[x]` done 2026-09-14 |
| 34 | Password fields need a show/hide eye icon | `[x]` done 2026-09-12 — one shared input, so every password box got it at once |
| 35 | Bottom content behind the Android nav bar (Samsung Ultra 26) | `[x]` done 2026-09-18 — camera controls lifted clear of the nav bar (`95c6e0b`), and the keyboard/scroll sweep in 69 reworked the same screens. **Closed by the user 2026-09-18 on a different Android handset than the one reported on** — the Samsung Ultra check was dropped by decision, not forgotten |
| 36 | No confirmation the front of the card was captured | `[x]` done 2026-09-12 — ticked thumbnail beside the shutter, tap to retake |
| 37 | Remove em dashes from app content | `[x]` done 2026-09-15. 128 user-facing occurrences rewritten sentence by sentence, not substituted: app screens, /privacy, /terms, /delete-account, the default WhatsApp and email templates, and the weekly-digest email. The empty-value dash (an empty table cell, `formatPaise`/`formatPercent` fallback) is now a plain hyphen `-`. **Deliberately left alone, do not "finish the job":** ~670 occurrences in code comments, every internal doc (this file, AGENTS.md, MVP_PLAN.md, TASKS.md, DATABASE_SCHEMA.md, migrations), two developer-console strings (`lib/contactPicker.ts`, `lib/supabase.ts`), the model prompts in `extract-card`, and the `mdash` entry in the HTML-entity decode table in `summarise-company` (a decoder, not copy). Proof: the exported web bundle contains zero em dashes. |
| 38 | Invite reps from the phone's contacts | `[x]` done 2026-09-14 — **that "no permission" note was wrong, see 60**: the picker opens without one but reading the chosen contact needs READ_CONTACTS. It is now requested, which is what created 62 |
| 39 | Lock icon and explanation on paid features | `[x]` done 2026-09-12 — `lib/plan.ts`; no price and no pay button, asserted in `verify:plan` |
| 40 | "Needs a note" ignores voice notes | `[x]` done 2026-09-15 — a voice note clears the flag. **The filter keeps its label, "Needs a note"** — renaming it was the other option and was NOT chosen. Five sites: one shared helper on the device, plus `event_stats` and `event_set_stats` |
| 41 | Save-to-contacts icon does nothing | `[x]` done 2026-09-17 — Android's `presentFormAsync` throws unless the app already holds READ_CONTACTS. It is requested now, and the privacy policy was rewritten in the same commit. **Tested and working on both iPhone and Android, 2026-09-18 by the user.** Closed |
| 42 | Show the captured card in the list; make lead details editable | `[x]` done 2026-09-12 — card shown in list and whole on the lead; edit form sends only what moved |

**Reported 2026-09-14 — not started**

| # | Item | Status |
|---|---|---|
| 45 | Web dashboard — Leads and Follow-ups showed nothing | `[x]` done 2026-09-14 |
| 43 | Record where each lead was captured and show it | `[x]` done 2026-09-16 — address on the phone's lead screen, a free OpenStreetMap map on the dashboard. No key and no billing anywhere. The Play-required popup before the location permission shipped 2026-09-17 and was tried indoors on a handset. **All that is left is 43a, and it is yours: the Play data safety form and the Apple privacy labels** |
| 46 | Pipeline chart bars should open the leads behind them | `[x]` done 2026-09-14 — leads list now takes a `status` param |
| 47 | Export CSV carries no deal value | `[x]` done 2026-09-15 — two columns, Expected and Won, admin-only and **enforced in the database**. The report's premise was wrong in a way that mattered: the column already existed and was ungated, so a rep could tick it and export deal values |
| 48 | Team — a column for cards scanned per rep | `[x]` done 2026-09-18 — shipped as **Viewers**, and it is card-link opens, **not QR scans**. The QR carries a vCard and never reaches a server, so a scan cannot be counted at all; the user chose to keep it that way rather than lose the offline guarantee |
| 49 | "New template" is silent, and creates a default not a draft | `[x]` done 2026-09-15 — web dashboard only; `addNew` now selects the new row and opens its editor, and creates it with `is_default: false` |
| 50 | Home — all-events analytics with an event picker | `[x]` done 2026-09-14 — `event_set_stats`; no cost-per-lead, ROI covers priced events only |
| 51 | Clicking a lead should open it as a popup over the list | `[x]` done 2026-09-16 — `components/dash/LeadOverlay.tsx`; the overlay IS the route, so the URL still changes and browser back closes it |
| 52 | An invite counts as ready with a number that is not one | `[x]` done 2026-09-15 — **both screens**, the phone invite screen and the web dashboard's Team form, since the item was written up as one. Warn, never block: an unreachable number gets an amber border and a sentence under its own row, and still sends. `ready`, the buttons and `createInvites` are all untouched. New `describePhoneProblem` in `lib/phone.ts`, deliberately looser than `isValidPhone`; asserted in `verify:phone` |
| 53 | iOS ships a contacts permission string it never uses | `[x]` closed 2026-09-15 by 60 — the permission is genuinely requested now, so the string describes something real |
| 54 | Ask for the event cost when the show ends | `[x]` done 2026-09-17 — see the section. **Decided 2026-09-15: wizard unchanged; notify the admin after the end date, naming the blank lines** — ⚠ **its premise is false, see the section: there are no blank lines to find** |
| 55 | "This event cost nothing" is not something you can say | `[x]` **DROPPED 2026-09-16 by the user** — a free event is recorded by typing 0 into a line, which is enough. No tick will be built |
| 56 | Abandoned signups leave an empty organisation behind | `[ ]` surfaced by 33a; the account is made when the code is sent |
| 57 | Code email's subject still said "Your sign-in link" | `[x]` done 2026-09-14 |
| 58 | After the code, ask ONLY for a password | `[x]` done 2026-09-15 — name, company and number move to the digital-card step |
| 59 | Contacts button on the invite screen read as decoration | `[x]` done 2026-09-14 |
| 60 | Picking from contacts failed after the contact was chosen | `[x]` done 2026-09-14 — permission now requested, by decision |
| 62 | **Privacy policy now contradicts the app** | `[x]` done 2026-09-15 — the policy now states the app does ask, and why. On master, so live. **The Play data safety form still has to be updated to match** |
| 61 | "Invite more reps" restarted the setup wizard | `[x]` done 2026-09-14 |

**Reported 2026-09-17 — not started**

| # | Item | Status |
|---|---|---|
| 63 | The whole "Add a voice note" card should start the recording, not just the gold circle | `[x]` done 2026-09-17 |
| 64 | Home's blue box — make all four figures open what they count | `[x]` done 2026-09-17 — **the WhatsApp cell stays and now counts real WhatsApp sends**, by decision the same day. Both copies of the box, Home and Leads |
| 65 | Leads — show every event by default, put an event dropdown behind the name, newest first | `[x]` done 2026-09-18 — viewing scope got its **own non-persisted store** (`useLeadScopeStore`), not `useCurrentEventStore` and not the dashboard's `useEventSelectionStore`: narrowing the list must never move where the next card is filed, and not persisting it is what keeps the tab opening on every lead. All-events mode groups the list under per-show headings. **Tested on a handset by the user the same day — capture still files into the show being worked in** |
| 66 | A voice note plays once, then the button stops working until the lead is reopened | `[x]` done 2026-09-18 — the playhead, not the audio: a finished player sits at the end of the file and `play()` there is over before it starts. The press is now a three-state decision in `lib/voicePlayback.ts` — **finished rewinds, paused resumes** — and the bar and the icon read from the same decision. The player is not rebuilt. Confirmed on a handset by the user the same day |
| 67 | Tapping one of Home's four tiles must open the Leads tab on the show picked in "Your events", not on every show | `[x]` done 2026-09-20 — a `scope` param beside `filter`, applied to `useLeadScopeStore` and cleared in the same write. **All four tiles, so the follow-ups screen learned about events too — via its own route param, never the shared store.** The narrowing was the easy half: the tile also had to hand over the pill and clear the search box, or the number still opened a list that disagreed with it. One rule for "this show" now, asserted by `npm run verify:lead-scope`. **Not yet confirmed on a handset** |
| 68 | Lead detail — a long address runs outside the white card | `[x]` done 2026-09-18 (`092fa9a`) — `FieldRow` now lets the value take the remaining width and wrap: `flex-1 min-w-0 text-right` on the value, `shrink-0` on the label. RN defaults `flexShrink` to 0 unlike the web, which is why it looked fine in a browser and wrong on a handset. Fixes every long value on the screen, not only the address |
| 69 | Sign-in: the keyboard covers the boxes you are typing into, and the screen will not scroll | `[x]` done 2026-09-18 — **two faults, and the reported one is a flexbox bug not a keyboard bug**: `flex-1` inside a `flex-grow` scroll container capped the content at the viewport, so there was nothing to scroll, ever. The sweep found 8 more screens. All 16 now go through one wrapper, asserted by `npm run verify:keyboard`. **Confirmed on an Android handset by the user the same day** |
| 70 | A revoked rep can still read the leads already on their phone | `[x]` done 2026-09-20 — the device now tears itself down and says why. Asserted end to end by `npm run verify:deactivation`, including that the revoked path is reachable at all. See the section for what it does NOT do |
| 71 | Lead detail never shows the deal value that was entered | `[ ]` reported 2026-09-18. Qualified and Won both take a value and neither is shown back. See the section |
| 72 | Signing out left the previous account's leads on the handset | `[x]` done 2026-09-20 — found while building 70, and wider than it. See the section |
| 73 | Two of the three doors to the Pro follow-ups screen are not gated | `[ ]` found 2026-09-20 while building 67, not caused by it. The icon row gates with `gate('follow-ups')`; the blue tile beside it and the Leads-screen cell both push straight through. See the section |
| 74 | Tapping Home's Search tile twice in a row does not focus the box the second time | `[ ]` found 2026-09-20 while building 67, not caused by it. `focus` is the one route param never cleared — the exact bug the comment on the param beside it describes. See the section |

**Parked for Phase 2 — decided 2026-09-14**

Phase 2 here means *after the current launch push*, and is **not** the same thing as "Phase 2" in
[TASKS.md](TASKS.md), which is the old build-order numbering and is already finished. Nothing in
this table gets started until the launch queue above is clear.

| # | Item | Still needs deciding before it starts |
|---|---|---|
| 44 | Admin imports an existing Excel list of leads — web dashboard only | Provenance tag, and what happens to duplicates |

**Blocked on you, not on code**

| # | Item | Waiting on |
|---|---|---|
| 11 | Pricing — app publishes the ₹10,000 sales-room price | Your decision on the number |
| 7 | Password reset | A merge to master; until then the emailed link 404s |
| — | App Links | Android SHA-256 fingerprint + Apple Team ID |
| — | EAS build | A Yieldd-owned Expo account (blocks Google sign-in testing) |
| ~~27a~~ | ~~Play billing~~ | **DECIDED 2026-09-08 — sell on yieldd.co only. Not blocked any more; it is now code to remove.** |

**Decisions taken 2026-09-15** — answers to the open questions on 37, 40, 43, 47, 52, 54 and 55.
Recorded here because they were given in conversation and existed nowhere else.

- **37 — em dashes.** Everything a user reads: app screen text, buttons, messages, the message
  templates, and /privacy and /terms. Code comments and internal documents including this file are
  explicitly out of scope — several thousand lines of churn with no user-visible effect.
- **40 — voice notes.** A voice note counts as having noted the conversation and clears
  `needsNote`. The filter keeps its current label. Note voice is a Pro feature, so this only
  changes anything for a paid account.
- **47 — export money.** Two columns, expected and won, never one combined. Expected sums
  Qualified + Won, won sums Won alone; a single column mixing a forecast with a closed deal is how
  a finance team gets misled. Admin-only, decided on the server, for the reason in 47's section.
- **52 — invite numbers.** Warn, never block. An odd-looking number shows a warning and the invite
  can still be sent. Chosen specifically so that nothing which sends today stops sending: the
  existing validator rejects extensions, dial pauses, slashes and unicode hyphens, all of which
  appear in real address books.
- **54 — when the cost is asked for.** The creation wizard stays exactly as it is; the user was
  explicit that the flow is correct. What is added is a notification after the event's end date
  telling the admin **which cost lines are still blank**, by name, not a generic "add your costs".
  A line set to 0 is an answer and is never chased again; a blank line is unanswered and is. This
  is the same distinction the schema already keeps one level down, so no migration is needed for
  it — see 55.
- **55 — free events.** They do happen: sponsored stalls, guest passes, a stand someone else paid
  for. Build the single "this event cost nothing" tick that writes explicit zeros across the seven
  components. No schema change; the components already carry unset-versus-zero.
- **43 — lead location.** Build it, with both coordinates and the resolved address. Use
  `expo-location`'s own `reverseGeocodeAsync`, which runs on the device and costs nothing: no
  Google Cloud account, no API key, no billing, no quota. Android's built-in geocoder is Google
  underneath already, so only iPhone would gain anything from paying, and that is the only case
  worth revisiting. If real venue addresses come back poor on iOS, switch iOS alone to the
  Geocoding API then — the address is resolved once at capture and stored, so it is one function.
  For reference if that ever happens: 10,000 free calls a month, then about $5 per 1,000. At
  ~300 cards a show that is ~30 shows in one month before a bill starts. A key shipped in a mobile
  app must be restricted to the app and given a quota cap, or a leak or a loop is billable.

**Decisions taken 2026-09-02:** edit-event covers everything asked at creation · back of card is
an optional second shot, not compulsory · branch address becomes a new field.
**Settled while building #18:** the back photo is **read and discarded**, not stored — storing it
would have meant a second column plus four storage-policy amendments for a picture nothing reads.

---

**Web dashboard queue — reported 2026-09-07**

The dashboard shipped read-only: it shows what exists but has almost no way to
act on it. Six gaps, all "the screen is there, the button is not".

| Order | # | Correction | Status |
|---|---|---|---|
| 1 | 21 | Events — no Create event, no Edit event | `[x]` done 2026-09-08 |
| 2 | 26 | Events — no way to reach ROI, no per-event download | `[x]` done 2026-09-08 |
| 3 | 24 | Team — no Invite member button | `[x]` done 2026-09-08 |
| 4 | 23 | Templates — read-only, no New template | `[x]` done 2026-09-08 |
| 5 | 22 | Follow-ups — no way to act on a due follow-up | `[x]` done 2026-09-08 |
| 6 | 25 | Export — only the current event, not a choice of events | `[x]` done 2026-09-08 |

**Reported 2026-09-08, not started**

| Order | # | Correction | Status |
|---|---|---|---|
| 1 | 28 | Phone screens are reachable in a browser and look wrong there | `[x]` done 2026-09-09 |
| 2 | 29 | No lead detail page on the web | `[x]` done 2026-09-09 |
| 3 | 30 | Phone Follow-ups opens the wrong WhatsApp chat, records no send | `[x]` done 2026-09-09 |
| 4 | 31 | Seats are not enforced anywhere | `[x]` done 2026-09-10 |
| 5 | 32 | Dashboard Settings is read-only — no way to edit anything | `[x]` done 2026-09-09 |

---

**Play Store legal + billing queue — reported 2026-09-08**

An external review of the published privacy policy and terms. Four blockers plus five
smaller corrections. Every one of them touches **both** the web pages and the app — the app
links to these same pages, and the Play data safety form has to match them word for word.

| Order | # | Correction | Status |
|---|---|---|---|
| 1 | 27a | Play billing — **decided 2026-09-08: sell on web only.** Strip purchase from the app | `[~]` **PARKED 2026-09-18 by the user — finish the app corrections first, then decide.** The 2026-09-08 choice is reopened: they said Google taking a cut is acceptable. See the note at the end of 27a |
| 2 | 27b | /privacy, /terms, /delete-account must render without JavaScript | `[ ]` |
| 3 | 27c | Deletion section — the link that renders as plain text | `[~]` sentence fixed 2026-09-08, anchor still not an `<a>` |
| 4 | 27d | /delete-account — reachable, self-serve, and named in the data safety form | `[ ]` |
| 5 | 27e | Contacts, camera and microphone are never named in the policy | `[x]` done 2026-09-08 |
| 6 | 27f | Two DPDP rights missing — withdraw consent, nominate | `[x]` done 2026-09-08 |
| 7 | 27g | Terms promise export at any time; the pricing deck locks it behind Pro | `[ ]` |
| 8 | 27h | Verify the no-training claim against the actual Anthropic/Deepgram plan | `[ ]` |

**Verified against the live site 2026-09-18, not against this file.** `origin/master` is at the
same commit as the working branch, so yieldd.co is serving everything built so far. `curl` on all
three legal routes returns **1398 bytes and the words "You need to enable JavaScript to run this
app."** — 27b is real and still open. 27c is open too: `LegalLink` in
[components/web/LegalPage.tsx](components/web/LegalPage.tsx) is still a `Typography` with
`onPress`, so there is no `<a>` and no `href` in the DOM. 27g is open: the export sentence is
still at [terms.tsx:102](app/(web)/terms.tsx#L102).

**27d is mostly already satisfied and should not be rebuilt.**
[delete-account.tsx:41](app/(web)/delete-account.tsx#L41) does offer a path for someone who has
uninstalled the app or cannot sign in — it tells them to email, which is what Play asks for. What
is left of 27d is therefore not page content: the page is invisible without JavaScript (27b), and
the only pointer to it from /privacy is the dead pseudo-link (27c). Fix those two and 27d reduces
to entering the URL in the Data Safety form. **Read the page before writing anything new for it.**

---

## Open

### 71. Lead detail never shows the deal value that was entered — reported 2026-09-18

**Reported by the user:** open a lead and there is no money on the screen. If that lead is Won,
it should say what the deal was worth. If it is Qualified, it should say the amount the rep
entered when they qualified it. Today neither is shown anywhere on the lead.

**The value is already captured and already stored.** `leads.deal_value_paisa` is filled at
Qualified as the expected value and at Won as the closed value, and the database enforces both
(`leads_qualified_requires_value`, and the existing Won rule). `lib/mappers/lead.ts` already maps
it onto the lead as `dealValue`. So this is a display gap, not missing data, and it needs no
migration.

**Where it is missing:**

- **Phone, [app/(app)/leads/[id].tsx](app/(app)/leads/[id].tsx)** — no deal value at all. This is
  the screen the report is about.
- **Web, [components/dash/LeadDetail.tsx](components/dash/LeadDetail.tsx)** — the only place the
  number appears is the *input box* inside the status editor, and only while a value is being
  asked for. Close the editor and it disappears again, so the dashboard has the same gap.

**What to build:**

1. A money row on the phone lead detail, shown whenever the lead carries a value. Label it by
   status so a forecast is never mistaken for revenue: **Expected value** while Qualified,
   **Deal value** once Won. Nothing shown for New, Contacted, or Lost.
2. The same read-only row on the web lead detail, outside the status editor.
3. Format with `formatPaise`, the same helper the ROI screens use, so one lead and the event
   total never disagree on how a number is written.
4. Admin only, matching `event_stats`: money is already admin-gated on the server, and a rep
   would otherwise see a blank row with no explanation. Decide whether a rep sees the value on a
   lead **they themselves** entered it on — probably yes, since they typed it.

**Open question for the user:** should the row be tappable to edit the amount, or read-only with
editing left where it is today, inside the status change? Read-only is the smaller change and
keeps one path for writing money.

---

### 70. A revoked rep can still read the leads already on their phone — reported 2026-09-18, DONE 2026-09-20

**What the user asked for:** when an admin revokes a rep after a show, that rep must not be
able to see or export any leads. Checked during a briefing pass, so this is a gap found by
reading, not a handset report.

**The server side was already correct and was not touched.** No migration, no policy, no RLS
helper changed in this work.
[20260827140000_deactivation_and_invite_peek.sql](supabase/migrations/20260827140000_deactivation_and_invite_peek.sql)
gates `current_organization_id()` and `is_admin()` on `profiles.status = 'active'`, and every
org-scoped policy flows through those two. Their captured leads stay with the organisation,
which is what J3 promises, and they cannot restore themselves.

**The gap was on the device, and it was one line.** `refreshProfile()` ended with
`if (!get().user) { await get().signOut(); }`. A revoked rep ALWAYS has a cached `user` — it is
persisted so the app can cold-start in a hall with no signal — so that condition was false and
the function returned having done nothing at all. The session kept looking valid forever and
`yieldd-leads` kept rendering.

**Why it could not simply read `user.status`.** `PROFILE_SELECT` ends with
`organizations!inner(...)`, and `org_select_members` is `id = current_organization_id()`, which
is NULL for a deactivated member. So the inner join matched nothing and the profile fetch
returned exactly what a missing profile returns. The two were indistinguishable. The fix asks a
second, narrow question — `select('status')` on `profiles` alone, no embed, which
`profiles_select_self_or_org` still answers through its `id = auth.uid()` disjunct. **Do not add
a join to that query.** Making the embed a left join was the other option and was NOT chosen:
`company` and `planTier` are read through that seam by eleven screens, and a `planTier` quietly
defaulting to `'free'` would change paid-feature gating.

**What it does now.** On any reachable-server answer of "deactivated", the app clears every
persisted store and the whole `captures/` directory, signs out, and shows a plain screen saying
access to that company was removed, with a support contact. The screen is rendered as a sibling
of the navigator in `app/_layout.tsx`, not pushed as a route, so there is nothing to swipe back
to — and nothing gets unmounted, which matters because revocation fires from a background
refresh that can land while the rep is mid-capture. Native and the web dashboard both, from
that one insertion point. A breadcrumb under its own AsyncStorage key survives the sign-out, so
the explanation is still there after a force-quit.

**Detected at three moments:** cold start, sign-in, and — added deliberately — the instant the
phone comes back online (`hooks/useConnectivity.ts`). Without that third one a rep deactivated
while offline kept reading the cache until the next relaunch, which is not what "the local copy
goes the next time the phone touches the internet" means.

**Offline is never treated as revocation.** That was the one way to make the product worse, and
the code is arranged so it cannot happen: every new branch sits strictly below the existing
`if (result.offline) return;`, so an offline cold start runs zero new statements and makes zero
new requests. Anything the status query cannot answer — including a server error that is not
recognisably a transport failure — is also treated as "no answer", never as revocation.

**Unsynced captures are destroyed, and this is the decision, not an oversight.** A deactivated
rep cannot upload them — RLS refuses the insert — and a draft holds the same lead PII as a
synced lead: name, phone, company, the card photo. So they go with everything else. It is not
silent: the count is taken before the wipe and the screen names it, so the rep can tell their
ex-employer what was lost. Only the admin sees what was captured, server-side.

**Asserted by `npm run verify:deactivation`**, against real throwaway accounts on the live
database: a deactivated rep reads zero leads, zero events, exports nothing, and cannot set
their own status back to active; the admin still reads their lead; reactivation restores
access. And the assertion that would have caught this class of bug in the first place — that
the app's own `PROFILE_SELECT` goes blind for a deactivated member while the narrow status
query still answers. If anyone relaxes `org_select_members` or tidies an embed into that query,
that check fails loudly instead of the explanation screen quietly becoming unreachable again.

**Known limits, so nobody over-promises this later:** a phone kept in aeroplane mode never
receives the instruction, and a determined person can read an app's local storage on a rooted
device. This raises the floor honestly; it is not a remote wipe.

---

### 73. Two of the three doors to the Pro follow-ups screen are not gated — found 2026-09-20 `[ ]`

**Not reported — found while auditing the tile paths for 67, and not caused by it.** Nothing in
67 changed who may open that screen; this was already true.

There are three ways into `app/(app)/follow-ups/index.tsx` and they disagree:

| Where | Gated? |
|---|---|
| Home, the round icon row | **yes** — `if (gate('follow-ups')) router.push(...)` |
| Home, the blue tile a few lines below it | no |
| The leads screen's own copy of that blue box | no |

So a Free rep who taps the greyed icon with the little padlock gets the upsell, and the same rep
tapping the tile directly beneath it lands on the Pro screen. Whichever way it is settled, the
three should agree — and it is worth checking the same pattern on `gate('roi')`, since the
Reports tile is built the same way.

**Not fixed here on purpose:** it is a plan question (does the follow-ups tile stay visible and
gated, or does the count itself become Pro?), not a bug with one right answer, and 67 was not the
place to decide it.

---

### 74. Home's Search tile does not focus the box when tapped twice in a row — found 2026-09-20 `[ ]`

**Not reported — found while auditing the route params for 67.** Home's Search tile pushes
`/(app)/(tabs)/leads` with `focus: 'search'`, and the effect that reads it focuses the field.
But `focus` is **never cleared**, unlike `filter` and now `scope`. So the param keeps its value,
the effect's dependency never changes, and it never runs a second time: leave the tab, come back
via the Search tile, and the list opens with no keyboard.

This is precisely the failure the comment above the `filter` effect describes, sitting on the
param declared two lines away from it — which is a fair warning that the comment is doing its
job and the third param was simply missed when it was written.

**The fix is small but not free:** `focus` cannot simply join the combined clear, because that
effect deliberately returns early when only `focus` is set. It needs its own clear inside its own
effect, and two effects each calling `router.setParams` is the clobbering problem the combined
one exists to avoid — so the clears have to be reconciled, not just added. That is why it is a
separate item rather than a line in 67.

---

### 72. Signing out left the previous account's leads on the handset — found 2026-09-20, DONE 2026-09-20

**Not reported — found while building 70, and wider than it.** `signOut()` cleared
`yieldd-session` and the query cache and stopped there. Seven other persisted stores survived
every sign-out, ordinary ones included: `yieldd-leads`, `yieldd-capture-draft`,
`yieldd-current-event`, `yieldd-event-draft`, `yieldd-event-fields`, `yieldd-event-selection`
and `yieldd-company`. So the next person to sign in on a shared handset — a demo phone, a
borrowed device, a rep handing it to a colleague — inherited the previous organisation's leads.

`useLeadsStore.clear()` had existed all along, documented in its own source as "called on
sign-out". Nothing called it. That is the whole bug.

The `captures/` directory was leaking too, and worse: `discardCaptureFiles()` only fires once a
lead has fully drained to the server, so emptying the outbox with drafts still in it stranded
their photos and voice notes under the document directory — the one place the OS never
reclaims — referenced by nothing and deleted by nothing.

**Fixed once, in one place:** `lib/localData.ts`, called from the single sign-out path that
both `signOut()` and the unprompted `SIGNED_OUT` event now share. It resets in-memory state
first (a mounted screen renders from zustand, not from disk), then sweeps every `yieldd-*` key
as a prefix rather than a hand-kept list — there is no `stores/index.ts` to notice an eighth
store being added — then deletes the capture root. The one deliberate exception is the
revocation breadcrumb, excluded by name.

Closed by the same work as 70, but it was never 70's scope, which is why it has its own number.

---

### 69. The keyboard covers what you are typing, and the screen will not scroll — reported 2026-09-18, BUILT 2026-09-18

**Reported on an Android handset:** on the sign-in screen, typing into the email or password
box leaves that box behind the phone's keyboard, and the screen will not scroll up to reveal
it. Asked for at the same time: sweep the rest of the app for the same fault.

The sweep is most of this item. The app already has one shared wrapper,
[components/app/KeyboardSafe.tsx](components/app/KeyboardSafe.tsx), whose whole job is this —
and **five screens had quietly stopped using it**, each hand-rolling its own copy with a
different Android setting, the reported sign-in screen among them. Nothing checked that a
screen with a text field was wrapped, which is how it drifted through three separate rounds
of work on these same screens without anyone noticing.

---

#### The reported screen was two faults, and the one that was reported is not a keyboard bug

**Fault 1 — `behavior="height"` on Android.** Of the three `KeyboardAvoidingView` modes,
`height` is the only one that measures against an `_initialFrameHeight` captured at first
layout and never recomputed, so it freezes when the keyboard changes size — the emoji panel,
the predictive-text bar. It was also not what the app's own shared wrapper used.

**Fault 2 — the screen genuinely could not scroll at all.** This is the literal complaint
("not scrolling"), and it is flexbox, not the keyboard:

```tsx
<ScrollView contentContainerClassName="flex-grow" ...>
  <View className="flex-1 justify-center">   {/* the whole form */}
```

`flex-1` is `flexGrow:1 flexShrink:1 flexBasis:0`. A `flexBasis:0` child adds nothing to its
container's intrinsic height, so the scroll content container resolved to **exactly the
viewport height** and the ScrollView had nothing to scroll, ever. The form then overflowed
that capped box, `justify-center` spilled it equally above and below, and a ScrollView cannot
scroll above offset 0 — so the top was permanently unreachable. Shrinking the viewport with
the keyboard made it worse.

The fix is one word, `flex-1` → `flex-grow`: `flexGrow:1` with React Native's default
`flexShrink:0` and `flexBasis:auto`, so the block is `max(content, available)`. It still
centres when there is room — #33a put that centring there on purpose and it is not reverted —
and grows the scroller when there is not. Deliberately `flex-grow` and not Tailwind's newer
`grow` alias, because `flex-grow` is used four lines above it in the same file and is
therefore known to compile under this NativeWind setup.

**Write this one down.** "The screen will not scroll" reads as a keyboard fault and is a
`flex-1`-inside-`flex-grow` trap. It is expensive to rediscover, and the same shape is one
careless edit away on any centred form.

#### Why every screen now passes `behavior="padding"`, including Android

`KeyboardSafe` used to pass `undefined` on Android, on the reasoning that
`softwareKeyboardLayoutMode` defaults to `resize` so the window shrinks by itself. Expo SDK 57
forces Android edge-to-edge, where the window is laid out behind the keyboard and no longer
reliably shrinks — and `undefined` renders a plain View that adjusts nothing. React Native
0.86 ships edge-to-edge fixes, but its release notes do not say whether the root view still
resizes, and that cannot be settled from a desk.

**It does not have to be, because `padding` is right under either answer.** The inset is
`max(frame.y + frame.height - keyboardScreenY, 0)`, measured from the wrapper's own layout
rectangle:

- **Window did not resize** — the frame still runs under the keyboard and the subtraction is
  exactly the overlap. The enclosing `SafeAreaView` already reserved `insets.bottom` and the
  frame starts below it, so the navigation bar is not counted twice.
- **Window did resize** — layout reports the reduced height while the keyboard is still in
  full-screen coordinates, the subtraction goes negative, and the clamp makes it 0. Nothing is
  added. **No double-adjust**, which was the stated reason for avoiding `height` originally.

**iOS does not change at all** — it was already `padding`. Only Android moves, from "do
nothing" to "do the right amount". That is the main reason this is a safe change to make
across sixteen screens at once.

**No new dependency.** `react-native-keyboard-controller` is the usual recommendation for
edge-to-edge Android and would be more robust, but it **is not in Expo Go**, and this project
has no `expo-dev-client` and an EAS build still blocked on a Yieldd-owned Expo account. Adding
it would have made this untestable. Staying on the built-in component is what keeps it
checkable on a handset this week.

#### What else the sweep found

| Fault | Screens |
|---|---|
| Hand-rolled `KeyboardAvoidingView`, `behavior="height"` on Android | sign-in, [complete-profile](app/(app)/onboarding/complete-profile.tsx), [whatsapp-template](app/(app)/settings/whatsapp-template.tsx), [email-template](app/(app)/settings/email-template.tsx) |
| No wrapper of any kind | [forgot-password](app/(auth)/forgot-password.tsx), [reset-password](app/auth/reset-password.tsx), [verify-code](app/verify-code.tsx) |
| **Save button outside the wrapper** — broken on iPhone too | [leads/edit](app/(app)/leads/edit.tsx), [events/new/templates](app/(app)/events/new/templates.tsx) |
| Search field over a list with no `keyboardShouldPersistTaps` | [(tabs)/leads](app/(app)/(tabs)/leads.tsx) |

The last three of those four rows were **not Android-only**. The two stray footers hid Save
behind the keyboard on iPhone as well, and they are the exact mistake `KeyboardSafe`'s own
docblock warns about in its opening sentence. On the leads tab the default
`keyboardShouldPersistTaps="never"` meant the first tap on a result was spent dismissing the
keyboard and never reached the row — which reads as a dead list, not as a dismissal.

The three template screens are the ones **#14 fixed on 2026-09-02**, by copying
complete-profile's pattern — which already carried `height`. So #14's fix propagated the wrong
Android setting to three more screens, and `KeyboardSafe` was written later with a different
answer that nobody reconciled. Two contradictory Android strategies in one codebase is
precisely what the new check exists to prevent.

#### Deliberately not changed

- **`app.json` keeps `softwareKeyboardLayoutMode` at its default `resize`.** Expo suggests
  `pan` for bottom-tab apps, but `pan` disables the window resize that the form screens may be
  relying on, and it is a global switch with the widest blast radius in the app. If the custom
  `TabBar` turns out to float above the keyboard, hide it on `keyboardDidShow` instead.
- **[AuthFormWeb.tsx](components/auth/AuthFormWeb.tsx) and the whole web dashboard.** In a
  browser the soft keyboard is the browser's problem and `KeyboardAvoidingView` is inert — its
  `Keyboard` events never fire there. The website's sign-in keeps its own two-column layout.
- **The leads tab is exempt from the wrapper, with the reason written into the file.** Padding
  the bottom of that screen would shrink the results list at the moment the rep wants to read
  it, and the search box sits in a fixed header well above the keyboard. What it needed was the
  persist-taps prop, which it now has.
- **`Modal` overlays after `</KeyboardSafe>` are fine and stay where they are**
  (`CaptureLocationNotice`, `PhoneChoiceSheet`). A Modal portals to its own window, so it has
  no layout in that tree. The check knows the difference by following the import and looking
  for a `<Modal`, rather than keeping a list of component names that would go stale.

#### `npm run verify:keyboard`

New, [scripts/verify-keyboard.mjs](scripts/verify-keyboard.mjs). Three rules, each one a bug
that actually shipped: a screen with a text field is wrapped; nothing but `KeyboardSafe.tsx`
imports `KeyboardAvoidingView`; no JSX sits between `</KeyboardSafe>` and `</SafeAreaView>`.
An exemption needs a written reason on the same line, so it has to be argued rather than
dropped in.

**Each of the three rules was tested by reintroducing the bug and watching it fail**, not just
by watching a green run — including the `behavior="padding"` guard. Worth knowing: the first
attempt at that test silently proved nothing, because the `sed` anchor did not match the file
it was editing, so the rule never saw a broken file and "passed" for the wrong reason.

**It asserts structure and cannot open a keyboard.** A green run is not a tested screen, and
the script prints that on every run so nobody mistakes the two.

#### Verified

**Confirmed on an Android handset by the user, 2026-09-18**, the same day it was reported —
which settles the one thing the reasoning above could not: under SDK 57's edge-to-edge,
`behavior="padding"` is the correct Android setting, and it does not double-adjust. Every
screen goes through the single wrapper, so that one result covers all sixteen.

Before that, the served Metro bundle was checked rather than assumed: the fixed class is in
it, and `behavior: "height"` appears **zero** times anywhere in the app while
`behavior: "padding"` appears **exactly once** — the shared wrapper. Worth keeping as a habit;
a running Metro will happily serve a stale bundle and still answer HTTP 200.

Still worth a look when someone is next on an **iPhone**: lead edit and the event wizard's
templates step. Those two had their Save button outside the wrapper, so they were broken on
iOS as well, and iOS is the only place a mis-applied `padding` could show as a regression —
everything else there is byte-for-byte what it was.

[reset-password](app/auth/reset-password.tsx) is the one screen here that **cannot** be checked
on a phone today: the emailed link opens in a browser even on a handset, by design. It becomes
a real phone screen the moment App Links ship, which is why it was fixed rather than skipped.

---

### 63. Only the gold circle starts a voice note — reported 2026-09-17, DONE 2026-09-17

On the capture details screen the voice note is a card: a gold mic circle, "Add a voice note",
and "Up to 2 minutes" underneath. Nothing about it says the circle is the only live part, and
today it is — in [components/capture/VoiceRecorder.tsx](components/capture/VoiceRecorder.tsx)
the `inline` variant wraps everything in a plain `View` and only the 46px `Pressable` calls
`press()`. A rep tapping the words, or the box, gets nothing at all, which reads as a dead screen
rather than as a missed target.

**Asked for:** the whole box becomes the button. Tap anywhere on the card and recording starts.

Four things to get right, none of them obvious from the report:

1. **The trash button must not be swallowed.** Once a note exists the card also holds a delete
   circle. Nesting it inside an outer `Pressable` makes the outer one fire too on some Android
   builds, so the delete has to stop the press reaching the parent, or the outer press target has
   to exclude it.
2. **`press()` is three different verbs.** Idle starts, recording stops, recorded plays. Handing
   the whole card to `press()` means a rep who taps the card to see what it says will stop a
   recording mid-sentence. Safer: the card starts a recording when idle, and once recording or
   recorded, only the circle keeps the stop and play action.
3. **The other three states are cards too** — checking, plan-locked and permission-denied. Those
   already carry their own button (See Pro, Settings), and must not become tappable boxes that do
   something else.
4. **AGENTS.md hazard.** Swapping the outer `View` for a `Pressable` is fine, but do not add an
   `active:` class to a `View` that stays a `View` on first render, and do not give the card a
   `shadow-*` that only appears in one branch. Both trip the NativeWind variable-provider upgrade
   and produce the bogus "Couldn't find a navigation context" red screen.

The standalone `screen` variant (the manual-entry route) is not in scope — it is already a
full-screen target with a 76px button and its own "Tap to record" label.

**Done 2026-09-17.** The whole card is the button now, in all three of its working states: tap
anywhere to start, tap again to stop, tap again to play. The gold circle is a plain `View` — leaving
it a `Pressable` inside a `Pressable` would have been two press targets with one behaviour and a
responder negotiation to reason about on every tap, and one target cannot disagree with itself.

The subtitle carries the affordance rather than leaving it to be guessed: "Tap anywhere to record,
up to 2 minutes", then "0:14 · tap to stop", then "0:14 · tap to play".

Delete keeps its own press. React Native hands a touch to the deepest view that claims it, so the
card underneath does not also fire — which matters precisely here, because that press is
destructive and the card's press would start a new recording on top of the one just discarded.

Untouched, deliberately: the plan-locked and permission-denied cards, which already carry their own
button (See Pro, Settings) and must not become boxes that do something else; and the full-screen
`screen` variant, which was never the complaint — it is a 76px target under a "Tap to record" label.

Changed: [components/capture/VoiceRecorder.tsx](components/capture/VoiceRecorder.tsx).
**Not yet seen on a handset.**


---

### 64. Home's blue box — "WhatsApp 22 pending" is not a real thing, and nothing in the box is clickable — reported 2026-09-17, DONE 2026-09-17

Two complaints about the same four-cell navy panel on Home
([app/(app)/(tabs)/index.tsx](app/(app)/(tabs)/index.tsx)): This event · Follow-ups ·
Needs a note · WhatsApp.

**The WhatsApp cell is mislabelled, not merely unwanted.** It counts nothing to do with WhatsApp:

    const WHATSAPP_PENDING_COUNT = syncedLeads.filter((l) => l.status === 'New').length;

It is the number of leads still sitting at status New — nobody has been sent anything, by any
channel. A rep who WhatsApps twenty people without moving their status sees the figure stay at 22,
and a rep who moves a status without messaging sees it drop. So the report is right for a better
reason than the one given: the label describes work that is not being measured.

**Asked for:** remove the WhatsApp cell, put something useful in its place, and make every figure
in the box open the leads it counts. Tapping 22 has to land on those 22.

Where each one should go:

| Cell | Opens |
|---|---|
| This event | the leads list, current event, no filter |
| Follow-ups | `/(app)/follow-ups` |
| Needs a note | the leads list with the existing "Needs a note" pill already selected |
| the fourth | whatever replaces it |

**Decision needed on the fourth cell.** Recommendation: keep the number and fix the label —
"Not contacted" for the same `status === 'New'` count, which is honestly what it is and is the
most actionable figure a rep has. "Captured today" is the other candidate, but Home already shows
that number higher up the screen, so it would say the same thing twice. Drafts waiting to sync is
a third, already computed as `draftCount`, but it is a fault indicator and does not belong in a
row of work counts.

Two things that are not free:

- **The leads screen holds its filter in local state**, not in a route param — only `focus` is
  read from the URL today. Sending a rep to a pre-filtered list means teaching
  [app/(app)/(tabs)/leads.tsx](app/(app)/(tabs)/leads.tsx) a `filter` param the same way it
  learned `focus`. And if the fourth cell becomes "Not contacted" there is no New pill to select:
  the filter row is All / Needs a note / Qualified / Won / Lost, so one has to be added or that
  cell has nowhere to land.
- **The identical box is on the leads screen too**, WhatsApp cell and all, reading from its own
  copy of the same counts. Fix one and the other still lies. Do both in the same change, or the
  rep sees "22 pending" one tab over.

While in there: Home counts "This event" over `allLeads` including drafts, the leads screen counts
it over synced leads only, so the two boxes can disagree by the size of the outbox. Not what was
reported, and worth settling in the same pass.

**Decided and built 2026-09-17, same day it was reported.** Half of this item was withdrawn
before it started: **the WhatsApp cell stays exactly as it is**, label and number both. What was
built is the other half — every cell in the box now opens the leads it counts.

Where each one goes, on both copies of the box:

| Cell | On Home | On Leads |
|---|---|---|
| This event | the leads list | selects the All pill |
| Follow-ups | `/(app)/follow-ups` | `/(app)/follow-ups` |
| Needs a note | the leads list, Needs a note pill selected | selects that pill |
| WhatsApp | the leads list, New pill selected | selects that pill |

Home carries the pill across as a `filter` route param; the leads screen has no navigating to do,
so it moves its own filter row instead. Each cell also grew a small chevron beside its label, since
a number that does something has to look like it does something.

Four things that had to be dealt with to make it honest:

- **There was no New pill to land on.** The filter row was All / Needs a note / Qualified / Won /
  Lost, and the WhatsApp figure counts `status === 'New'`. Added, with the same grey the status
  sheet gives New, so the pill and the badge on a lead agree.
- **The `Lost` pill never filtered anything.** Pre-existing, and nothing to do with this report:
  `filtered` had branches for Needs a note, Qualified and Won and then `return true`, so choosing
  Lost showed the entire list — the exact outcome the comment above `FILTERS` says the pill exists
  to prevent. One line, fixed in the same pass.
- **Home's counts covered every event; the list it now opens covers one.** "Needs a note" and the
  WhatsApp figure were computed over all synced leads while "This event" beside them was scoped to
  the current event. Invisible while nothing was tappable, a plain contradiction once it is: tap 22,
  arrive at 9. Both are now scoped to the current event and to synced leads, which is what the leads
  screen shows.
- **The route param is cleared the instant it is applied.** Without that, tapping the same counter
  twice does nothing the second time (the param never changed, so the effect never re-runs), and
  returning to the tab from the tab bar weeks later silently re-applies a filter the rep cleared by
  hand. It is set to `''` rather than `undefined`, which is removal under every router version
  rather than the literal string "undefined".

**Still open, deliberately.** "This event" counts drafts, the list it opens does not — so a rep with
two captures in the outbox taps 10 and sees 8. The draft count is deliberate and commented as such
(a lead captured offline still happened), so it was left alone rather than quietly reversed. If it
bites, the fix is a line on the drafts screen, not a change to the number.

Changed: [app/(app)/(tabs)/index.tsx](app/(app)/(tabs)/index.tsx),
[app/(app)/(tabs)/leads.tsx](app/(app)/(tabs)/leads.tsx). `npm run typecheck` clean.
**Not yet seen on a handset** — phone routes redirect on web, so this one cannot be checked in a
browser.


**Amended the same day, and this is the part worth reading.** Shown the rebuilt box, the product
owner's answer was that the cell is not mislabelled at all — it was always meant to mean *WhatsApp*,
and a tap on the WhatsApp icon (on a lead row, on the lead screen, or in the send queue) is to be
taken as the message having been sent. So the label was right and the number was wrong.

It now counts leads **nobody has opened a WhatsApp draft for**, and the pill it lands on is
`WhatsApp pending`. The `New` pill added an hour earlier was removed again: it existed only to give
the old number somewhere to land.

Nothing new had to be recorded to do this. `recordSend` has written a `message_sends` row on every
WhatsApp tap since the lead-row actions were unified, `fetchSentLeadIds` was already written, and
the table's RLS mirrors the leads policy exactly — a rep reads sends for precisely the leads they
can see — so counting on the device agrees with the list rather than reporting a fraction of it.
The one thing that did not exist was any way for the lead list to know, so:

- `useLeadsStore` gained `whatsappSentIds`, filled on refresh from `fetchSentLeadIds('whatsapp')`
  in the same `Promise.all` as the leads. That request's failure is swallowed: a figure that could
  not be recomputed is stale, not a reason to show a rep no leads.
- It is a **union** with what the device already knew, never a replacement, and nothing is ever
  removed. A rep on a show floor with no signal still opens WhatsApp and still messages the
  customer; `recordSend` drops that row, and a refresh that overwrote the list would put the lead
  back as pending after they had already been messaged.
- `markWhatsAppSent` is called on the tap itself, in `useLeadActions` and in the send queue, so the
  count falls immediately instead of at the next refresh. The send queue's **skip** deliberately
  does not call it: passing on someone is not messaging them.
- **A lead with no usable number is excluded from the count**, via `whatsappDigits`. It is not work
  anyone can do, and counting it means the figure never reaches zero however many people the rep
  messages.

What this still cannot claim, and must not start claiming: the app hands WhatsApp a draft and the
rep presses send inside WhatsApp. "Pending" therefore means nobody has been handed the draft, not
that nothing was delivered. That is the same line `lib/api/messageSends.ts` has drawn since it was
written, and the reason a bulk **skip** does not count.

Changed on top of the above: [stores/useLeadsStore.ts](stores/useLeadsStore.ts),
[hooks/useLeadActions.ts](hooks/useLeadActions.ts),
[app/(app)/leads/send-queue.tsx](app/(app)/leads/send-queue.tsx).


---

### 65. Leads are locked to one event, and the event name is decoration — reported 2026-09-17, DONE 2026-09-18

The leads tab header shows the current event and a chevron — "IITF · Mumbai ›" — and the list
below is that event's leads only. The chevron is the complaint: it is a `Pressable` with **no
`onPress`** ([app/(app)/(tabs)/leads.tsx](app/(app)/(tabs)/leads.tsx)), so it looks like a picker
and does nothing. There is no way to see a lead from last month's show without changing which
event you are working in.

**Asked for, three parts:**

1. **All events by default.** Open the tab and see every lead captured, whichever show it came
   from.
2. **The name and the chevron open a dropdown** of exhibitions to narrow to. Exhibition and event
   are the same thing here; there is one concept, not two.
3. **Newest first, always**, by capture date and time.

What that costs, in order:

**(1) is a screen change only.** The store already holds every event's leads — `refresh()` is
never called with an `eventId` by anything (six call sites, all bare), so `fetchLeads` returns the
whole org's visible set and the leads screen narrows it itself with
`(!event || !l.eventId || l.eventId === event.id)`. Dropping that predicate shows everything with
no new request and no new query. The four counts in the box above the list are computed from the
same array and will silently change meaning — "This event" becomes all events — so that box needs
a label that matches the scope, which is the same box 64 is rebuilding. **Do 64 and 65 together.**

**(2) must not write to `useCurrentEventStore`.** That store answers "which show am I working in"
and decides where the next captured card lands. A rep who opens the dropdown to look up someone
from a show in March must not discover that the camera is now filing new cards into March. This is
the same distinction `useEventSelectionStore` was built for on the dashboard — see its header
comment, which says so in as many words. Viewing scope is its own state. Whether the phone reuses
that store or gets its own is open; what is not open is that picking here changes what you see and
nothing else.

**(3) is mostly already true, and the part that is not is worth knowing.** `fetchLeads` orders
`created_at desc`, and `createLead` writes `created_at: input.capturedAt` — the time on the
device when the card was taken, not the time the row reached the server. So a stack of leads
captured offline on Saturday and synced on Monday still sorts into Saturday. That is the correct
behaviour and it is not accidental; do not "fix" it by letting the column default.

What is missing is that **the list never sorts anything itself** — it renders the store array in
whatever order it arrived, and the store prepends unsynced drafts to the front wholesale. That
holds up today because drafts are the newest, but nothing enforces it, and merging several events
into one list makes the order matter far more than it did when every row came from one show.
Sort explicitly in the screen on `capturedAt` descending. It is three lines, and it removes a
dependency on fetch order that nobody would think to check.

`leads.capturedAt` is `created_at` on the row — there is no separate `captured_at` column on
`leads` (the one in the schema belongs to `find_duplicate_lead`'s return type), so there is
nothing to migrate.

**Built 2026-09-18.** No new query and no migration, as expected — the predicate simply went.

**Tested on a handset by the user, 2026-09-18, and working.** The check that mattered is the one
the item warns about: with the list narrowed to another show, capturing a card still files it into
the show the rep is working in. That was verified on the device rather than only by reading the
code — the leads tab cannot be driven in a browser, because `(app)/(tabs)/leads` and
`(dash)/leads` both claim `/leads` on web.

The store question resolved to **a fourth thing rather than either of the two candidates**:
[stores/useLeadScopeStore.ts](stores/useLeadScopeStore.ts), holding one `scopedEventId`, and
**not persisted**. Reusing `useEventSelectionStore` would have tied the phone's viewing scope to
the dashboard's "which shows am I comparing" totals, which is the same collapse this item warns
about one level removed. Persisting it would have broken requirement 1 on the second launch —
a narrowing that survives a cold start is an invisible filter hiding leads days later, which is
the complaint, not the fix. Its header comment now names all three "which event?" questions so
the next person does not have to work the distinction out again.

`useLeadScope()` in [hooks/useEvents.ts](hooks/useEvents.ts) resolves the id against the events
the viewer can see, so a deleted event — or one a rep was removed from — reads as "all events"
rather than stranding the tab on an empty list. The screen and the sheet both call it, so the
header can never name one show while the sheet ticks another.

The sheet is a sibling, [components/shared/LeadScopeSheet.tsx](components/shared/LeadScopeSheet.tsx),
not a parameterised `EventPickerSheet`: closed shows are listed (the point of the item), there is
an "All events" row, and the copy says *"Changes what this list shows. New cards still save to the
show you are working in."* `EventPickerSheet` was touched only to take `eventDetailLine` from the
new [lib/eventDisplay.ts](lib/eventDisplay.ts) instead of its own private copy — an import-only
change, so the capture path is untouched.

Two things beyond the three asked for, both because merging the shows made them necessary:

- **The list is grouped under per-show headings** while the scope is all-events, flat once it is
  narrowed. Without them a merged list gives no way to tell one show's leads from another's,
  since a row never names its event. Each heading is a `Pressable` that narrows to that show.
- **The counters box relabels** — "This event" becomes "All events". All four figures come off the
  same array, so they became all-events figures the moment the predicate went; a label still
  saying "This event" would be a wrong number with a confident caption.

The sort and the grouping live in [lib/leadScope.ts](lib/leadScope.ts) rather than inline in the
screen, so both can be checked without a renderer: `npm run verify:lead-scope`. Worth knowing —
the first version of that script asserted the `Z` vs `+00:00` trap and **passed either way**,
because the date-time prefix decides those comparisons long before the suffix is reached. The
case that actually distinguishes a text sort from `Date.parse` is a **non-UTC offset**
(`14:30+05:30` is 09:00Z but sorts above a `10:00Z` that came later), and that is what it asserts
now.

Not done, deliberately: Home's counters stay scoped to the current event, so tapping "22 pending"
there can land on an all-events list showing more. The labels differ, so it is honest rather than
wrong — see item 67.

Changed: [app/(app)/(tabs)/leads.tsx](app/(app)/(tabs)/leads.tsx),
[hooks/useEvents.ts](hooks/useEvents.ts),
[components/shared/EventPickerSheet.tsx](components/shared/EventPickerSheet.tsx). Added:
`stores/useLeadScopeStore.ts`, `components/shared/LeadScopeSheet.tsx`, `lib/eventDisplay.ts`,
`lib/leadScope.ts`, `scripts/verify-lead-scope.mjs`.

---

### 68. Lead detail — a long address runs outside the white card — reported 2026-09-18 `[x]`

**Fixed 2026-09-18.** `FieldRow` now gives the value `flex-1 min-w-0 text-right` with a
`gap-[12px]` and `items-start` on the row, so every value wraps inside the card instead of
running past it; the line height is set in `style` because `Typography` prepends its variant's
own leading. The Consent row at :543, which repeats the same classes by hand, was kept in step.
The user chose right-aligned wrapping over a stacked row. Nothing is truncated.

The real cause was narrower than first written below: the value had no `flex-1`, so it sized to
its own intrinsic width rather than the row's remaining width. The same fix was already working
at [app/(app)/events/new/complete.tsx:110-121](app/(app)/events/new/complete.tsx#L110-L121) —
`FieldRow` was simply never brought in line with it.

**Also added in the same pass:** a `Branch address` row. `branchAddress` was captured in the
edit form and shown on the web dashboard, but never displayed on the phone — a rep could type
one and never see it again.

**Reported on an iPhone.** On the lead detail screen the address spills past the right edge of the
white card it sits in, instead of wrapping inside it.

**The cause is `FieldRow`, not the address.**
[app/(app)/leads/[id].tsx:714-721](app/(app)/leads/[id].tsx#L714-L721) is:

```tsx
<View className="flex-row justify-between py-[10px] border-b border-section">
  <Typography className="text-[12.5px] text-slate">{k}</Typography>
  <Typography className="text-[12.5px] font-bold text-navy">{v}</Typography>
</View>
```

Neither child can shrink. **React Native defaults `flexShrink` to 0, unlike the web's 1** — that
difference is the whole bug, and it is why this looks fine in a browser preview and wrong on a
handset. The value `Typography` therefore claims its full intrinsic width, refuses to wrap, and
runs out of the row and past the card's padding.

**So it is not an address problem.** `FieldRow` renders Company, Designation, Website, Landline,
Address, every extra designation and every extra email (lines 557-563 and 540-542). The address
is simply the first value long enough to show it. A long company name, a long URL or a work email
at a long domain all overflow identically. There is exactly one definition of `FieldRow` in the
codebase, so one fix covers every row on the screen.

**The fix:** let the value take the remaining width and wrap — `flex-1` plus `text-right` on the
value, and `shrink-0` on the label so the key stays on one line. Check the result against a
two-line and a four-line address; a right-aligned wrapped address is the thing to look at, and if
it reads badly the alternative is a stacked row (label above, value below) for long values only.
Decide that by looking at it on a device, not in the abstract.

**Do not fix it with `numberOfLines={1}` or an ellipsis.** The address is the reason the field
exists — truncating it hides exactly what the rep opened the lead to read.

**Check the other block on the same screen while you are there.** "Where this was captured"
([app/(app)/leads/[id].tsx:615-625](app/(app)/leads/[id].tsx#L615-L625)) renders its line as a
full-width `Typography` with no flex row, so it should already wrap correctly — confirm it does
rather than assume, since the report says "the address" and that block holds one too.

**Watch the NativeWind rule when editing these class lists.** Adding a pseudo-class or a
variable-backed utility (`shadow-`, `scale-`, `ring-`, gradients, filters) to only one branch of a
conditional className throws the bogus "Couldn't find a navigation context" red screen. `flex-1`
and `shrink-0` carry no variables and are safe.

---

### 67. A tile on Home opens the Leads tab on every show, not the one you picked — created 2026-09-18, restated by the user 2026-09-18, DONE 2026-09-20 `[x]`

**The user's own description, which is the spec:**

> If someone clicks on the home screen, from Your Events, whatever event they have selected, and
> clicks on any of the four blue tiles below, you should take them to the Leads screen and show
> only that event's data. Right now it takes them to the Leads screen showing the data for all
> events.

Created by 65 and deliberately left open then, because the fix was a product decision rather than
a bug. **The decision has been taken: the tile carries the picked show through.** Do not re-ask it.

**The chain, all in [app/(app)/(tabs)/index.tsx](app/(app)/(tabs)/index.tsx):**

| Line | What it does |
|---|---|
| 178-200 | The "Your events" pill row. Each pill calls `selectEvent(e.id)` on `useCurrentEventStore` |
| 50 | `useCurrentEvent()` reads that back, so `event` IS whatever the user tapped in that row |
| 60 | `forThisEvent` filters the leads to `event.id` |
| 303, 320, 344, 365 | The four tiles display counts derived from `forThisEvent` |
| 326-330, 347-351 | Two tiles push to the Leads tab with `params: { filter: … }` and **nothing that names the event** |

So Home computes its figures for one show and then sends you to a list that 65 made default to
every show. Both screens are individually correct and the tap loses the show in between.

**What to build.** Add a `scope` param carrying `event.id` alongside the existing `filter`, and
have the Leads tab apply it to `useLeadScopeStore` on arrival.

- **All four tiles, not the two that already pass a param.** Fixing only those leaves the same
  complaint alive on the other two.
- **Copy the `filterParam` effect in [app/(app)/(tabs)/leads.tsx](app/(app)/(tabs)/leads.tsx)
  exactly**, including the `router.setParams` that clears the param immediately. Its comment says
  why: without the clear, returning to the tab days later silently re-applies a scope the rep had
  since changed. A sticky `scope` is a worse bug than this one, because the list just quietly
  stops showing shows the rep knows they captured.

**Three things not to do:**

- **Do not scope the Leads tab back to the current event by default.** That is item 65 undone. The
  tab still opens on all shows when reached by its own tab icon; this is a one-shot narrowing on
  arrival from Home.
- **Do not write to `useCurrentEventStore`.** That store decides where the next captured card is
  filed. `useLeadScopeStore` exists precisely to keep viewing scope apart from capture scope — 65's
  whole design.
- **Do not make the scope persist.** `useLeadScopeStore` is deliberately not persisted.

**Done means:** pick a show in "Your events", tap each of the four tiles in turn, and the Leads
tab opens showing that same number for that same show, with the right filter pill where one
applies. Then reach the Leads tab by its own icon and it opens on all shows again. Then capture a
card and confirm it still files into the same event as before.

---

**DONE 2026-09-20.** A `scope` param carries `event.id` from the tile, and the screen it opens
applies it and clears it in the same write. Two decisions were taken with the user before
building, neither of which can be read back out of the diff.

**Finding A — the "four tiles" are not four routes, and all four were done anyway.** Three land
on the Leads tab; the Follow-ups tile opens `app/(app)/follow-ups/index.tsx`, which had no concept
of an event at all — no `useEvents`, no scope, no params. The user chose to teach it rather than
leave a quarter of the complaint alive.

It reads **its own route param** and never touches `useLeadScopeStore`. That is the load-bearing
part: writing the shared store from there would mean opening today's follow-ups silently narrowed
the Leads tab on another tab, which is the same class of invisible filter 65 exists to prevent.
It also gets a row naming the show with a **Show all** button, because a list that is quietly
shorter than the rep expects is the bug, not the fix. There is deliberately **no `setParams`
clear** on that screen, unlike the tab: it is a pushed screen, so every push mounts it fresh and
leaving pops it. Clearing on arrival would throw the scope away mid-visit.

**Finding B — the counts had to move onto the list's own rule, and that turned out to be the
smallest of three problems.** A tile's number is a promise about the screen it opens. Three
separate things were breaking that promise, and only the first was in the brief:

1. **The counting basis.** Home counted drafts and leads with no `eventId`; `leadsInScope` drops
   both. Tap 12, arrive at 9. The three Leads-tab tiles now count from `leadsInScope` itself.
   Drafts are not hidden by this — they keep their own badge on the pencil icon, and "captured
   today" still counts them, which is the figure that should.
2. **The pill.** "This event" passed no `filter`, so the screen kept whichever pill the rep last
   chose by hand — tap "12" with `Won` still set and get 3. It now passes `filter: 'All'`, which
   is what the in-screen version of that same cell already did (`leads.tsx` calls `setFilter('All')`).
3. **The search box.** `filtered` applies the search query *before* the pill, so a few letters
   left in the box cut the list under every tile. The arrival effect now clears it. This one is a
   behaviour change to the two tiles that shipped in 64, and was flagged to the user as such
   rather than slipped in.

Found 2 and 3 only by reading the whole path from the tile to the rendered row. Typechecking and
the unit checks would both have passed with them still there.

**One rule for "this show".** The follow-ups screen shows unsynced drafts and the leads list does
not, so those two cannot share `leadsInScope` — but they must agree on what "this show" means.
`narrowToEvent` is that narrowing on its own, and `followUpsDue` is the due-date rule that three
screens each owned a private copy of. `verify-lead-scope.mjs` asserts the two narrowings return
the same ids once drafts are excluded, so an edit that pulls them apart fails there. That script
compiles `lib/leadScope.ts` alone and cannot render a screen, so it locks the **rule**, not the
pixels — it would not catch a screen that stopped calling them.

**Known residual, pre-existing and untouched:** the *Leads tab's* follow-ups cell counts
synced-only (it derives from the scoped `leads`) while the follow-ups screen it opens shows
drafts. Not part of 67, which is about Home; Home's own follow-ups tile does match its screen,
because it counts `narrowToEvent` rather than `leadsInScope` for exactly this reason.

**Verified:** `npm run typecheck` clean; `npm run verify:lead-scope` 30/30 including 13 new
assertions; the served Metro bundle rebuilt clean (2272 modules) and contains the new code and
none of the removed code. **The click-through is NOT verified** — headless sign-in stopped
working when the OTP work landed, and `(tabs)` screens are not reachable by URL on web, so the
six manual steps under "Done means" above still need a handset.

Changed: [app/(app)/(tabs)/index.tsx](app/(app)/(tabs)/index.tsx),
[app/(app)/(tabs)/leads.tsx](app/(app)/(tabs)/leads.tsx),
[app/(app)/follow-ups/index.tsx](app/(app)/follow-ups/index.tsx),
[lib/leadScope.ts](lib/leadScope.ts) (added `narrowToEvent`, `followUpsDue`, `startOfDay`),
[scripts/verify-lead-scope.mjs](scripts/verify-lead-scope.mjs).

---

### 66. A voice note can only be played once — DONE 2026-09-18

**Reported, and reproduced by the user on a device.** Open a lead, play the voice note, let it
finish. The play button then does nothing. The only way to hear it again is to go back to the list
and open the lead a second time.

**Almost certainly the playhead, not the audio.**
[components/app/VoiceNoteCard.tsx:54](components/app/VoiceNoteCard.tsx#L54) is:

```tsx
onPress={() => (status.playing ? player.pause() : player.play())}
```

When the recording ends the player sits at the end of the file. `play()` then resumes from the end,
which is over immediately and sounds like nothing happened. Leaving the screen unmounts the card, so
reopening the lead builds a fresh `useAudioPlayer` at position 0 - which is exactly why reopening
"fixes" it, and why that detail in the report is the useful clue rather than a side note.

**The fix is to rewind before replaying**, not to rebuild the player: when the note has finished
(`status.didJustFinish`, or the position having reached the duration), `seekTo(0)` first, then
`play()`. Worth checking the same press handler covers a pause part-way through, which should
resume rather than restart.

Two things to confirm while it is open, since they share the same status object:

- **The progress bar** is drawn from the same `status`. It should return to empty when the note
  finishes, not stay full, or the second play looks broken even once it works.
- **The button icon** flips on `status.playing`. Confirm it goes back to the play triangle at the
  end rather than staying a stop square.

**Not a high-frequency-subscription problem.** `useAudioPlayerStatus` re-renders this card while a
note plays, which is exactly the pattern AGENTS.md warns about - but the rule is about keeping such
a hook out of a screen that holds text inputs, and `VoiceNoteCard` is already its own component for
that reason. Keep it that way: do not lift the player or its status into
[app/(app)/leads/[id].tsx](app/(app)/leads/[id].tsx).

**Test on a device, not a simulator:** play to the end and press play again; pause half way and
press play again; play, leave the screen mid-note, come back.

---

**What shipped.** The diagnosis above was right. The press handler was two states where it needed
three, so the fix is a decision rather than a toggle:
[lib/voicePlayback.ts](lib/voicePlayback.ts) exports `pressAction`, returning `pause`, `resume` or
`restart`, and `restart` is the only one that seeks. `seekTo` returns a promise, so the card awaits
it before calling `play()` — firing both in one tick plays from the end all over again. The player
is never rebuilt and the signed URL is never re-fetched.

**Which condition detects "finished", and why it is both.** `status.didJustFinish` first, falling
back to the position having come within a quarter second of the duration while not playing. Both
are needed, and which one actually fires depends on the platform. Every expo-audio status event
carries a full status with `didJustFinish: false` overlaid with whatever that event changed, and
`useAudioPlayerStatus` keeps the *last* event rather than merging them — so the flag survives only
until the next event arrives:

- **Android** emits it once on the transition into `STATE_ENDED` and then goes quiet, because the
  `playing: false` that follows is suppressed as transient
  (`BaseAudioPlayer.kt`, `onPlaybackStateChanged`). The flag stays true, so the flag is what fires.
- **iOS** emits it from `AVPlayerItemDidPlayToEndTime`, but the periodic time observer fires when
  playback stops and sends `currentTime` over a fresh status, which clears the flag
  (`AudioPlayer.swift`, `registerTimeObserver`). There the position check is the only thing left.
- **Web** maps it to `media.ended`, which is sticky until a seek.

`didJustFinish` is trusted without checking `playing`, since a player claiming both has still
reached the end. The position check has to require `!playing`, or the last quarter second of every
note would read as finished while it was still playing — the icon would flip to a triangle early
and a press just before the end would restart instead of pausing.

**The bar and the icon come off the same decision.** The bar reads `progressRatio`, which returns 0
once finished instead of staying full. The icon is now drawn from `pressAction(status) === 'pause'`
rather than from `status.playing`, so it cannot disagree with what pressing it will do.

**Still its own component.** The player and `useAudioPlayerStatus` stayed in `VoiceNoteCard`;
nothing moved into [app/(app)/leads/[id].tsx](app/(app)/leads/[id].tsx). Several notes on one lead
still mean several independent players, unchanged.

`npm run verify:voice-replay` walks all three states and both detection shapes, including the
boundary cases that would undo this: a pause half way must resume, and the final second of a
playing note must not read as finished.

**Verified on a handset by the user, 2026-09-18.** Played to the end and replayed, paused half way
and resumed, left the screen mid-note and came back — all correct, with the bar and the icon
following. Closed.

### 33. Sign-up rebuilt as steps, referral capture, and a first-run tutorial — reported 2026-09-11

Four separate pieces of work, reported together. Nothing here is started. Split below the way it
was described, so none of it gets merged into one screen by mistake.

**Open questions — answer before building 33a and 33b.** They are listed under each part.

---

#### 33a. Sign-up becomes email → code → name + password — DONE 2026-09-14

Creating an account is now **one email field**. A 6-digit code is emailed, entered on
[app/verify-code.tsx](app/verify-code.tsx), and everything else is collected afterwards on
[complete-profile](app/(app)/onboarding/complete-profile.tsx):

```
email → code → complete-profile (name + password + number + company) → referral (#33b) → fork → home
```

**Both open questions are answered:**

- **`company` and `phone` move to complete-profile**, which already asked for both. No metadata
  is sent at signup at all, so `handle_new_user()` falls back to its own defaults — the account
  starts as **"New user"** at **"My workspace"** and that screen replaces them.
- **Auto-confirm did NOT need turning off.** The plan assumed it did, and that would have broken
  signup on the live site. Probed against the live project instead:
  `signInWithOtp({shouldCreateUser:true})` returns **no session** even with `mailer_autoconfirm`
  on, so the code genuinely gates entry. The setting is untouched.

**Live config that did change (2026-09-14):** `mailer_otp_length` 8 → **6** (Supabase's minimum
— the user asked for 4, which it refuses), and **both** the magic-link and confirmation email
templates now contain `{{ .Token }}`.

**Worth keeping — the templates had no code in them.** Both contained only
`{{ .ConfirmationURL }}`, so the email would have arrived with a link and *nothing to type*,
and the code screen would have waited forever for a code nobody was sent. Nothing in the
codebase could have caught it. `npm run verify:otp` now asserts it on every run.

**Three traps, all found before they shipped:**

- **[verify-code.tsx](app/verify-code.tsx) is at the route root, not in `(auth)` — do not move
  it.** That group redirects anyone signed in straight to the app, and this screen signs the
  person in halfway through its own lifetime, so inside it the guard tears the screen away
  mid-verify. [app/invite.tsx](app/invite.tsx) sits at the root for exactly the same reason.
- **A half-finished signup has no password at all.** Verify the code, close the app before
  finishing the profile, and there is no password and no Google identity — unreachable from any
  second device. Hence **"Email me a code instead"** on the sign-in tab. It is not a nicety.
- **Google accounts must never be asked to set a password.** Whether to ask is derived from the
  placeholder name, not from the identity list: `email` is an identity for code and password
  accounts alike, so that test would also have caught older accounts that already have one.

**The account is created when the code is SENT, not when it is entered.** That is GoTrue's
behaviour, and two things follow. The invite token has to ride on the *send* call
([lib/auth/emailCode.ts](lib/auth/emailCode.ts)) or every invited rep silently lands in a brand
new organisation of their own. And **every abandoned signup leaves an empty "My workspace"
organisation behind forever** — see #56 below.

**No database migration was needed.** `handle_new_user()` already defaults a missing name and
company, and `profiles.phone` is nullable.

**Not built in the store.** `lib/auth/emailCode.ts` is a standalone module like
[passwordReset.ts](lib/auth/passwordReset.ts) and [google.ts](lib/auth/google.ts).
`stores/useSessionStore.ts` was untouched — another session had 62 uncommitted lines in it, and
`updateProfile` already accepted name, phone and company.

- **New suite:** `npm run verify:otp` — 20 assertions against the live project, creating and
  deleting throwaway accounts. The one that earns it is the invite token surviving
  `signInWithOtp`'s `options.data`.

---

#### 33b. Referral — "where did you hear about us", DONE 2026-09-14

Shown **after** the account is created, at
[app/(app)/onboarding/referral.tsx](app/(app)/onboarding/referral.tsx).

Options, in this order — the id in brackets is what is stored:

- Google `google`
- Social media `social` → opens a second list
- AI discovery `ai` → opens a second list
- Friends `friends`
- Colleague `colleague`
- Event or conference `event`
- Other `other`

**The three open questions are now answered:**

- **Social media platforms:** LinkedIn, Instagram, YouTube, WhatsApp, Facebook, X — in that
  order.
- **AI platforms:** ChatGPT, Gemini, Perplexity, Claude, Copilot — in that order.
- **Where it is stored:** two new text columns on `public.organizations` —
  `referral_source` (the top-level answer) and `referral_detail` (the platform, when the
  answer was Social media or AI discovery). Added by
  `supabase/migrations/20260914120000_org_referral_source.sql`, pushed 2026-09-14.

Both lists live in [lib/referral.ts](lib/referral.ts) and nowhere else.

**Organisations rather than profiles**, deliberately: an invited rep did not hear about Yieldd
from anywhere, they were invited by their admin. `nextRouteAfterAuth()` already sends every
non-admin straight home without passing the question.

**Fixed 2026-09-14:** the screen sits in the routing chain *before* the team-or-solo fork —
complete-profile → referral → fork. It has to come after complete-profile, because
[app/(app)/_layout.tsx](app/(app)/_layout.tsx) hard-redirects anyone without a phone back
there on every render and a screen placed earlier is an infinite loop. It comes before the
fork because the fork navigates with its own hardcoded `router.replace` and never returns
through `nextRouteAfterAuth()`, so a referral step placed after it would never be reached on
the one run that matters — the one straight after signing up. It uses the shared
[SkipLink](components/app/SkipLink.tsx) that #33c built for it; the Skip writes `'skipped'`,
because the routing rule is "has this org answered?" and a null column means *ask again,
forever*.

Two values are storable but never shown: `'skipped'` and `'predates'`. The migration
backfills `'predates'` onto all 5 organisations that already existed, so no current
admin — the Growth Saga demo login included — is stopped by the question mid-demo. It is kept
distinct from `'skipped'` so the report can tell "declined to answer" from "was never asked".

**Worth keeping — this screen is the exact case the NativeWind rule in AGENTS.md warns about.**
A selection highlight is by definition a class that appears after the first render, and if
that class is `shadow-*`, `ring-*`, `scale-*`, a gradient or a filter, react-native-css-interop
tries to upgrade the component mid-life and the app shows a completely unrelated red screen
reading *"Couldn't find a navigation context"*. So the highlight here is only plain background,
border-colour and font-weight swaps plus a tick: `border-2` is present in both branches and
only its colour changes. The platform chips use `flex-wrap` rather than a horizontal
`ScrollView`, which sidesteps the other AGENTS.md rule instead of working around it.

**Also worth keeping:** the value CHECK on `referral_source` is a trade with a real cost —
adding an eighth option means a *second* migration to widen it, exactly as `20260914100000`
had to do for `onboarding_intent`'s `'skipped'`. Confirmed with the user that the seven are
final, which is what buys the guard. `referral_detail` gets a length check only, because the
platform names are the half that moves.

- **New suite:** `npm run verify:referral` — 58 assertions. The one that earns the file reads
  the migration, parses the `in (...)` list out of the CHECK constraint, and asserts it is the
  same set as the ids in `lib/referral.ts`. That drift is invisible to the typechecker and
  surfaces only as a rejected write on a live signup screen.

---

#### 33c. A Skip option on every onboarding screen — DONE 2026-09-14

Every onboarding screen gets a Skip — not just the referral one. Applies to the referral screen,
the tutorial, and any onboarding screen added later.

**Built as a shared component**, [components/app/SkipLink.tsx](components/app/SkipLink.tsx), rather
than copied markup, so 33b and 33d inherit the same words, position and behaviour. It replaces
rather than pushes (onboarding must not sit in the back stack), lands on `homeRoute()` (which
already knows a browser belongs on the dashboard and a phone on the tab bar), and takes an
optional `onSkip` for a screen that has to record the skip somewhere.

**33b uses it as of 2026-09-14** — [the referral screen](app/(app)/onboarding/referral.tsx) was
the screen this component was built for, and its Skip records `'skipped'` through `onSkip` so the
question does not come back. The two older onboarding screens still take no Skip — see the two
decisions below — and that remains deliberate rather than outstanding.

**33d does NOT use it, and that closes this item rather than leaving it open.** The tutorial is
an overlay already sitting on Home, and `SkipLink` navigates with `router.replace(homeRoute())`
— right for an onboarding *screen*, wrong for an overlay, where it would remount the screen
underneath for nothing. Its Skip records and closes instead. The rule "every onboarding screen
is skippable" is satisfied everywhere it applies; the shared component is simply not the way to
satisfy it in a modal.

One thing to know before reusing `SkipLink` anywhere else: it goes to `homeRoute()` directly
rather than back through `nextRouteAfterAuth()`, so skipping a screen that has a later
onboarding step after it lands on Home and defers that step to the next sign-in. On 33b that was
accepted rather than forking the component, because answering — the path nearly everyone takes —
chains on correctly.

**Decision — no Skip on the fork, 2026-09-14.** "Setting this up for a team, or just yourself?" is
two taps, is asked once, and its answer decides where a brand new account is sent next. There is no
sensible third destination for someone who answers neither. A Skip was built for it and then
removed on the same day at your call.

**Decision — the contact number stays mandatory, 2026-09-14.**
[complete-profile](app/(app)/onboarding/complete-profile.tsx) is the one onboarding screen with no
Skip, and that is deliberate. Skipping it would mean a rep reaching the app with no number on
their digital card, which is the thing the card exists to hand out. It would also mean relaxing
the guard in [app/(app)/_layout.tsx](app/(app)/_layout.tsx) — which is exactly the enforcement #4
added on 2026-08-28 so that force-quitting the app is not a way past the number. Without relaxing
it, a Skip there is an infinite redirect, not a skip. Sign out remains the way off that screen.
The reasoning is written into the file so it does not get "fixed" later.

**Left behind by the reverted fork Skip — read this before touching `onboarding_intent`.**

The fork's Skip needed somewhere to record itself, because `nextRouteAfterAuth()` sends an admin
back to the fork on every sign-in while `organizations.onboarding_intent` is null — so a Skip that
recorded nothing would have reappeared forever and read as a broken button. `'skipped'` was added
as a third answer in that column, and the schema change was applied before the Skip itself was
dropped. It was left in place rather than undone:

- **Applied to the live database 2026-09-14** —
  [20260914100000_onboarding_intent_skipped.sql](supabase/migrations/20260914100000_onboarding_intent_skipped.sql)
  widens the CHECK from `('team','solo')` to `('team','solo','skipped')`. Rehearsed in a
  rolled-back transaction, then pushed, then read back. **No row holds `'skipped'` and nothing
  writes it** — checked on the live database the same day.
- `AccountIntent` in [types/session.ts](types/session.ts) and `toIntent` in
  [lib/mappers/profile.ts](lib/mappers/profile.ts) still accept it, deliberately: the type has to
  cover what the column can hand back. Narrowing them without narrowing the constraint would make
  a `'skipped'` row map to `null` and bring the fork back.
- Nothing else reads it: the routing rule is a truthy check, so any non-null value means "this org
  has answered", and `lib/api/organization.ts` types the column as plain `string | null`.

**The trap, if a Skip is ever wanted here again:** the column is not a free-text field. It carries
a CHECK constraint from 20260827130400, so a new value has to be added there first or the write is
rejected outright.

Also rejected, when this was being worked out: showing the fork only to brand-new accounts, with no
database change. It would stop showing for someone who reinstalls or changes phone before
answering, and Google sign-ups never set `isNewSignup`, so they would never see it at all.

---

#### 33d. First-run tutorial on the Home screen — DONE 2026-09-14

[components/app/FirstRunTutorial.tsx](components/app/FirstRunTutorial.tsx), mounted on Home.
Fires once, on the first visit after signing up, skippable from step one.

**The open question is answered.** Four steps, in this order, set by the user:

1. **Start with an event** — everything filed under it
2. **Scan a card** — the camera in the middle of the bar, works with no signal
3. **Every lead in one place** — notes, voice memo, WhatsApp and email
4. **Hand out your own card** — the QR tab

**The same four for everyone**, also by decision. Reps see it too; they are the ones scanning.
Events leads even though scanning is what people came for, because there is nowhere to put a
lead until an event exists.

**Recorded on `profiles.tutorial_seen_at`, not on the organisation** — and that is the whole
decision. The referral question (#33b) is an org-level fact, asked once per company. A tutorial
teaches one person, so every invited rep needs their own and an admin finishing it must not
silently consume it for the team.

**Everyone who already had an account was backfilled as having seen it**
([20260914180000](supabase/migrations/20260914180000_tutorial_backfill_existing.sql)), for the
reason #33b's backfill exists: otherwise all 8 existing profiles get taught the app they have
been using for weeks, the Growth Saga demo login included, mid-demo.

**Worth keeping — `profiles` has a column-level UPDATE ACL too.** The trap written up in
20260827130400 for `organizations` applies here exactly, and was verified before writing the
migration: `authenticated` held UPDATE on twelve named columns and nothing else. Without
`grant update (tutorial_seen_at)`, dismissing the tutorial 42501s — and because the dismiss is
fire-and-forget, that error is swallowed and the tutorial returns on every launch with nothing
on screen to explain it. Tested against the live project as a real signed-in user, not assumed.

**No SkipLink here, and that is not an oversight.** That component does
`router.replace(homeRoute())`, which is right for an onboarding *screen* and wrong for an
overlay already sitting on Home — it would remount the screen underneath for nothing. The Skip
here records and closes. #33c's rule is satisfied; its component is not the way to satisfy it.

The dismiss is **optimistic**: the local flag flips before the write is awaited, so it closes
instantly on a bad connection. A failed write costs one extra appearance on the next cold
start, which is a better trade than a spinner on the one screen that exists to feel smooth.


### 34. Password fields have no show/hide eye icon — reported 2026-09-11 `[ ]`

Every password field in the app should carry an eye icon that reveals what has been typed.
Applies to sign-in, sign-up, and the new password + confirm-password screen in 33a.

---

### 35. Bottom content sits behind the Android navigation bar — reported 2026-09-11, DONE 2026-09-18

**Reported on a Samsung Galaxy Ultra 26.** Content at the very bottom of several screens runs
underneath the phone's own navigation bar, where the home and back buttons sit.

Where to look: 7 screens declare only `edges={['top']}`, so nothing reserves space at the bottom —
[(tabs)/events.tsx](app/(app)/(tabs)/events.tsx), [(tabs)/index.tsx](app/(app)/(tabs)/index.tsx),
[(tabs)/leads.tsx](app/(app)/(tabs)/leads.tsx), [(tabs)/profile.tsx](app/(app)/(tabs)/profile.tsx),
[(tabs)/qr.tsx](app/(app)/(tabs)/qr.tsx), [leads/drafts.tsx](app/(app)/leads/drafts.tsx) and
[(web)/index.tsx](app/(web)/index.tsx). The other 54 screens use `['top', 'bottom']`.

On the five tab screens the footer is the tab bar itself, which adds `insets.bottom` on its own —
so check [components/app/TabBar.tsx](components/app/TabBar.tsx) first, and check it against
Samsung's 3-button navigation specifically, which is taller than gesture navigation.

**Do not fix this blind.** It needs testing on that handset, or at least on an Android device with
3-button navigation switched on.

**`(tabs)/qr.tsx` is done — 2026-09-18.** It reserved only 32px against a bar that is
`68 + insets.bottom` tall, so "Share your card" sat underneath it with no way to scroll to it.
That screen now ends its content at `TAB_BAR_HEIGHT + insets.bottom + 12` and no longer scrolls
at all — it is a fixed column whose QR takes the height left over. Confirmed on the handset
on 2026-09-18: the button clears the bar, nothing scrolls, and the email sits inside the card.
The other six screens are untouched.

---
**CLOSED 2026-09-18 by the user.** Tested and working on a different Android handset than the
Samsung Ultra it was reported on. The "do not fix blind" warning above was written when nothing
had been reproduced; it has now been checked on a device, and the user decided not to hold the
item open for that one specific phone.

What actually landed in between: `95c6e0b` lifted the camera controls clear of the navigation bar,
and the keyboard-and-scroll sweep in item 69 reworked the same screens through one shared wrapper
across 16 screens, asserted by `npm run verify:keyboard`. Several of the `edges={['top']}` screens
listed above still declare top-only edges, which is correct for them — their footer is the tab bar,
and `components/app/TabBar.tsx` adds `insets.bottom` itself.

If this ever comes back, it will come back on 3-button navigation specifically, which is taller
than gesture navigation. That is the configuration to reach for first.


### 36. No confirmation that the front of the card was captured — reported 2026-09-11 `[ ]`

When the rep photographs the **front** of a card, the screen moves on to the back with no signal
that the first shot was taken and kept. There is nothing confirming the front was saved.

Wanted: an icon, a thumbnail, or some visible signal that the front is captured.

Where: [app/(app)/capture/camera.tsx](app/(app)/capture/camera.tsx) — `capture()` sets the front
image and flips `side` to `'back'` without any feedback in between.

---

### 37. Remove em dashes from all app content — reported 2026-09-11 `[ ]`

Em dashes are to be removed everywhere they appear in the application's content.

**Scope question:** this is written up as user-facing text — screen copy, labels, messages,
templates, the privacy and terms pages. Confirm whether it also covers code comments and internal
documents such as this file, which currently use them heavily.

---

### 38. Invite reps from the phone's contacts, not by typing — reported 2026-09-11 `[x]` done 2026-09-14

The phone field on the invite screen now carries a contacts icon. Tapping it opens the system
picker; the chosen contact's name and number are written into the two fields the admin was going
to type into, so they can still read and correct both before anything is created. Reached from
the event wizard's step 3 and from Settings → Team's "+ Invite", which are the same screen.

**No contacts permission is asked for, and the original note above was wrong to assume one was
needed.** `app.json` keeps `READ_CONTACTS` and `WRITE_CONTACTS` under `blockedPermissions`, the
privacy policy's "Yieldd never reads your contact list, and the app does not ask for contacts
permission at all" stays true, and the Play Data Safety form (27) is untouched.

The reason is that `presentContactPickerAsync` hands the choice to the operating system's own
picker — an `ACTION_PICK` intent on Android, `CNContactPickerViewController` on iOS — and only
the one chosen contact comes back. The app never reads the address book, so there is nothing to
hold a permission for. This is the same reasoning already recorded above `pickFromLibrary` in
[app/(app)/capture/camera.tsx](<app/(app)/capture/camera.tsx>) and in the "No permission request,
deliberately" comment in [lib/contacts.ts](lib/contacts.ts): **calling `requestPermissionsAsync`
is what would create a full-library prompt.** Do not add one.

**The non-obvious part, which is why the timeout in [lib/contactPicker.ts](lib/contactPicker.ts)
must not be deleted:** a failure on this path does not reject, it hangs. Android resolves the
picker's promise from inside `OnActivityResult`, and nothing in Expo's dispatch chain between the
Activity and that lambda carries a try/catch. The handler queries the whole
`ContactsContract.Data` table rather than the single URI `ACTION_PICK` granted; if that query is
ever refused, the throw escapes before both `pendingPromise.resolve(...)` and
`contactPickingPromise = null`. So the awaited promise never settles — there is nothing to catch
— and every later attempt rejects with `ContactPickingInProgressException` instead. iOS has a
quieter version: the picker delegate swallows a serialisation throw with a bare `catch {}`.
Racing the await against a clock is what turns that into "type the number in instead" rather
than a button that spins forever — which is 41 all over again.

Other decisions worth not re-litigating:

- **The number goes in raw, exactly as the contact stores it.** The invite screen validates
  nothing beyond `.trim()`; normalisation happens once, later, in `createInvites`
  ([lib/api/invites.ts](lib/api/invites.ts)) via `normalizePhone`. So a picked number takes the
  identical path a typed one does and lands as the same value. Normalising at pick time would
  prepend `+91` to an overseas buyer's number and make a wrong value look vetted in a field the
  admin is looking straight at.
- **A contact with several numbers writes nothing until one is chosen** — not even the name — so
  there is no instant where a number the admin did not pick sits in the field looking accepted.
  Dismissing that sheet is then identical to cancelling the picker: the row was never touched.
- **A contact with no number fills the name only**, and says so under the row.
- `isValidPhone` is used as a display hint and never as a filter: its allowed-character set
  rejects extensions, pauses and unicode hyphens, all of which appear in real address books.

Two things this surfaced but did not change, logged as 52 and 53: `ready` still counts any
non-empty string as a valid number, and the iOS `NSContactsUsageDescription` string ships even
though no user can ever see it.

---

### 39. Paid features need a lock icon and an explanation — reported 2026-09-11 `[ ]`

Wherever a free user can see a paid feature, show a lock icon next to it. Tapping or seeing the
icon should explain, in plain words: *this is a paid feature; to use it you need the paid plan.*

This matches the product rule already agreed: paid features are **greyed, not hidden**, so the
user knows what exists.

---

### 40. "Needs a note" ignores voice notes — reported 2026-09-11 `[x]` done 2026-09-15

A rep who records a voice note instead of typing has noted the conversation, and the lead no longer
counts as needing one. The rule is now "no typed note AND no voice note" everywhere.

**The filter keeps its label, "Needs a note".** That was the decision, and the reason this line is
here: the alternative was to narrow the flag to a TYPED note and rename the filter to say so, and it
was explicitly not chosen. Do not rename it later on the assumption that it was.

Five places computed the old rule and all five now share one helper, `needsNoteFor(note, hasVoice)`
in [lib/mappers/lead.ts](lib/mappers/lead.ts):

- the mapper, for every lead the server sends back;
- `addLead`, for a capture made on the device;
- `applyPatch`, which **used to recompute the flag only inside its `note` branch** — so a voice note
  arriving on an existing lead left it stale until someone happened to type something. It now derives
  from the merged lead, so whatever changed, the answer comes from the final state;
- the sync drain's voice step, both halves. The success half clears the flag; the failure half puts it
  **back**, which matters more than it looks: `addLead` sets `hasVoice` optimistically the moment a
  recording exists on the phone, so a lead whose upload is refused by the free-plan cap would otherwise
  keep "noted" forever while having neither kind of note;
- `event_stats` and `event_set_stats`, in [20260915120000](supabase/migrations/20260915120000_voice_note_clears_needs_note.sql).

**The server half could not wait.** The web dashboard's "Captured without a note" tile reads the RPC
while the leads screen it LINKS TO counts on the device. Changing one side alone would have made a
card contradict its own destination.

**In `event_set_stats`, keep `count(l.id)` and never `count(*)`.** The LEFT join means a lead-less
event still produces a row, and the new predicate is *more* true of that phantom row than the old one
was — a null `l.id` matches no voice note, so `not exists` holds. Only `count(l.id)` keeps it out.
Switch it and every empty event reports one lead needing a note.

**The offline gap, decided rather than discovered.** On the phone a recording counts the moment it
exists; on the server only once the `voice_notes` row has synced. So between an offline capture and
its upload the phone says the lead is fine while the server still counts it. That is the right way
round — the rep did the work and their own screen should say so — and the two converge when the
outbox drains. The refresh merge was also fixed so the server's "no recording" no longer overwrites a
recording still sitting in the outbox, which used to strip the microphone icon off a lead mid-show.

Two things left open on purpose:

- [hooks/useAttention.tsx:123](hooks/useAttention.tsx#L123) has its own `needsNote` variable keyed on
  `reviewedAt`, not on the note, and renders *"N leads from today need a note"*. It is a different
  concept wearing the same words and was deliberately not touched. It already disagreed with the Leads
  badge; it now disagrees in a new way. Worth its own item if anyone reports it.
- The decision note above says voice is Pro-only. It is not quite: `can_use_ai()` allows a **free** org
  three voice notes, so up to three leads per free org are affected too.

Proven by `npm run verify:stats`, which previously asserted `needs_note === 7` against a fixture
containing no voice notes at all — it passed while covering none of this. It now gives one note-less
lead a voice note and expects 6, in both the single-event and the across-events functions.

---

### 41. The save-to-contacts icon does nothing — reported 2026-09-11 `[x]` done 2026-09-17

**Reported:** the contact icon does not work on the Leads screen, on the home screen's lead
section, or when a lead is opened.

**The cause: on Android, `presentFormAsync` refuses to open unless the app is already holding
READ_CONTACTS, and it will not ask for it.**

The old comment in [lib/contacts.ts](lib/contacts.ts) said the opposite — "no permission request,
deliberately", reasoning that the system's own new-contact screen does the writing, so neither
platform needs the app to hold contacts access. That is true of iOS and false of Android, and the
false half is the whole bug. Three lines of the installed package settle it:

| Where | What it does |
|---|---|
| `expo-contacts/android/.../ContactsModule.kt:297-298` | `presentFormAsync` calls `ensureReadPermission()` as its **first** statement, before the in-progress guard and before it looks at the contact |
| `ContactsModule.kt:722-727` | `ensureReadPermission` only **checks**. It never prompts. It throws `MissingPermissionException("Missing android.permission.READ_CONTACTS permission")` |
| `expo-contacts/ios/ContactsModule.swift:93-97` | the iOS `presentFormAsync` has no permission check of any kind — iOS was never broken |

That throw landed in the catch, came back as a generic `reason: 'error'`, and the rep read
"That didn't open your contacts" while the real reason went nowhere but a `__DEV__`
`console.warn`. **It worked for anyone who had already used "Pick from my contacts" on the invite
screen (60), because they were already holding the permission — which is what made it look
intermittent rather than broken.**

⚠️ **Confirmed from the native source, not from a device log.** No Android device or emulator was
attached to the machine this was fixed on, and the decision was made to proceed on the source
evidence rather than wait. The reproduction PENDING asked for has therefore *not* happened, and the
device checks below are still open. What is proven is that the throw can no longer occur; what is
not proven is that nothing else sits behind it.

**What changed**

- **The permission is requested on Android before the form is opened**, and a refusal comes back as
  `reason: 'permission'` with a sentence that says what to do — a different sentence depending on
  whether the phone will ask again or the rep has to go to Settings. iOS is deliberately left
  alone: `CNContactViewController` genuinely needs nothing, and a prompt there would buy nobody
  anything on a platform that treats contacts as sensitive.
- **[lib/contactsAccess.ts](lib/contactsAccess.ts) is new, and is the only copy of the request.**
  The invite screen's picker (60) already had a working one; rather than grow a second, the module
  loader, the prefetch and the request moved into one file that both use.
  [lib/contactPicker.ts](lib/contactPicker.ts) keeps `warmContactPicker()` under its old name, and
  its two refusal sentences are reproduced word for word, so 60's behaviour is untouched.
- **The comment that caused this is rewritten** in [lib/contacts.ts](lib/contacts.ts), naming
  `ContactsModule.kt` line by line, so the next reader does not have to re-derive it.

**Two further defects found while auditing the same path.** Both surfaced as the same generic
"That didn't open your contacts" that hid this bug in the first place, and both now get a separate,
truthful message:

- **A double tap claimed a failure.** `presentFormAsync` throws
  `ContactManipulationInProgressException` when a form is already in flight
  (`ContactsModule.kt:300-302`, `ContactsModule.swift:95-97`). The form really was opening; only
  the second tap failed. Not theoretical — reps spent a week learning this button does nothing, so
  they tap it more than once.
- **The native module can be poisoned for the life of the process.** `presentForm` assigns
  `contactManipulationPromise` **before** `startActivityForResult` (`ContactsModule.kt:356-357`).
  If that throws — an `ActivityNotFoundException` on a ROM with no `ACTION_INSERT` handler, or a
  lost activity — the promise is never cleared and every later tap throws in-progress. The message
  now says to close and reopen Yieldd, which is genuinely the only way out.

No in-flight flag was added on the JS side, deliberately: a flag gets stuck the moment a rep
backgrounds the app from the contacts screen, and a stuck flag is a silently dead button — the
exact failure this whole item is about.

**iPhone now takes one tap instead of two.** `presentFormAsync` was called with no `formOptions`,
so iOS built the controller with `forUnknownContact:` — a details card carrying a "Create New
Contact" button — rather than the editable form. `{ isNew: true }` is passed now. Android's Kotlin
signature discards that argument, so it cannot affect the platform the bug was on.

**What the privacy policy now says.** [app/(web)/privacy.tsx](app/(web)/privacy.tsx) said, in
published text on yieldd.co, that saving a lead to your phone book "needs no permission at all".
Requesting the permission would have made that false, so it was rewritten **in the same commit** —
the mistake that turned 62 into a release blocker. The Contacts bullet now says: on an Android
phone both features ask; Android will not open its new-contact screen for us without contacts
access, so we ask first; on an iPhone the same screen opens with no permission and we do not ask;
**saving a lead reads nothing at all**, it only hands the phone details you captured yourself;
Yieldd never reads the rest of your contact list and never uploads or stores it; refuse and
everything else still works.

**Play Data Safety — still yours, and now slightly bigger.** READ_CONTACTS needs no new manifest
entry (60 put it there), so no new data type is introduced. But **the form has never been filled in
at all** — it is open in 43a and in 62's tail — and it now has to describe two features that ask
for contacts rather than one.

**Three notes elsewhere in this file are now stale and were deliberately left alone**, to avoid
sweeping up another session's work in a file being edited concurrently:

- **line 495** — "'permission at all' stays true, and the Play Data Safety form (27) is untouched"
- **line 1709** — "The Data Safety form must agree — do not declare a contacts permission we do not carry"
- **item 62's body**, which still reads `[ ]` **BLOCKS RELEASE** and quotes policy wording that is
  no longer in the file, while its table row at the top says `[x]` done 2026-09-15

**Still to check on a device**, on both platforms if possible:

| Case | Expected |
|---|---|
| Android, permission never granted | a prompt, then the prefilled form |
| Android, refused once | "Allow contacts access to open your contacts, or add the number by hand." Tapping again re-prompts |
| Android, refused permanently | the Settings sentence, not the allow sentence |
| Android, granted | the contact form, prefilled |
| Android, tapped twice quickly | the form opens once, and the second tap does not claim a failure |
| iPhone | the editable new-contact form, with no contacts prompt at all |
| After either | the icon turns green and reads "Saved" (`markSavedToContacts`, [stores/useLeadsStore.ts:499](stores/useLeadsStore.ts#L499)) |
| The invite screen | "Pick from my contacts" still works — 60's request moved file |

Green before committing: `npm run typecheck`, `verify:contacts`, `verify:privacy`,
`verify:lead-edit`, and `npx expo export --platform web`. The export is not optional here:
[lib/contacts.ts](lib/contacts.ts) is reachable from the public card page
[app/c/[slug].tsx](app/c/[slug].tsx), and a top-level `expo-contacts` import would break the
yieldd.co build. `verify:applinks` still fails on placeholder store identifiers — expected and
unrelated.


**Device test 2026-09-18 — passes on iPhone and on Android. CLOSED.** The user tapped the contact
icon on both platforms and the form opened.

The iPhone pass on its own would not have closed this, and the reason is written three paragraphs
up: `ContactsModule.swift:93-97` has no permission check of any kind, so **iOS was never broken by
the bug this item fixed**. iOS cannot exercise the READ_CONTACTS request, the refusal sentences or
the "go to Settings" branch, because none of that code runs there. What the iPhone pass does prove
is that the `formOptions` change and the shared `lib/contactsAccess.ts` refactor did not break the
platform that already worked. The Android pass is the one that tests the fix.

**One caveat left on the record rather than chased.** A handset that had already granted contacts
through "Pick from my contacts" on the invite screen (60) would open the form whether or not this
fix works — that is precisely what made the bug look intermittent for a week. Not confirmed either
way for the test phone, and not worth re-testing: the throw is proven impossible from the native
source, and the button now works in the hands of the person who reported it broken. If it ever
resurfaces on a fresh install, this is the first thing to check.

---

### 42. Show the captured card in the lead list, and let lead details be edited — reported 2026-09-11 `[ ]`

Two parts, reported together.

- **The card photo is not shown in the list.** When a card has been captured, its photo should be
  visible when the lead list is opened, not only on the lead itself.
- **Lead details should be editable** on the lead detail screen.

---


### 43. Record where each lead was captured and show it — reported 2026-09-14 `[x]` done 2026-09-16

**Asked for:** when a lead is captured, record the location it was captured from, and be able to
see where every lead came from.

Built, and both open questions were answered by the user on 2026-09-16 before anything was written:

**Q1 — what is the map for? "Across events and cities."** Not a per-event map. At one trade show
every lead is captured in the same hall, so a single event is one cloud of dots on your own stall
and answers nothing. The dashboard map follows the event picker and defaults to All events, which
is the reading that makes it worth having.

**Q2 — where is it shown?** Two different things in two places, in the user's own words:

- **On the phone, the address only, on the lead detail screen, at the bottom.** No map on the
  phone. There is a "Where this was captured" card under Activity on
  [app/(app)/leads/[id].tsx](app/(app)/leads/[id].tsx), with an **Open in Maps** link that hands the
  coordinates to the phone's own map app — free, no library. Say the word and that link comes off;
  it is one block.
- **On the web dashboard, a map.** [components/dash/CaptureMap.tsx](components/dash/CaptureMap.tsx)
  on Home, under Team today and Recent leads. One dot per place, numbered with how many leads came
  from it, biggest place first, and the five busiest places listed underneath. A dot holding a
  single lead opens that lead.

**Nothing is billed, and no API key exists anywhere in this feature.**

- The address comes from `expo-location`'s own `reverseGeocodeAsync`, which resolves **on the
  device**: Android's geocoder is Google underneath already, iOS uses Apple's. No Google Cloud
  account, no key, no quota. If iPhone venue addresses ever come back poor, Google is a drop-in for
  iOS alone and stays a one-function change, because the address is resolved once at capture and
  stored: 10,000 free calls a month, then about $5 per 1,000.
- The web map is **not** the Google Maps JavaScript API and so is not billed per load. The tiles are
  OpenStreetMap's own, positioned by hand in [lib/mapTiles.ts](lib/mapTiles.ts) — about 150 lines of
  Web Mercator, no package, no key. A dashboard panel drawing a dozen tiles when somebody opens Home
  is inside OSM's usage policy, and the attribution it asks for is rendered under the map. Swapping
  to any other `{z}/{x}/{y}` provider, Google included, is the single `tileUrl` function.

**What the address falls back to when the geocode fails.** Three outcomes, and all three are
ordinary leads that look ordinary:

| What is stored | What the lead screen shows |
|---|---|
| Coordinates and an address | the address |
| Coordinates, geocode failed | the coordinates, `21.132694, 72.796357` |
| Neither | **nothing — the whole block is left off the screen** |

The last row is every lead captured before 2026-09-16, because nothing is backfilled and never will
be. A row reading "Not captured" on all of them would turn a normal lead into a reproach. All three
are asserted in `npm run verify:capture-location`.

**The rule that was not broken.** A GPS fix takes seconds and fails indoors, and an exhibition hall
is indoors, so a capture never waits for one. `primeCaptureLocation()` starts looking when the
camera or the manual screen opens — seconds to minutes before the rep presses save — and `addLead`
reads only whatever is already in hand, through a **synchronous** function that cannot be awaited by
mistake. Whatever has not arrived by then, which is the address almost every time, is attached
afterwards by `attachCaptureLocation` and rides the existing sync drain. There is no `await` on a
location call anywhere between `camera.tsx` and `addLead()`.

**What this cost elsewhere.** The sync drain's tail only re-ran itself for a queued *capture*, so a
patch queued while a pass was already running sat on the device until the next app foreground. The
capture location is queued seconds after a save, which is very often exactly then, so the guard now
counts a queued patch too. That was a latent bug for every other late patch as well.

**Not in the CSV export, deliberately.** `export_leads` is unchanged and there are no location
columns in the file. Three reasons, and the first is the one that decides it: a spreadsheet of where
each person was standing, emailed around, is a materially different thing from the same data sitting
on a lead in the app, and nobody asked for it. Second, the answers above scoped this to two screens.
Third, `export_leads` returns a table, so widening it means dropping and recreating the function and
moving `verify:export` with it. Adding two columns later is small and self-contained — say so and it
gets done.

**Database.**
[supabase/migrations/20260916100000_lead_capture_location.sql](supabase/migrations/20260916100000_lead_capture_location.sql),
rehearsed and pushed 2026-09-16. Four nullable columns, no backfill, no index — nothing queries by
location. **No GRANT was needed and that was checked, not assumed:** the 20260827130400 trap is
column-level ACLs, and `leads` has none. `pg_attribute.attacl` is null for every one of its columns,
so a new column inherits the table-level grants. Probed against the live database before the file
was written and again inside the rehearsal, after the ALTER.

---

#### 43a. Two store forms to fill in — the only thing left on 43, and only you can do it `[ ]`

This is the item-62 trap. That was a release blocker created by adding the contacts permission while
the published policy still said the app never asked for one. The policy half is done here:
[app/(web)/privacy.tsx](app/(web)/privacy.tsx) now states what is collected, why, and that refusing
changes nothing else — **and that goes live the moment this reaches master.** The two store forms
are not something anyone but you can submit.

**The in-app prominent disclosure is now done too, and it was the last thing here that was code.**
Google Play requires the rep to be shown what is taken and why *before* the system permission
dialog, not after it, whenever the use is not obvious from the context — standing in a camera
screen is not obvious. Until now Android showed its bare popup with no explanation at all, which
is a rejection on its own. The screen lives in
[components/capture/CaptureLocationNotice.tsx](components/capture/CaptureLocationNotice.tsx), the
rule that decides when it appears is
[lib/captureConsent.ts](lib/captureConsent.ts), and `npm run verify:capture-location` asserts the
rule directly: a rep who has not answered gets the explanation rather than the OS popup, declining
never reaches the OS prompt again, and the wording still says what is collected, why, and that
refusing costs them nothing. It is shown once per install; a rep who declines is never asked again,
but location turned on later in the phone's own settings is still honoured, because that is a more
deliberate yes than any tap in the app.

Nothing about capture changed. A capture still never waits for a fix, the disclosure never blocks a
save, and a lead with no location is still a normal lead.

**What is left below is the part only you can do.** Both store forms still have to be filled in by
hand, and neither can be submitted from here.

**Google Play — Data safety form.** Add, under **Location**:

- Data type: **Approximate location**. Not Precise — captures are taken at Balanced accuracy, about
  100 metres.
- Collected: **Yes.** Shared: **No.**
- Processed ephemerally: **No** — it is stored on the lead.
- Required or optional: **Optional.** The rep can refuse and everything still works.
- Purpose: **App functionality** only. Not analytics, not advertising, not personalisation.
- Encrypted in transit: **Yes.** Users can request deletion: **Yes.**

**Apple — App Store Connect privacy labels.** Add under **Data Linked to You**:

- Data type: **Location → Coarse Location.**
- Purpose: **App Functionality.**
- Used for tracking: **No.**

The iOS purpose string is already in [app.json](app.json) and names the feature rather than waving
at it, which is what gets a vague one rejected. Android ships `ACCESS_BACKGROUND_LOCATION` in
`blockedPermissions`, so the app cannot ask for background access and you must not declare it.

**Testing on a handset is DONE — 2026-09-17.** Tried indoors on a real Android phone over Expo
Go. The popup appears, the Android permission request follows it, and granting it works. The
indoor case is the one this feature lives or dies on, and it passed.

Not every branch was exercised, and none of them blocks anything: **No thanks** was not pressed
on a fresh install, and the profile card scanner was not checked for the popup staying away. Both
are asserted in `npm run verify:capture-location`. Worth five minutes the next time there is a
spare handset, but nothing is waiting on them.

### So the whole of 43 now comes down to two forms

Neither can be submitted from the codebase, and nothing else on 43 is open.

| # | What | Where | Status |
|---|---|---|---|
| 1 | **Google Play — Data safety form** | Play Console → App content → Data safety | `[ ]` |
| 2 | **Apple — App privacy labels** | App Store Connect → App Privacy | `[ ]` |

The exact values for both are written out above — Play wants Approximate location, collected,
not shared, optional, App functionality only; Apple wants Coarse Location under Data Linked to
You, App Functionality, not used for tracking. Copy them across rather than re-deciding them.

**Do not declare background location on either.** The app blocks the permission outright in
app.json, so declaring it would describe behaviour that is not there — which is its own kind of
wrong, and the same shape of mistake as item 62.
---

### 44. Admin imports an existing Excel list of leads — web dashboard only — reported 2026-09-14 `[ ]` PHASE 2

**Parked for Phase 2 on 2026-09-14.** Not to be started until the launch queue is clear. Phase 2
here means after the current launch push, not the build-order "Phase 2" in
[TASKS.md](TASKS.md), which is already finished. The two decisions below are still open and should
be settled before work begins, not while it is in progress.

**Asked for:** an admin uploads their existing Excel list of leads and it lands in the app.
**Explicitly web only** — this belongs on the dashboard, not in the phone app.

Web-only is the right call and it is worth writing down why, so nobody "helpfully" adds it to the
phone later. A spreadsheet lives on the machine it was built on, mapping columns needs a wide
screen, and reviewing a few hundred rows before they are written is not a phone job. It also lands
on the one surface that already has a file picker and a real table.

Nothing exists yet. Export is built ([lib/api/exportLeads.ts](lib/api/exportLeads.ts)) and import
is not, and they are not mirror images of each other — export writes whatever it likes, import has
to accept whatever a customer's spreadsheet happens to contain.

**What the database will refuse without.** A `leads` insert requires `full_name`, `event_id`,
`organization_id` and `captured_by`. A spreadsheet has the first one at best, so the upload screen
has to supply the rest:

- **Which event** every imported row is attached to. Nothing can be imported "loose" — the whole
  ROI model is per event, and a lead with no event has no cost behind it.
- **Who it counts as captured by.** The importing admin is the honest answer. Assigning imported
  rows to reps who never met those people would corrupt the leaderboard and every per-rep count.

**Two decisions needed first:**

1. **Provenance.** `lead_source` is an enum with exactly two values, `card_scan` and `manual`.
   Imported rows are neither. Either add a third value (`imported`) in a migration, or accept that
   imports are indistinguishable from typed-in leads forever. Recommend adding it: once these rows
   are mixed into "how they came in" on the dashboard, there is no way back.
2. **Duplicates.** The app already has duplicate detection for capture
   ([hooks/useDuplicateLead.ts](hooks/useDuplicateLead.ts), `duplicate_of_lead_id`). An import of
   400 rows against an event that already has leads will collide. Decide before building: skip the
   duplicate, import it and flag it, or stop and make the admin choose row by row.

**Also true, and easy to miss:**

- **No spreadsheet library is installed.** There is no `xlsx`, `exceljs` or `papaparse` in
  `package.json`. [lib/csv.ts](lib/csv.ts) only *writes* CSV; it cannot parse anything. A real
  `.xlsx` file is a zip archive, not text — it cannot be read without a dependency.
- **PRODUCT.md says the export target is Excel specifically, and today it emits CSV.** Whatever
  library is chosen here is the same one that would finally close that gap. Worth doing both in one
  pass rather than adding a parser now and a writer later.
- **Preview before writing, always.** Column mapping guessed from headers, then the first rows
  shown as they will be stored, then one confirm. An import that writes 400 rows straight into a
  live event with no preview is unrecoverable — the app has no bulk delete.

---

### 45. Web dashboard — Leads and Follow-ups show nothing at all — reported 2026-09-14, DONE 2026-09-14

**Reported against an account holding 64 leads:** `/leads` read "No leads yet · 0 captured", every
filter pill read 0, and `/follow-ups` read "Nothing to chase" with 0 overdue and 0 due today.

**Not a data problem, and the screens that worked are what proved it.** On the same page load the
Team table showed 29 / 20 / 10 / 5 leads per member and the home pipeline chart showed 5 / 3 / 3 /
1. Those two ask the server directly — `useTeam()` and the `event_stats` RPC. Leads and Follow-ups
are the two screens that read `useLeadsStore`, and nothing on web ever filled it:
[hooks/useLeadsSync.ts](hooks/useLeadsSync.ts) was mounted only in
[app/(app)/_layout.tsx](app/(app)/_layout.tsx), the phone's layout. The dashboard's own layout
never called it, so the store sat at its empty initial state for the life of the session.

**Fixed 2026-09-14:** `useLeadsSync()` is now mounted in
[app/(dash)/_layout.tsx](app/(dash)/_layout.tsx) as well, above the early returns because hooks
cannot be called conditionally. It no-ops until there is a signed-in user.

**Worth keeping:** a screen fed by a store looks identical whether the store is empty because the
data is missing or because nobody fetched it. The two server-backed screens on the same page are
what separated the two in seconds. When a list is empty, check whether its *source* ever ran before
looking at the database.

---

### 46. Pipeline chart is not clickable — reported 2026-09-14 `[ ]`

**Asked for:** clicking a bar, its status name or its number on "Pipeline by status" opens the leads
in that status, for that event.

Today the chart is a read-only readout. The leads list already supports the filter this needs — it
takes a `Filter` from the URL via `useLocalSearchParams` — but its filters are `hot / warm / cold /
due / note / draft`, which are temperature and attention, **not** pipeline status. So this is not
purely a link:

- The leads list needs a status filter (`new / contacted / qualified / won / lost`) alongside the
  temperature ones, and it has to be addressable from the URL for the chart to link into it.
- It also needs to carry the **event**, since the chart is per event and the leads list today is
  not scoped to one.
- Decide what "Lost 0" does when clicked. A bar at zero that navigates to an empty list is worse
  than one that does not respond; it should not be clickable at zero.

---

### 47. Export CSV has no deal-value column — reported 2026-09-14 `[x]` done 2026-09-15

**Asked for:** the export must carry the money — the value on leads that are Qualified or Won.

**The report's premise was wrong, and the truth was worse.** It said the column "simply is not in
the output". It was: `ExportColumns.dealValue` existed, both export screens rendered a "Deal value"
tick, and `buildLeadsCsv` wrote `deal_value_paisa` straight out of the row with **no admin check
anywhere in the path**. Neither screen read `role`. So this was never a missing feature, it was a
live leak, and anyone reading only the report would have shipped the fix without closing it.

**A rep could reach that tick on three ungated routes**, all confirmed in the code before the fix:
the phone event dashboard's "Export leads" button (gated only on `totalLeads > 0`), Profile →
Export leads → [settings/export.tsx](app/(app)/settings/export.tsx) (no gate at all), and the web
dashboard's Export page (`DashShell`'s `NAV` is not role-filtered). They then got deal values for
every lead `leads_select_own_or_admin` let them read.

**The gate ended up in the database, not the client.**
[20260915130000_export_leads_money.sql](supabase/migrations/20260915130000_export_leads_money.sql)
adds `public.export_leads(...)`, which returns the rows the CSV writes with the two value columns
and the close date as NULL unless `public.is_admin()`. `buildLeadsCsv` now calls it instead of
`.from('leads').select()`.

**It is `security invoker`, and it is the only function in `supabase/migrations/` that is.** That is
deliberate and should not be "corrected" later. `event_stats` is `security definer` *because it has
to widen visibility* — a rep must get the event's real total, not their own fraction. The export
needs the exact opposite: a rep exports their own leads and an admin the organisation's. Under
definer, RLS is bypassed and `leads_select_own_or_admin` would have to be copied into the body by
hand, where one mistake turns an export into a whole-organisation leak. Invoker keeps one copy of
the rule, and `voice_notes_select` goes on applying to the transcript join for free.

**Two columns, never one**, using the definitions
[20260902140000](supabase/migrations/20260902140000_qualified_deal_value.sql) already sets:
Expected is Qualified **or** Won, Won is Won alone, Lost is in neither. So a qualified lead fills
Expected and leaves Won blank; a won lead fills both. "Closed on" moved to sit with Won and is now
blank for anything else — the deal-value sheet deliberately keeps the old date when a won lead is
re-qualified, so without that the file printed a closing date beside an empty Won cell.

**`money_visible` is why a rep gets no money columns rather than three empty ones.** The row carries
it, the server sets it, and the headers are dropped when it is false. That is what makes the outcome
safe for *every* caller rather than only the two screens — [roi.tsx](app/(dash)/events/[id]/roi.tsx)
is a third `buildLeadsCsv` caller and was safe before this only by the accident of
`DEFAULT_COLUMNS.dealValue` being `false`.

The tick is also hidden from a rep on both screens, with the line "Deal values are included for
admins only." underneath, and `isColumnOffered` / `effectiveColumns` in
[lib/exportRows.ts](lib/exportRows.ts) are shared by both so the phone and the dashboard cannot
drift apart.

**What this does NOT do.** A rep can still read `deal_value_paisa` off their own leads directly: the
leads list shows `₹` per lead and the deal-value sheet is how a rep enters the number in the first
place. Revoking SELECT on the column would break both screens. What is closed is the export path,
and the decision now lives in SQL where the next caller cannot forget it. `verify:export-live`
asserts both halves, including the limitation, so nobody later reads this as airtight.

Covered by `npm run verify:export` (24 checks, offline) and `npm run verify:export-live` (20 checks,
against the live database, admin and rep). The live one also pins the LATERAL in the transcript
join: a lead with two voice notes must come back **once**, and a plain left join would have
duplicated the row silently.

---

### 48. Team table has no "cards scanned" column — reported 2026-09-14, DONE 2026-09-18

**Asked for:** the Team screen should show, per representative, how many people scanned their QR
code / digital card — the column Habsy shows and this table does not.

The Team table today shows Member, Email, Phone, Role, Status and Leads
([app/(dash)/team.tsx](app/(dash)/team.tsx), `leadCount` from `useTeam()`).

**Nothing is being counted yet.** `business_cards` exists per profile with its public `/c/{slug}`
page, but there is no view or scan event recorded anywhere — no table, no counter, no column. So
this is a new write path before it is a new column:

- A row per view (timestamp, card, and how it was reached) rather than a counter on
  `business_cards`, because "how many this month" and "which event" are the questions that follow
  immediately, and a bare integer cannot answer either.
- The public card page is reachable by `anon`, so the insert has to be writable by an unauthenticated
  visitor while the **reads** stay inside the organisation. That is the whole security design of
  this feature and it needs writing before any SQL — see the anon-grant trap already documented for
  the card slug work.
- Decide whether a rep reloading their own card counts. It should not.

**Done 2026-09-18 — but read the next paragraph before believing the column.**

**It does not count QR scans, and it never can while the QR is a vCard.** All four QR codes in
the app encode a vCard, not a URL ([qr.tsx](<app/(app)/(tabs)/qr.tsx>),
[card/edit.tsx](<app/(app)/card/edit.tsx>), [card/share.tsx](<app/(app)/card/share.tsx>),
[(dash)/card.tsx](<app/(dash)/card.tsx>)). The scanning phone decodes that text itself and saves a
contact without a single request leaving it — which is exactly why it works in a hall with no
signal, and exactly why the scan is invisible to us. **The user was shown the trade-off on
2026-09-18 and chose to keep the vCard**, so what ships counts people who opened the *link*
(WhatsApp, SMS, email, share sheet, a pasted copy). A rep who only ever holds up their phone at a
stand will read 0, correctly. The column is called **Viewers**, never "QR scans", and the caption
on the panel says so.

**And it is distinct people, not opens.** Also the user's choice. The row grain is one per
(card, visitor, day), so repeat opens inside a day are discarded — a *total opens* figure cannot be
reconstructed from this table later without a second migration and a gap.

Shipped:
- `public.card_views` + `record_card_view()` + `team_counts()`
  ([20260918100000](supabase/migrations/20260918100000_card_views.sql)). `record_card_view` is the
  **first thing `anon` has ever been allowed to write** in this database — as a `security definer`
  RPC with no table grant at all, the shape `peek_invite` and `signup_conflict` already use, not an
  insert policy.
- The owner's own reloads are dropped, per the bullet above.
- `?s=` on every link the app sends, so a WhatsApp open is distinguishable from a mailed one.
  **Copy link is deliberately untagged** — that URL gets pasted into signatures and websites, where
  a tag would mislabel every visitor for as long as it sat there.
- The vCard now carries a `URL:` line back to `/c/{slug}?s=qr` on a published card. It does not
  count the scan; it means a contact saved at a stand has a way back, and a tap on it later is
  counted.
- **`fetchTeam` no longer counts leads on the device.** It was selecting `captured_by` for every
  lead in the organisation and reducing it in JavaScript, which PostgREST truncates at 1000 rows —
  so the Leads column was already quietly a fraction on a busy organisation. Both counts are now
  one server-side aggregate.
- Proven by `npm run verify:card-views` (29 checks, including every `42501` a stranger must hit) and
  by opening the real exported build in two separate browsers.

---

### 49. "New template" gives no feedback, and creates a default instead of a draft — reported 2026-09-14 `[ ]`

**Web dashboard only**, confirmed 2026-09-14 with the user and against the code. The phone has
no "New template" button anywhere: neither `settings/whatsapp-template.tsx` nor
`settings/email-template.tsx` creates one, and `events/[id]/templates.tsx` is a picker that only
reads `isDefault` to draw a badge. So this is one screen, not a pattern to sweep for — and a fix
here must not be copied onto the phone screens on the assumption they share it.

**Two faults, one button** ([app/(dash)/templates.tsx](app/(dash)/templates.tsx)).

1. **Nothing tells the user it worked.** Pressing "New template" silently appends a card to the
   bottom of the list — below the fold on a full list — so the screen appears not to have responded
   and the button gets pressed again. The new template has to announce itself: open its editor
   focused and ready to be typed into, scrolled to, named.
2. **It should not be created as a default.** A new template is a draft the user names and edits,
   not something that immediately becomes what every follow-up is built from. "Default" is a
   promotion the user makes deliberately, after the template says what they want it to say.

The same button exists on both the WhatsApp and Email tabs and both behave this way.

---

### 50. Home needs an all-events analytics view with an event picker — reported 2026-09-14, DONE 2026-09-14

**Asked for:** an analytics screen on Home covering **all** events at once, not one event at a time,
with a dropdown above the cards to choose which events are included — any number of them, or all.

**Done.** An "Across events" block at the top of [app/(dash)/index.tsx](<app/(dash)/index.tsx>),
with its own multi-select picker
([components/dash/EventMultiPicker.tsx](<components/dash/EventMultiPicker.tsx>)) and its own
server-side aggregate, `public.event_set_stats(uuid[])`
([20260914140000](supabase/migrations/20260914140000_event_set_stats.sql)).

**What shipped at the top level:** total leads, captured today, deals won, total spend, total won
value, and blended ROI. **No cost per lead and no cost per won** — a blended figure spanning an
₹80,000 show and a ₹4,75,000 one is not a number anyone can act on. They are left off the
`EventSetStats` type, not merely off the screen, so neither can be rendered later by accident.

**Why the aggregate is server-side.** `event_stats` takes one event. Calling it N times and adding
up on the device gives a rep a fraction of the truth, silently, because `leads_select_own_or_admin`
hides other reps' leads. `event_set_stats` is `security definer` like its sibling, applies the
organisation and membership checks once, and returns money as NULL for a rep from the database
rather than letting the client decide.

**Mixed-membership selections are refused, not narrowed.** A rep who asks for a set containing an
event they were never on gets `Event not found` for the whole call. Narrowing silently would hand
them a total whose scope is not the scope they picked, and nothing on screen could show it. It
costs nothing in practice: `events_select_members` uses the same `is_event_member(id)` predicate, so
the picker cannot offer a rep an event they are not on in the first place. A stale id left in the
persisted selection is resolved away client-side by `useEventSelection` before the call, so a
deleted event cannot strand the panel on an error.

**"Today" is each event's own local day, added together.** A set spanning several shows has no
single today, so every lead is judged against its own event's timezone and the counts are summed —
`verify:stats` pins this with a New York event whose leads fall on the previous NY day.

**A second bug found while building it, and fixed here.** `events.total_cost_paisa` is a generated
column that coalesces its seven components to 0, so an event nobody costed reports ₹0 rather than
unknown. Summed across a selection, those events' won deals land in the ROI numerator while
contributing nothing to the denominator. The aggregate therefore tracks "priced" separately — from
the `cost_*_paisa` components, which are NULL-permissive on purpose — computes ROI over the priced
events only, and returns `priced_events` so the card can say "4 of 6 events have a cost entered".
In the test fixture this is the difference between a truthful **+100%** and a flattering **+767%**.

The warning is also the fix: `event_set_stats` returns the ids of the events whose cost is missing
(admin-only, like the money it annotates), and the note on Home is a link — straight to that event's
cost form when there is one, to the events list when there are several. Naming a gap without a way
to close it just moves the work, since the only alternative is opening each event in turn. The two
larger versions of this are logged separately as **54** (ask for the cost when the show ends, which
is when it is actually known) and **55** (let "this event cost nothing" be a thing you can say).

**Left alone deliberately:** `EventSwitcher` and the Leads screen. Merging the two controls would
have made picking a show to work in silently change what the yearly totals covered, and would have
required a mixed-event leads list that nobody asked for. Both sections now state their scope in
words — "Across events" and "This event" — so no number on Home is ambiguous about what it covers.

**Also repaired:** `scripts/verify-stats.mjs` had been failing at its rep half since 10 September.
The seat-limit trigger (20260910100000) postdates the script and refuses its invite, which threw —
so the run did fail rather than pass quietly, but every assertion from the invite onwards, the
whole rep-side half, never executed. The throwaway organisation now buys seats and goes Pro during
setup, which it needs anyway: the Free plan allows one active event, and an organisation that can
never hold two at once cannot exercise an across-events figure at all.

---

### 51. Clicking a lead in the list should open it as a popup — reported 2026-09-14 `[x]`

**Asked for:** clicking a lead row on the Leads screen opens that lead in an overlay — the modal
Habsy shows, with the person, the company, quick actions, the contact details, the card images and
the location, over the list rather than instead of it.

**Most of the content already exists.** #29 built
[components/dash/LeadDetail.tsx](components/dash/LeadDetail.tsx) behind the route
`app/(dash)/leads/[id].tsx`. Two things are wrong for this request:

- It is a **page, not an overlay** — opening a lead loses the list, its filters, its page number and
  its scroll position, so working down a list of 60 means re-finding your place 60 times.
- **Only the name cell links.** Clicking anywhere else on the row does nothing, which reads as the
  row being dead.

So: make the row itself open it, and render the existing detail in a dismissible overlay. Keep the
route working — a lead URL has to stay shareable and reloadable, which is an argument for the
overlay being a presentation of the same route rather than a second copy of the component.

**Done 2026-09-16 — the overlay IS the route.** Not local state on the list with the URL left
behind. Clicking a row does a real `router.push('/(dash)/leads/<id>')`, so the address bar changes
as a lead opens, the link can be copied out of it, and browser back closes the lead rather than
leaving the dashboard.

What makes that possible is one option, in [app/(dash)/_layout.tsx](<app/(dash)/_layout.tsx>):
`presentation: 'transparentModal'` on the `leads/[id]` screen. The web stack renders every screen
absolutely filled and sets `display: none` on all but the focused one — unless the screen above it
is presented transparently. React keeps a hidden screen **mounted** either way, so the search box
and the page number would have survived regardless; the scroll position would not, because a
browser resets `scrollTop` on a subtree it has stopped laying out. The list has to stay laid out,
not merely alive. `contentStyle` is overridden to transparent on the same screen, or the stack's
default #F5F7FB would paint over the list it is meant to float on.

**The standalone route still renders a full page**, checked in a fresh tab rather than assumed:
`/leads/<id>` opened cold shows the sidebar, the `Leads ›` breadcrumb, the name and designation in
the title bar and Copy message beside them, exactly as before.
[app/(dash)/leads/[id].tsx](<app/(dash)/leads/[id].tsx>) chooses between the two on
`navigation.canGoBack()` — arrive from somewhere and the lead opens over it, land on it and it is a
page. Read once into state, because that answer is not reactive and swapping a modal for a page
under a mounted screen is exactly the mid-life structure change NativeWind handles badly.

**`LeadDetail.tsx` was a page pretending to be a component** and had to be split before any of this
could work: it rendered `DashShell` itself at two points, so dropping it into a modal would have
drawn a whole second dashboard — sidebar, title bar, breadcrumb — inside a popup on top of the
dashboard already on screen. It is now `LeadDetailBody` (the content, which knows nothing about
page chrome), `LeadDetail` (that body inside a `DashShell`) and
[components/dash/LeadOverlay.tsx](components/dash/LeadOverlay.tsx) (that body inside a `Modal`).
One copy of six hundred lines, two presentations of it. `CopyMessageButton` is shared for the same
reason.

The overlay copies `ConfirmDialog`'s shape rather than inventing one — `Modal`, a full-bleed
backdrop that closes, an inner `Pressable` with an empty `onPress` so a click in the card does not
reach it — and `onRequestClose` is wired, which is what gives Escape on web. Being much taller than
a confirm dialog it also caps its own height, scrolls inside, and carries a close button; a
backdrop click alone is not enough when the card covers most of the screen.

**The whole row opens the lead now, not just the name.** The name stays blue, because that is how
anyone reading the table already knows the row leads somewhere, but it is no longer a `Pressable`
of its own — the row is. The one thing inside a row that still has its own press is the checkbox,
and it now calls `e.stopPropagation()`, the same fix and the same reason as
[components/app/LeadRow.tsx](components/app/LeadRow.tsx) on the phone: without it, ticking a box
also opened the lead. `Checkbox` was widened to hand its caller the event. Nothing else in the row
is pressable — the far end is the deal value, which is text.

Verified in a browser, because none of this is caught by a typecheck: opening a lead from page 2 of
a searched list left the search text, the page number and a 250px scroll offset exactly where they
were, both behind the overlay and after closing it; Escape, the backdrop and browser back each
close it; the checkbox ticks without navigating; at a 444px-wide viewport the card stays inside the
window. No console errors, and in particular no NativeWind variable-provider warning — the only
conditional classes on the row are background colours, which carry no CSS variables.

---

### 52. An invite counts as ready with a number that is not a number — surfaced 2026-09-14 `[x]`

The invite screen decides a row is ready to send on `r.name.trim() && r.phone.trim()`
([app/(app)/events/new/invite.tsx](<app/(app)/events/new/invite.tsx>)) — any non-empty string
counts. A voicemail shortcut or a `*123#` service code passes, reaches `createInvites`, gets
`normalizePhone`d into something like `+123` and is inserted. The invite is then created against a
number no WhatsApp message can reach, and nothing says so.

**Surfaced by 38, not caused by it.** It has always been true for typed numbers; picking from
contacts makes it more likely to be hit, because an address book holds far more oddly-shaped
entries than a person types.

**Why it was not just fixed:** the obvious tightening is `isValidPhone(r.phone)`, but that
function's allowed-character set (`/^+?[ds().-]+$/`, [lib/phone.ts](lib/phone.ts)) rejects
extensions (`x`), dial pauses (`,` `;`), slashes and unicode hyphens — all of which appear in real
contacts. So it would also start refusing numbers that work today. Needs a decision on whether to
widen `ALLOWED`, warn instead of block, or leave it.

**Done 2026-09-15 — warn, never block, on BOTH screens.** The item was written up as one screen and
is two. [app/(app)/events/new/invite.tsx](<app/(app)/events/new/invite.tsx>) is the phone, where a
rep can be picked from the device's contacts and most malformed numbers now come from;
[app/(dash)/team.tsx](<app/(dash)/team.tsx>) is the web dashboard, where a browser cannot read
contacts so every number is typed. Both warn. Only the phone has a picker, and it stays that way.

Nothing blocks. `ready` still counts a row on `name.trim() && phone.trim()` on both screens, both
buttons stay enabled, and [lib/api/invites.ts](lib/api/invites.ts) is untouched — that is the
decision, not an oversight.

What is new is `describePhoneProblem` in [lib/phone.ts](lib/phone.ts), **a second and looser check
sitting beside `isValidPhone`, not a replacement for it.** The two answer different questions.
`isValidPhone` is a gate: it refuses a value, so it is strict, and its callers
(`onboarding/complete-profile`, `(dash)/settings`) depend on that. `describePhoneProblem` only ever
produces a sentence, so it counts digits instead of policing characters, which is what lets a number
written with brackets, unicode hyphens or a country code be measured at all rather than rejected on
sight as `isValidPhone` would reject it.

What it counts is what a wa.me link is built from, because that is what decides whether a message
arrives. Fewer than 10 digits is too short, more than 10 is too long, and `*` or `#` anywhere makes
it a dial code. The count is taken **after the country code comes off**, by the same rules
`normalizePhone` uses, or every number typed in full would read as too long — including the
dashboard's own placeholder. An explicitly overseas number (a `+` that is not `+91`) is measured
against E.164 alone, 8 to 15 digits: there is no honest way to tell a visiting buyer that their
national number is the wrong length.

One consequence worth stating plainly, because it reversed an earlier decision. An extension
(`022 2493 1234 x 204`) and two numbers in one box (`98204 41720 / 22 2493 1234`) are now called
**too long**. They dial fine, but the invite is not dialled: the digits are run together into the
link, and the result reaches nobody. Saying so is not refusing it, and nothing here refuses.

Three details that are the difference between a useful warning and a nagging one:

- **It is on the row, never a banner.** With four rows on screen, "one of these is wrong" names
  nobody.
- **It answers while they type** (changed on request, 2026-09-15; it first waited for the field to
  be left). The tenth digit silences it and the eleventh brings it back, so it reads as a count
  rather than a scolding, and a number filled in from the contacts picker is judged the instant it
  lands.
- **It is said again on the created invite**, on both screens, which is the last thing before the
  message goes. The dashboard's `whatsappUrl` will build `wa.me/123` out of a dial code without a
  murmur, and there the copy adds that the link still works and can be sent another way.

Wording is plain and carries no em dashes (37). Cases are asserted in
[scripts/verify-phone.mjs](scripts/verify-phone.mjs) — the silent half first, because that is the
half that breaks quietly if either function is ever "tidied up" into the other.

---

### 53. iOS ships a contacts permission string no user can ever see — surfaced 2026-09-14 `[ ]`

The `expo-contacts` config plugin writes `NSContactsUsageDescription` ("Allow Yieldd to access
your contacts") into Info.plist unconditionally, and there is no iOS equivalent of
[app.json](app.json)'s `android.blockedPermissions` to strip it.

No user will ever see that sentence: neither `presentFormAsync` nor `presentContactPickerAsync`
triggers a `CNContactStore` authorization prompt, which is the whole point of both (38).
**But App Store Review and privacy-label tooling read Info.plist**, and that string says the app
accesses Contacts — which contradicts what the privacy policy says in writing.

Two ways out: give the plugin the array form with an honest `contactsPermission` string, or drop
the `"expo-contacts"` plugin entry entirely — the native module autolinks from the package, and
the plugin *only* writes permissions, so dropping it would also make the Android
`blockedPermissions` entries redundant. [scripts/verify-privacy-manifest.mjs](scripts/verify-privacy-manifest.mjs)
is the natural place to assert whichever is chosen.

---

### 54. Ask for the event cost when the show ends — surfaced 2026-09-14, DONE 2026-09-17

> **⚠ READ THIS BEFORE BUILDING IT. Found 2026-09-16 while checking 55.**
>
> The agreed design is a notification naming **which cost lines are still
> blank**. There are none, and there never will be under the current code.
>
> `costsToColumns` ([lib/mappers/event.ts:65](lib/mappers/event.ts#L65)) writes
> `rupeesToPaise(costs[key] || 0)` for all seven columns — a number every time,
> never null. `toAmount` in the cost screen returns 0 for an empty box. And
> **"Skip for now" calls the same `commitAndContinue`** as the primary button
> ([app/(app)/events/new/cost.tsx:184](<app/(app)/events/new/cost.tsx#L184>)),
> so skipping the step writes seven zeros just as surely as filling it in.
>
> Consequences, both of which need settling before 54 starts:
>
> 1. **Every event created through the wizard is already "priced"** — all seven
>    columns are 0, so `is_priced` (`coalesce(...) is not null`) is true. A
>    notification looking for null lines would fire for nothing.
> 2. **The unpriced warning built for 50 is therefore near-dead too.** Home's
>    "add the missing cost" list reads `unpricedEventIds` from the same
>    `is_priced`. It can only ever name an event created some other way. Worth
>    confirming against live data rather than assuming it works.
>
> So 54 has to start one level down: either the write path stops collapsing
> "empty" to 0, or "blank" has to be defined some other way. Changing the write
> path is the honest fix and is a behaviour change on a live column, so it needs
> deciding, not patching.
>
> This is also exactly why 55 was droppable: typing 0 and skipping are already
> indistinguishable, so a tick would have added nothing.

**Surfaced by 50, not caused by it.** The event wizard asks for seven cost lines while the event is
being *created*, which is the one moment an exhibitor genuinely does not know them — stall invoices,
travel and staff are settled afterwards. So the fields get skipped, and nothing ever asks again.

50 made the consequence visible: an event with no cost recorded is excluded from the across-events
return, and Home now says so and links to the form. That closes the loop only for someone who
looks at Home. The cost is still never *asked for* a second time.

The natural prompt is the event closing — `reconcileEventStatuses` already runs when a show's dates
pass ([hooks/useEvents.ts](hooks/useEvents.ts)) and is the one moment the app knows the spending is
final. Wherever it lands, it must be a prompt and not a block: an event that ends without its costs
recorded is normal, and refusing to close it would be worse than the gap.

---

**Built 2026-09-17. The decision was (a): an empty box means "not filled in yet".** A typed 0 still
means zero, and is now the way to record a line that genuinely cost nothing.

**The live counts, measured before deciding** (`npm run db:rehearse -- --sql`, read-only):

| measure | count |
|---|---|
| events | 8 |
| `is_priced` true | **8 of 8** |
| any null cost column | **0** |
| all seven at zero | 2 (Plastindia, Gitex AI) |
| non-zero total | 6 |

So consequence 2 above was confirmed against live data rather than assumed: `unpricedEventIds` was
always empty, and Home's "add the missing cost" list from 50 had never named a single event.

The sharpest case was **Vibrant Gujarat** — ₹5,00,000 of stall and the other **six lines zero**. One
line filled, six skipped, and the ROI screen was treating ₹5,00,000 as the whole cost of the show.
A wrong number on screen, not just a missing reminder.

**No migration.** All seven `cost_*_paisa` columns were already `is_nullable: YES` — checked against
`information_schema.columns` on the live database, not assumed from the migration text — and the
`events_costs_non_negative` CHECK is written `coalesce(col, 0) >= 0`, so nulls pass it. The
column-level GRANT trap from
[20260827130200](supabase/migrations/20260827130200_event_costs_stall_timezone.sql)'s header does not
apply, because no column was added. This shipped as a code change only.

**Events already holding seven zeros keep them.** There was no backfill and there should not be one:
nobody can now tell which of those zeros meant "free" and which meant "skipped", so rewriting them
would be inventing a fact. The three affected rows stay as they are, which means **Vibrant Gujarat's
ROI is still computed against ₹5,00,000 until someone re-enters its costs by hand**. The change stops
it happening again; it does not repair what already happened.

**What the reminder keys off.** `deriveStatus` flips an event to closed when its dates pass, which is
the moment the spending is final, so the item appears on its own the morning after the show with
nothing scheduled. It lives in [hooks/useAttention.tsx](hooks/useAttention.tsx) beside the other
attention items, so it feeds the notifications screen and the bell dot from one definition. It names
which lines are blank, is admin-only, and is a prompt — nothing about closing an event changed.

**Four defects had to be fixed first, and none of them were the notification.** Each one passes
`tsc --noEmit`, because `number` is assignable to `number | null` and the damage is a wrong value
rather than a wrong type:

1. **`rupeesToPaise(null)` is 0, not null.** It is `Math.round(rupees * 100)`, so simply dropping the
   old `|| 0` from `costsToColumns` would have gone on writing zeros silently. The null branch is
   explicit now, and [lib/mappers/event.ts](lib/mappers/event.ts) says why.
2. **Both cost forms seeded their boxes on truthiness** — `costs[key] ? String(...) : ''`. A genuine
   0 is falsy, so a line recorded as free came back as an empty box, and the next save wrote it as
   null. Worse, [lib/api/events.ts](lib/api/events.ts) rewrites all seven columns on *every* update,
   so editing an event's name on the dashboard would have corrupted its costs without anyone opening
   the cost panel.
3. **The dashboard cost box could not accept a typed 0 at all.**
   [components/dash/EventForm.tsx](components/dash/EventForm.tsx) is a controlled input holding a
   number, so `0 ? … : ''` rendered an empty string and the digit erased itself as you typed it.
   Harmless while zero was the default for everything; a blocker the moment typing 0 became the only
   way to say "this line was free".
4. **`total_cost_paisa` cannot carry the signal.** It is generated as `coalesce(component, 0) + …`,
   so it reads 0 for an uncosted event rather than null, and every
   `formatPaise(totalCost * 100, { fallback: 'Not added' })` in the app was unreachable code. The
   worst of them was [lib/roiPdf.ts](lib/roiPdf.ts), which printed *"₹8,40,000 won against ₹0 spent"*
   directly above "Not enough data" — on the one page that goes to a finance team. `Event.isPriced`
   and `Event.blankCostKeys` are derived in the mapper and carry the fact instead.

**New regression cover:** `npm run verify:costs`
([scripts/verify-event-costs.mjs](scripts/verify-event-costs.mjs)) saves, reads, re-seeds the form
and saves again, twice, asserting a typed 0 and an untouched line both survive unchanged. That is the
pair defects 1–3 would each have broken invisibly. `verify:roi-pdf` gained an
admin-looking-at-an-uncosted-show fixture; it only ever covered the rep case, whose money fields are
null for an unrelated reason.

**Still worth knowing:** several code paths went live here for the first time — `pricedIds` on
[(dash)/roi.tsx](<app/(dash)/roi.tsx>), the `pricedNote` and "Add the missing cost" CTA on
[(dash)/index.tsx](<app/(dash)/index.tsx>) — because until now `unpricedEventIds` was always empty.
They were correct by inspection and one loading-guard flicker was fixed, but they have not been seen
against real unpriced data in a browser. Every seeded demo login is a rep, and a rep is shown no
money at all.

---

### 55. "This event cost nothing" is not something you can say — surfaced 2026-09-14 `[ ]` **reopened by 54**

`events.total_cost_paisa` is generated as `coalesce(cost_stall_paisa, 0) + ...` over the seven
components ([20260827130200](supabase/migrations/20260827130200_event_costs_stall_timezone.sql)), so
an event nobody costed and an event that genuinely cost nothing are the same row: ₹0.

The components themselves are NULL-permissive on purpose — the migration says so in as many words,
"an unset cost is not the same as a cost of zero" — so the distinction survives one level down, and
`event_set_stats` reads it from there rather than from the total. That is why `is_priced` checks the
components and not `total_cost_paisa`, and it is the only reason 50's ROI figure can be honest.

What is still missing is a way for the user to *state* it. A sponsored stall, a stand someone else
paid for, a show attended as a guest — all cost nothing, and today the only way to record that is to
type 0 into a line, which is indistinguishable from a stray keystroke and reads as "not filled in"
on every screen that inspects the components.

Worth doing only if free events actually happen. If they do, a single "this event cost nothing" tick
that writes explicit zeros across the seven components is enough — no schema change, because the
components already carry the distinction. If they do not, leave it: an extra control for a case that
never arises is worse than the gap.

**Reopened 2026-09-17 by 54, and the answer is: mostly already done, and not worth a tick.**

55 was dropped because typing 0 and skipping the step were indistinguishable, so a tick would have
added nothing. That stopped being true when 54 shipped. An empty box now writes null and a typed 0
writes 0, so **"this event cost nothing" is already sayable** — you type 0 into the lines that were
free, and every screen that inspects the components reads it as a recorded zero rather than as
"not filled in".

Two things are worth recording about that:

- The part that actually had to be fixed was not the schema and not a new control. It was that
  [components/dash/EventForm.tsx](components/dash/EventForm.tsx) **could not accept a typed 0 at
  all** — a controlled input holding a number, seeded `values.costs[key] ? String(...) : ''`, so the
  digit erased itself as you typed it. The distinction had survived at the database level since
  [20260827130200](supabase/migrations/20260827130200_event_costs_stall_timezone.sql) exactly as this
  item says; there was simply no way to enter the value. That is fixed.
- What remains is a **convenience shortcut, not a missing capability**: seven keystrokes instead of
  one tick. Still only worth building if free events actually happen often enough to notice —
  the original test, unchanged. The difference is that the gap is now ergonomic rather than
  structural, so the cost of leaving it is much lower than this item first assumed.

A genuinely free event is also now distinguishable to `is_priced`, which counts it as **priced**
(one non-null component is enough), so it appears in the across-events return with a real ₹0 cost
instead of being excluded as uncosted.

---

### 61. "Invite more reps" restarted the setup wizard — reported 2026-09-14, DONE 2026-09-14

**Reported by the user.** From the finished "Your event is set up" screen, tapping **Invite more
reps** and then skipping did not go back — it carried on into cost, custom fields and templates,
marching through the whole setup a second time on an event that was already created.

**Fixed 2026-09-14:** [complete.tsx](app/(app)/events/new/complete.tsx) now pushes
`/(app)/events/new/invite?eventId=<id>` instead of the bare route.

**Why one query param fixes it.** [invite.tsx](app/(app)/events/new/invite.tsx) reads `eventId`
as `editingOne`, which sets `standalone`, which is what decides its button:

```ts
const standalone = scope === 'team' || editingOne;
const goNext = () => (standalone ? router.back() : router.push('/(app)/events/new/fields'));
```

With no param it was neither, so the screen believed it was still step three of the wizard.
The param also attaches the invite to **this** event by id rather than to whatever the draft
store still held, which is the stale-event bug invite.tsx's own header already describes.

**Still open on the same screen:** **Edit event details** does `router.push('/(app)/events/new')`,
which walks the wizard from step one for an event that already exists. Not reported yet and not
touched, but it is the same shape of mistake and will bite the same way.

---

### 62. The privacy policy now contradicts the app — created 2026-09-14 `[ ]` **BLOCKS RELEASE**

A direct consequence of #60. [app/(web)/privacy.tsx](app/(web)/privacy.tsx) currently says, in
published text on yieldd.co:

> **Contacts** — saving a lead to your phone book opens your phone's own new-contact screen with
> the details filled in, and you confirm it there. Yieldd never reads your contact list, and the
> app does not ask for contacts permission…

**The second sentence is now false.** As of #60 the app does ask, on the invite screen.

The first half is still true and should stay: saving a lead out to the phone book really does go
through `presentFormAsync` and really does need no permission. Only the reading half changed.

**Not fixed in the same pass because `app/(web)/privacy.tsx` was being edited by another session
at the time** — touching it would have swept up work in progress. It is a small edit and it
should be made by whoever holds that file next.

**This blocks a release, not a build.** Nothing fails; the app ships happily with a policy that
misdescribes it. That is exactly the sort of thing an app review, or a customer who reads, finds
before you do — and the policy is already live.

---

### 60. Picking a rep from contacts failed after the contact was chosen — reported 2026-09-14, DONE 2026-09-14

**Reported by the user in stages, and the stages mattered.** First "it does nothing", then —
after #59 made the button visible — "it opens, but selecting a contact says *that didn't open
your contacts*". The second report is what located it: the picker was fine, the step after it
was not.

**Ruled out on the way: the `/legacy` import trap.** AGENTS.md warns that `expo-contacts`'
top-level functions throw on the root import. [contactPicker.ts](lib/contactPicker.ts) already
used `expo-contacts/legacy` and `presentContactPickerAsync` exists there, so the known trap was
not this one.

**The actual cause.** `presentContactPickerAsync` opens the system picker, which needs no
permission — that part of the old reasoning was right. But once a contact is chosen,
expo-contacts resolves it by taking the id and calling `getContactById`, which queries the whole
`ContactsContract.Data` table rather than the single URI the pick granted. **That** needs
`READ_CONTACTS`, which `app.json` was explicitly stripping out via `blockedPermissions`. So the
picker opened, a contact was chosen, and the read behind it threw.

**Fixed 2026-09-14, by the user's decision** after the cost was put to them plainly:
`requestPermissionsAsync()` is now called before the picker, `READ_CONTACTS` is out of
`blockedPermissions`, and iOS carries an `NSContactsUsageDescription`. `WRITE_CONTACTS` stays
blocked — the save-a-lead direction goes through `presentFormAsync` and genuinely needs nothing.

A refusal is treated as an outcome, not an error, with a different sentence depending on
`canAskAgain`, because someone who says no has not hit a fault.

**Two things follow and neither is optional:** the privacy policy is now wrong (#62), and Play
treats contacts as a sensitive permission and will want a justification at review.

**Worth keeping — a comment can be confidently, carefully wrong.** The block that forbade this
call laid out real mechanics, cited the right APIs, and reached a conclusion that did not hold,
because it reasoned about the picker and not about what the library does with the picker's
result. Nothing in a build, a typecheck or a test suite goes near the far side of a system
picker. Only a person tapping it found this, and only after the button was made visible enough
to tap.

**Also fixed alongside:** the error message said "that didn't open your contacts" when the
contacts had plainly opened, which sent the user looking in the wrong place. Failures after the
pick now say so. And the module is pre-loaded on screen mount (`warmContactPicker`) rather than
on the tap, with `[contactPicker] load … | picker … | read …` timings in dev, after "opening
contacts is taking too long" was reported and there was no way to tell which of the three steps
was slow.

---

### 59. The contacts button on the invite screen read as decoration — reported 2026-09-14, DONE 2026-09-14

**Reported by the user:** on "Bring your team in", nothing indicated that the little icon in the
phone field opened the phone's contacts, or that it was a button at all.

It was a **15px `ContactsIcon` in `#97A3B8`** — this app's *placeholder* colour — sitting
absolutely positioned inside the phone input. Inside an empty field, in the same grey as the
placeholder text, it read as part of the decoration.

**Fixed 2026-09-14:** it is now a bordered pill under the row reading **"Pick from my
contacts"**, with the icon in gold, and "Opening contacts…" while the picker is up.

**Worth keeping:** the icon was put inside the field to save a column, and the original comment
did the arithmetic to prove a fourth column would not fit at 360dp. The arithmetic was right and
the conclusion was still wrong — a control nobody recognises saves no space, it just fails
quietly. The 34dp the labelled button costs buys a control people can actually find.

---

### 58. After the code, ask only for a password — reported 2026-09-14, DONE 2026-09-15

**Wanted, as reported.** Signing up should be: **email → code → choose a password → in.** Nothing
else. Name, company and contact number would come later, when the person builds their digital
card, because that is the moment those details are actually for something.

**Cut back to company-only, by the user's decision 2026-09-15.** Asked directly what should be on
the screen after the code, the answer was: **full name, mobile number, password, confirm
password.** So only the **company** moved, to [the card editor](app/(app)/card/edit.tsx) — the
line printed under your name on the card you hand out. Signup itself was already one email box,
and the referral and fork steps are untouched, so no routing changed at all.

**The narrower cut is worth more than the tidiness it gave up,** because three of the four things
this item warned would break were caused by the *name* leaving that screen, and it did not:

1. ~~**The hard redirect loops forever.**~~ Does not arise. `profileNeedsCompletion` is
   `!phone || name === PLACEHOLDER_NAME` and never looked at the company, so the guard in
   [app/(app)/_layout.tsx](app/(app)/_layout.tsx) is untouched and #4's enforcement still stands.
2. ~~**`needsPasswordSetup()` stops working.**~~ Does not arise — it infers "no password yet" from
   the name still being `'New user'`, and complete-profile still sets the name. No column, no
   migration. The comment above it now says outright that this holds *only* while that is true.
3. ~~**The person is called "New user" everywhere.**~~ Does not arise.
4. **The organisation stays "My workspace"** — this one was real, and it was worse than it looked.

**#4, and what it actually took.** A team admin reaches Home before the card editor, and their
first outbound action is inviting a rep. Tracing every place `organizations.name` reaches a screen
found **eleven render sites, six of which would print the placeholder** — and the worst is not the
admin's own screen:

| Where | What a person reads | Who sees it |
|---|---|---|
| `app/invite.tsx` | "Priya invited you to join **My workspace**", 24px bold hero | the invited rep, first screen, before they have an account |
| `app/invite.tsx` | "signed in as Priya at **My workspace**" | an invited rep who already has an account |
| `(tabs)/profile.tsx` | "Admin · **My workspace**" | the admin, every visit to Settings |
| `(tabs)/qr.tsx` | "Your role · **My workspace**" on the card held up at a stall, and `ORG:` in the downloaded .vcf | the admin, and whoever scans it |
| `card/scan-confirm.tsx` | prefilled into a field saved to `business_cards.company_name` | **anyone who opens the public `/c/{slug}` page** |
| template `{{sender_company}}` | "— Priya, **My workspace**" | **a prospect, over WhatsApp** |

**Not fixed with a guard.** Forcing the card step would strand an admin on a screen with no Sign
out link and no copy explaining why they cannot leave, which turns the card editor into an
onboarding gate. Fixed by making the placeholder **unprintable** instead: `lib/placeholders.ts`
holds `realCompanyName()`, and [lib/mappers/profile.ts](lib/mappers/profile.ts) — the one seam
every screen's `user.company` comes through — returns `''` for it. Everything downstream already
treats empty as "no company" and drops the line, the separator or the token. The dashboard's
Company field is the deliberate exception: it reads the organisation directly, because it is the
screen for fixing this and must show what is stored.

Two of those six were **pre-existing bugs** this change surfaced rather than caused:
`scan-confirm.tsx` could already publish the placeholder to a public URL, and the template
editor's own help text still offers `{{sender}}, {{sender_company}}` as its worked example.

**Also found and fixed while in the file.** complete-profile greeted people with
`user.name.split(' ')[0]`, and a code signup is called `'New user'` at that point — so **every new
account was greeted "Welcome, New."** And `renderTemplate` left "Priya," when a token emptied; an
empty token now takes the separator in front of it with it, while "Hi {{name}}," keeps its comma.

**The measurement worth keeping.** This item asked for a real signal for "this account has no
password yet" if the name ever moved, and said to investigate the auth user before relying on it.
Checked against the live project 2026-09-15:

```
provider  no_password  n
email     false        7     ← every email account has a password
google    true         1
google    false        1
```

`auth.users.encrypted_password` does separate a code account from a password account cleanly — but
it is never sent to the client, and `app_metadata.provider` reads `email` for both. **There is no
client-side signal.** If the name is ever moved off complete-profile, a column on `profiles`
written when `setPassword()` succeeds is the only honest option, and it needs
`grant update (…) on public.profiles to authenticated` in the same migration, because column-level
GRANTs do not extend to new columns here. This is now recorded above `needsPasswordSetup` so it
does not have to be rediscovered.

---

### 57. The code email's subject still promised a link — reported 2026-09-14, DONE 2026-09-14

**Reported by the user.** The email carrying the sign-in code arrived with the subject
**"Your sign-in link"**. The body had been rewritten to carry a 6-digit code for #33a, but the
subject line is a **separate config field** and was left behind, so the envelope promised one
thing and the contents were another.

**Fixed 2026-09-14:** both `mailer_subjects_magic_link` and `mailer_subjects_confirmation` are
now **"Your verification code to sign in"**. `mailer_subjects_recovery` is deliberately
untouched — password reset genuinely is a link, and its subject should keep saying so.

**Worth keeping:** the subject and the body of a Supabase auth email live in two different
config fields with nothing tying them together. Change one and the other silently disagrees,
and no test, build or typecheck will notice — only a person reading their inbox. That is
exactly how this got out. `npm run verify:otp` now asserts the code emails' subjects do not
contain the word "link", and that the reset email's still describes a reset.

**Also worth knowing:** the subject can carry the code itself. Supabase's own reauthentication
subject is `{{ .Token }} is your verification code`, which shows the number on the lock screen
without the person opening the mail. Not adopted here because the wording above was the user's,
but it is the better pattern if the subject is ever revisited.

---

### 56. Abandoned signups leave an empty organisation behind — found 2026-09-14 `[ ]`

A consequence of #33a, found while testing it. `signInWithOtp` creates the user the moment the
code is **sent**, not when it is entered, so `handle_new_user()` fires then — creating an
organisation and a profile for someone who may never type the code. Five such orgs were created
and cleaned up by hand during testing on 2026-09-14.

Nothing breaks today: the rows are invisible to everyone, RLS scopes them to a user who never
comes back, and `npm run verify:otp` now cleans up the ones it creates. But they accumulate
with every abandoned signup, and an org count is the obvious thing someone will later reach for
to answer "how many customers do we have?".

Options, none urgent: a periodic sweep of organisations with no members and no events; a
`provisional` flag cleared when complete-profile finishes; or simply excluding zero-member orgs
wherever orgs get counted. Worth deciding before anyone builds a metrics screen, not before.

---

### 28. Phone screens render in the browser, stretched and half-broken — reported 2026-09-08, DONE 2026-09-09

- **Where:** [app/(app)/_layout.tsx](app/(app)/_layout.tsx) — there is **no `Platform.OS` guard**, so
  every `(app)` route is reachable in a browser by URL. `(dash)/_layout.tsx` guards the other
  direction (native → `(app)`), but nothing stops the reverse.
- **Reported as:** the ROI dashboard opened on the web showing the phone layout — a back chevron
  instead of the dashboard chrome, cards stretched across the full monitor, a full-width
  "Share as image" bar. It looks unfinished next to the rest of the dashboard.
- **Worse than cosmetic:** that screen's two export buttons cannot work in a browser at all.
  `Share as image` is `captureRef` (react-native-view-shot, no real web build) plus
  `MediaLibrary.saveToLibraryAsync` (**no web implementation whatsoever**), and the PDF button is
  `Print.printToFileAsync`, unsupported on web. All three failure paths then call `Alert.alert`,
  which react-native-web ships as an empty function — so the buttons do nothing and say nothing.
- **The web equivalents already exist** as of #26: [app/(dash)/events/[id]/roi.tsx](app/(dash)/events/[id]/roi.tsx)
  and `.../index.tsx`, which print through a hidden iframe and download a real CSV.
- **The fix is a redirect, not a redesign.** `(app)/_layout.tsx` should send a web visitor to the
  matching `(dash)` route where one exists, and the onboarding/capture screens that legitimately have
  no dashboard equivalent should stay. Worth listing which `(app)` routes a browser may keep before
  writing it — capture/camera and capture/voice need a device, so they belong on the phone anyway.
- **Fixed 2026-09-09:** [lib/webRoutes.ts](lib/webRoutes.ts) maps a de-grouped phone path to its
  dashboard equivalent, and [app/(app)/_layout.tsx](app/(app)/_layout.tsx) redirects on it. 17 routes
  move; the six-step `events/new` wizard collapses onto the dashboard's single form.
- **Placed after the profile-completion guard, deliberately.** Above it, anyone with an incomplete
  profile would be redirected out of the only screen that can complete it — permanently.
- **Four things are allow-listed and must stay that way:** `onboarding/*` (the completion guard
  redirects *into* it), `card/*` (made web-friendly on purpose), `payment/success` and
  `payment/failure` (**a payment gateway returns a browser to those URLs** — redirecting loses the
  outcome), and `capture/*` (needs a camera or microphone, and has no dashboard equivalent).
- **Matching is on the de-grouped path.** `usePathname()` strips group segments, so the table keys
  are `/events/:id/roi`, never `/(app)/events/:id/roi`. Getting that wrong silently matches nothing.
- **New suite:** `npm run verify:web-routes` — 31 assertions, most of them guarding the four
  allow-listed cases rather than the redirects.

### 29. No lead detail page on the web — reported 2026-09-08, DONE 2026-09-09

- **Where:** `app/(dash)/leads.tsx` is a flat table; there is no `app/(dash)/leads/[id]`.
- **Consequence:** a lead cannot actually be *worked* in the browser. #22 left "Open lead" out of
  Follow-ups for this reason and expands the row instead.
- **What it needs:** the fields, the note, the voice note, the activity timeline, and the status /
  deal-value flow — remembering that Qualified and Won are refused by
  `leads_qualified_requires_value` / `leads_won_requires_value` unless a value is written in the same
  operation, which is why the phone routes both through the deal-value modal rather than writing
  status first.
- **Fixed 2026-09-09:** [components/dash/LeadDetail.tsx](components/dash/LeadDetail.tsx), behind the
  thin route `app/(dash)/leads/[id].tsx`. The list's name column links into it, and #28's table now
  routes the phone's lead detail here too — with a negative lookahead so `/leads/review`,
  `/leads/drafts`, `/leads/bulk-send` and `/leads/send-queue` are not mistaken for lead ids.
- **The deal-value rule is enforced in the UI, not discovered later.** Picking Qualified or Won
  reveals the value field and Save stays disabled until it is filled; both are written in one patch.
  A status-first write is refused by the constraint and would surface much later as a sync error.
- **Two defects in the phone version were not copied:** it pushes `log-outcome` with **no `leadId`**,
  so logging an outcome from the lead detail screen writes nothing at all — no note, no follow-up
  date, no history row; and the header's edit button has no handler. Both are still live on mobile
  and want their own entry.
- **`lead_activity` has its first reader.** `fetchLeadActivity` in
  [lib/api/leadActivity.ts](lib/api/leadActivity.ts) — the SELECT policy exists and allows an admin,
  the capturer, or the assignee, and a refusal returns an empty list rather than breaking the screen.
  Because nothing has ever written from the buggy path above, the table is likely sparse, so the
  timeline appends the capture row the lead itself can always describe.
- **Split as component + route on purpose:** a filename with brackets cannot be imported from
  anywhere else, which makes the screen impossible to render in a test. The route file is three lines.

### 30. The phone's Follow-ups screen opens the wrong WhatsApp chat — reported 2026-09-08, DONE 2026-09-09

- **Where:** [app/(app)/follow-ups/index.tsx](app/(app)/follow-ups/index.tsx) — a local `waDigits()`
  that is `replace(/\D/g,'')` with **no country-code repair**. A ten-digit Indian mobile becomes
  `https://wa.me/9820441720`, which resolves to the wrong chat or none. `whatsappDigits()` in
  [lib/messageText.ts](lib/messageText.ts) prefixes `91` and is what every other screen uses.
- **Second defect, same screen:** it never calls `recordSend`, so every WhatsApp opened from
  Follow-ups is invisible in `message_sends` and the send history under-reports.
- **Also:** its message is a hardcoded string, not the event's template.
- **The fix is to use `useLeadActions`,** which does all three correctly — the web Follow-ups screen
  was built on it for exactly this reason (#22). Left alone here only because it is mobile code.
- **Fixed 2026-09-09**, with your go-ahead to change mobile code. `FollowUpCard` now calls
  `useLeadActions(lead)` and its local `waDigits`, hardcoded message and `Linking`/`Alert` imports
  are gone. All three defects close together: `whatsappDigits` prefixes `91`, the event's own
  template is used, and `recordSend` fires so the send history stops under-reporting.
- Rendered with seeded leads to confirm the swap changed nothing visible — same rows, same Call and
  WhatsApp buttons, no console errors.

### 32. Dashboard Settings was a read-only mirror — reported 2026-09-09, DONE 2026-09-09

- **Where:** [app/(dash)/settings.tsx](app/(dash)/settings.tsx). Every field rendered as text and
  the panel at the bottom said *"editing your profile, templates, notifications and the digital
  card all live in the phone app for now"* — which was already out of date, because #23 made
  templates writable on the web.
- **Both writes it needed already existed and are browser-safe:** `updateProfile` on the session
  store (`full_name`, `designation`, `phone`) and `useUpdateOrganization` (`name`, `category`).
  No backend change, no new API.
- **Fixed 2026-09-09.** Each panel gets its own Edit / Save / Cancel, so a profile change and a
  company change cannot collide. Category is the same list the phone uses
  (`PREDEFINED_CATEGORIES` plus locally added ones), rendered as chips rather than the phone's
  full-screen list, with the saved value folded in so a category set on another device is not
  silently dropped from the selection.
- **Two traps that were live here.** The phone's category screen reports both *"Admins only"* and
  a save failure through `Alert.alert`, which react-native-web ships as an **empty function** —
  ported as-is, a rep would have clicked Save and seen nothing at all. Every message on this
  screen is inline state. And `org_admin_update` matches **zero rows** for a rep rather than
  erroring, so a rep's save would have reported success and changed nothing: the Edit button is
  admin-gated and reps are told why.
- **Deliberately still read-only:** email (the profile guard trigger blocks it; the address of
  record lives in `auth.users`), and plan / seats (`authenticated` holds UPDATE on `name`,
  `category` and `onboarding_intent` only — see 20260827130400).
- **Verified in a browser** with Playwright: both forms open, the category chips select, an empty
  company name and a 3-digit phone are both refused inline, and no page error beyond the
  dark-mode warning. `npx tsc --noEmit` clean, `npx expo export --platform web` succeeds.


### 31. Seats are not enforced anywhere — reported 2026-09-08, DONE 2026-09-10

**DECISION (2026-09-10, yours): refuse the invite.** The admin is stopped at the moment they try
to send it, on the screen they are already looking at. Two alternatives were put to you and
rejected: refusing the *signup* instead (the wrong person hits the wall, inside
`handle_new_user()` where GoTrue rewrites every exception into the opaque "Database error saving
new user"), and not blocking at all (honest, but the number on both team screens would go on
meaning nothing).

**What was true before.** No RPC check, no CHECK constraint, no trigger. Both team screens
computed `seats_included + seats_purchased` on the client and rendered a warning;
`createInvites` and `handle_new_user()` accepted anyone regardless. A client-side check is a
suggestion — the anon key plus curl walks straight past it.

**What holds a seat** (`public.seats_in_use(uuid)`, migration 20260910100000):

- **active profiles.** A deactivated member holds none, which is what makes "deactivate someone
  to free a seat" a true instruction rather than a guess.
- **pending, unexpired invites.** This is what lands the limit on the admin instead of on an
  invitee weeks later. Without it, an admin with one free seat could send five invites that all
  pass and four people would be refused at signup — the outcome the decision rejects.

An accepted invite swaps one pending invite for one active profile, so the total does not move
and `handle_new_user()` needs no check of its own. Deliberate: once an invite has legitimately
gone out, the person holding it can always get in.

**The one way to still exceed it** is a plan being reduced while invites are outstanding. Those
invites stay good, and the organisation reads as over its seats until renewal. That is the only
place a billing conversation is left.

**The trap in the trigger.** A per-row `BEFORE INSERT` trigger cannot see the other rows of its
own statement, so a five-row batch into a one-seat organisation would have passed five times.
It is an `AFTER INSERT ... FOR EACH STATEMENT` trigger with a transition table instead. That
case is asserted.

**Verified twice.**

- *Rehearsed* against the live database in a rolled-back transaction, 10 assertions: two invites
  fill two seats; the third is refused; a revoked invite frees its seat; an expired one holds
  none; a 3-row batch into 2 seats is refused; an active member occupies a seat; Free (1 seat)
  refuses the first invite; deactivating frees it; `seats_in_use` matches a hand count on a real
  organisation; `seats_purchased` is added to the allowance.
- *End to end over the real API*, because the rehearsal cannot prove the SQLSTATE survives
  PostgREST — and if it did not, `describeInviteError` would have fallen through to "check your
  connection", a lie an admin could stare at forever. A throwaway account was created, refused,
  and deleted. `code` came back as `54000` with the trigger's own message intact.

**Rollout, 2026-09-10.** All four live organisations were Free with 1 seat and 1 active member,
so every one of them was already at its cap the moment this landed. On your instruction the two
**Growth Saga** organisations (`care@yieldd.co` and `mrshaikh.works@gmail.com`) were raised to
`seats_included = 5` so the invite flow stays testable. The other two — **GS** and **Orange** —
are at 1 seat and can invite nobody, which is the intended behaviour. That was a one-off data
change, not a migration: it is about two specific rows.

**Screens.** [app/(dash)/team.tsx](app/(dash)/team.tsx) now counts active + pending, shows free
seats, explains the refusal *before* the button is pressed rather than dimming it silently, and
its "Nothing is blocked — this is a note, not a limit" panel was replaced with what actually
happens. [app/(app)/settings/team.tsx](app/(app)/settings/team.tsx) got the same count: leaving
it on active-only would have shown a free seat the database refuses to fill, which is a defect
this work would have introduced. Its invite screen already renders errors inline, so the
refusal is visible there without further change.

**Still not enforced, deliberately:** nothing stops an admin buying seats they have not paid
for, because `seats_purchased` is only ever written by billing, which does not exist yet (#11).






### 27. Privacy policy / Terms review before Play submission — reported 2026-09-08

External review of the live [/privacy](app/(web)/privacy.tsx) and [/terms](app/(web)/terms.tsx)
pages. **Scope note from you: fix whatever is needed in the web app *and* the app — the goal is
an upload Play will accept.** Nothing here is started; this section is the note, not the fix.

Everything below was checked against the source, and the checks changed two of the findings —
see 27c and 27d, where the code is not in the state the reviewer assumed. The rest stand.

---

---

**Document text updated 2026-09-08** — the wording changes in 27c, 27e and 27f are written.
Both pages now say *Last updated 8 September 2026*. `npx tsc --noEmit` clean.

- **New section in the policy, [What the app asks your permission for](app/(web)/privacy.tsx)** —
  camera, microphone, photos and contacts, each with what it is for and when it is asked.
- **Camera is described as card photography only**, because that is all it is:
  `useCameraPermissions` appears once, in [app/(app)/capture/camera.tsx](app/(app)/capture/camera.tsx).
  The QR tab shows a code, it does not scan one — worth re-reading this line if QR scanning is
  ever added.
- **Contacts is written as a favourable fact, not an admission**: the feature ships, the phone's
  own new-contact screen does the writing, Yieldd never reads the contact list and the app asks
  for no contacts permission. It matches `blockedPermissions` in [app.json:62-64](app.json#L62-L64).
  **The Data Safety form must agree — do not declare a contacts permission we do not carry.**
- **Withdraw consent and nominate** are two new paragraphs under *Your other rights*. Nomination
  is handled by email against the account; there is no nomination screen and none is promised.
- **The deletion sentence has a verb now** — "Our account deletion page sets out what deletion
  removes in full…". It reads correctly even while the link still renders as plain text.
- **Terms, *Ending it*** now points at Settings › Delete account first and email second, since a
  reviewer reads that section for the deletion path. The export sentence was left alone: there is
  no plan gating in any of the three export screens, so the Terms are already true (27g).
- **Still open on this:** 27c's real cause — `LegalLink` is a `Typography` with `onPress`, not an
  anchor — is untouched, and lands with the static-HTML work in 27b.

#### 27a. Google Play billing — the one that is not about the documents
Play's Payments policy names "cloud software and services, such as data storage services,
business productivity software" as purchases that **must** use Google Play Billing. Yieldd Pro
is squarely that, so the **"Pay with UPI" button in the upgrade modal** of the monetization copy
deck is a direct conflict. This is the same decision already parked under *App store readiness →
Google Play billing* and under *Blocked on you* in the board; the review turns it from a Phase 4
question into a submission blocker, because the copy deck describes a flow that would be
rejected.

- **The route the reviewer recommends, and the one already recommended here:** take payment on
  **yieldd.co only**. The Android app then does nothing but sign in — **no purchase button, no
  price, no "Upgrade" link, no modal**. Play polices the link as hard as the button.
- **What that changes, and it is not small:** the upgrade modal in the copy deck goes; the
  paywall becomes an explanation with no call to action; anywhere a Free limit is hit, the app
  can say what Pro includes but cannot route you to buy it.
- **Decide this before Phase 4 writes any of it**, not after a rejection.

**DECIDED 2026-09-08 — sell on yieldd.co only.** You chose the web-only route, so Play Billing is
off the table and Yieldd keeps 100% of every sale. This closes a decision that had been sitting in
*Blocked on you* since 2026-08-31.

**What has to come out of the Android app.** Nothing here is done yet.

- [app/(app)/(modals)/upgrade.tsx](app/(app)/(modals)/upgrade.tsx) — the whole modal. It carries
  the **Pay with UPI** button (line 51) and the **₹10,000 per event** price. Both are the
  violation, not just the button.
- [app/(app)/payment/success.tsx](app/(app)/payment/success.tsx) and
  [app/(app)/payment/failure.tsx](app/(app)/payment/failure.tsx) — a purchase result with no
  purchase to result from. `failure.tsx` also routes back into the modal twice.
- The three routes into it: [profile.tsx:154](app/(app)/(tabs)/profile.tsx#L154) (the Upgrade
  chip), [voice.tsx:190](app/(app)/capture/voice.tsx#L190), and `failure.tsx`.
- **A link is policy-breaking too.** Do not replace the button with "upgrade at yieldd.co" —
  Google treats the link exactly as it treats the button. The paywall becomes an explanation with
  **no call to action at all**.
- **What stays.** The limit messages are fine and should not be touched: `lib/api/events.ts:43`,
  `lib/api/voiceNotes.ts:101`, `settings/team.tsx:73`. They say what the plan covers, which is
  allowed; only "here is how to pay" is not. Re-read their wording once the modal is gone so none
  of them dead-ends at a screen that no longer exists.
- **Also:** `Plan & billing` in profile.tsx:167 currently alerts "isn't wired up yet". On the
  web-only route it should never become a purchase screen in the app.
- **The pricing number is still unsettled** — see #11. Removing the modal removes the app's copy
  of ₹10,000, but the website will need whatever number you land on.

**REOPENED AND PARKED 2026-09-18.** Told that paying Google's cut is not an objection, which
reopens the decision taken on 2026-09-08. Both routes were put to the user in plain terms:

- **A — no purchase UI.** Delete the modal and the payment screens, sell on yieldd.co, keep 100%.
  A day's work, and the Play upload is unblocked immediately.
- **B — Google Play Billing.** Keep a Buy button that opens Google's checkout (which supports UPI
  in India, so the customer's experience is unchanged). Google keeps roughly 15% of a
  subscription, about ₹4,500 on ₹30,000. This is a build, not a setting: a billing library, a
  real dev build rather than Expo Go, products configured in Play Console, and **server-side
  verification of the purchase token before Pro unlocks**. Weeks. The Play upload waits for it.

**The user's answer: neither yet.** Finish the outstanding app corrections first, then decide.
So nothing is deleted and nothing is built until that decision comes back.

**What did not change, and is the thing to re-read before acting on either route:** the
"Pay with UPI" button is a violation under *both* answers. Paying Google's fee does not buy the
right to take the payment yourself; it buys the right to use *Google's* checkout. So
[upgrade.tsx](app/(app)/(modals)/upgrade.tsx) as it stands cannot ship whichever way this goes.
Route B replaces that button, route A removes it.

**Two things block B regardless of the answer:** the price is still undecided (#11), and there is
no Yieldd-owned EAS account, so no dev build can be produced to test billing against.

#### 27b. The pages still need JavaScript to render anything
Unchanged since it was first raised. [vercel.json](vercel.json) rewrites
`/((?!\.well-known/).*)` to `/index.html`, so every legal route is the Expo web SPA shell — an
empty page until the bundle boots. A reviewer with JS off, and every crawler, sees nothing.

- **Serve `/privacy` and `/terms` as real static HTML**, and `/delete-account` with them (27d).
- The obvious shape: pre-rendered files under `public/` with `vercel.json` rewrites that exclude
  those three paths the way `.well-known/` is already excluded. Whatever the method, the test is
  `curl` returning the actual words with no browser involved.

#### 27c. The deletion-section sentence — **the link is there in source, and still renders as text**
The reviewer read this as link text that lost its link:

> What deletion removes, in full, including what is kept when a colleague carries on running the
> organisation, and how to ask if you can no longer sign in.

**It is not missing.** [app/(web)/privacy.tsx:169](app/(web)/privacy.tsx#L169) wraps the first
clause in `<LegalLink href="/delete-account">`. The reviewer is right about the *effect* and
wrong about the cause, and the cause is worse:

- [components/web/LegalPage.tsx:89-98](components/web/LegalPage.tsx#L89-L98) builds `LegalLink`
  as a `Typography` with **`onPress={() => router.push(href)}`**. On the web that is a `div` with
  a click handler — **no `<a>`, no `href` in the DOM**. It is not copyable, not right-clickable,
  invisible to a crawler, and dead with JS off (27b). Styled gold and underlined, so it *looks*
  like a link and behaves like text.
- **Fix the component, not the sentence** — every legal link on both pages goes through it. It
  needs to emit a real anchor (expo-router's `Link`, or a plain `<a>` on web) with the `href`
  present in the markup.
- The sentence itself also reads better with the clause promoted; check it once the link works.

#### 27d. A web page for account deletion — **the route exists, so the gap is elsewhere**
Play requires a **publicly reachable URL** where someone can request deletion **without
installing the app**, entered separately in the Data Safety form. The reviewer says there is no
such page. [app/(web)/delete-account.tsx](app/(web)/delete-account.tsx) exists and is already
recorded as "the public URL Play Console asks for".

So the work is to find out why it read as absent, and it is at least these:

- It is behind the same SPA rewrite (27b), so it does not exist to anyone without JS.
- The only pointer to it from `/privacy` is the dead pseudo-link in 27c.
- **Read the page before writing anything else** and check it actually offers a *request* path
  for someone who **cannot sign in** — the policy currently describes only Settings → Delete
  account, which is useless to a person who has lost access. If the page merely explains the
  in-app flow, it does not satisfy the requirement.
- Then: the URL goes in the Data Safety form, and `/privacy` links to it properly.

#### 27e. Contacts, camera and microphone are never named
`grep` over [app/(web)/privacy.tsx](app/(web)/privacy.tsx): **zero** occurrences of "camera",
"microphone". The policy describes card photos and voice notes without ever saying the app asks
for camera and microphone access. One line covers both.

- **Contacts is the sensitive one.** Saving a lead to the phone's contacts is Phase 1 scope and
  the policy never mentions it. Note the wrinkle already recorded under *App store readiness →
  Fixed on 2026-08-31*: `lib/contacts.ts` **no longer requests contacts permission**, because
  `presentFormAsync` hands the contact to the system's own new-contact screen and needs none;
  READ/WRITE_CONTACTS are in `android.blockedPermissions`.
- **That is still worth a sentence, and it is a favourable one:** the feature ships, the app
  never reads your contact list, and Play sees no contacts permission. Say that in the policy
  rather than leaving a reviewer to wonder — and make sure the Data Safety form matches, i.e.
  **do not** declare a contacts permission the manifest does not carry.
- Re-check the manifest against this before submitting; if any future code re-adds the request,
  both documents change with it.

#### 27f. Two DPDP rights are missing
The Act gives people the right to **withdraw consent as easily as they gave it**, and the right
to **nominate** someone to exercise their rights on death or incapacity. Neither appears under
*Your other rights*. Two sentences, next to the existing access/correction paragraph.

#### 27g. Export — a three-way contradiction, now written into a contract
[app/(web)/terms.tsx:100-103](app/(web)/terms.tsx#L100-L103) says: *"You can export your leads
from the app at any time — do that before you close an account."* The monetization copy deck
locks export behind Pro. The MVP plan and the UI plan both say export is **not** locked on Free.

- The contradiction predates the documents; the Terms have now made one side of it a promise.
- **Recommended, and the reviewer agrees:** the UI plan wins — **export stays free**. It is what
  makes the product feel reversible, and it is the sentence that makes the Terms' "closing
  deletes the data" honest.
- Then correct the monetization deck, not the Terms.

#### 27h. Verify the no-training claim rather than assuming it
[app/(web)/privacy.tsx:113](app/(web)/privacy.tsx#L113) states our providers may not "use it to
train their models". True of Anthropic's and Deepgram's standard API terms — **check it holds for
the specific plan and account we are on**, because it is now in writing on a public page.

### 21. Web dashboard — Events is a list you cannot add to — reported 2026-09-07, DONE 2026-09-08

- **Where:** [app/(dash)/events.tsx](app/(dash)/events.tsx)
- **What is missing:** no **Create event**, no **Edit event**. The screen renders the table and
  nothing else, so an admin who opens the dashboard to set up a show has to pick up a phone.
- **What exists to build on:** the create wizard is six screens under
  [app/(app)/events/new/](app/(app)/events/new/) and the editor is
  [app/(app)/events/[id]/edit.tsx](app/(app)/events/[id]/edit.tsx). Both write through
  `createEvent` / `updateEvent` in [lib/api/events.ts](lib/api/events.ts), so the mutations are
  done — this is a web form over existing calls, not new backend work.
- **Decide first:** whether the web version is the same six-step wizard or one long form. A wizard
  earns its keep on a phone, where only one field fits at a time; on a monitor it is six clicks
  for something that fits on one screen.
- **Fixed 2026-09-08:** **New event** on the Events header (admin only) and **Edit** on every row.
  One form, not a wizard — the whole thing fits on a monitor, so six steps would have been six
  clicks for nothing. [components/dash/EventForm.tsx](components/dash/EventForm.tsx) is shared by
  [app/(dash)/events/new.tsx](app/(dash)/events/new.tsx) and
  [app/(dash)/events/[id]/edit.tsx](app/(dash)/events/[id]/edit.tsx).
- **Reused rather than rebuilt:** `useCreateEvent` / `useUpdateEvent` already carry the org id, the
  user and the plan guards, and [components/app/DateField.tsx](components/app/DateField.tsx) works
  unchanged in a browser — its sheet is a plain `Modal`. No new API, no second date picker.
- **Costs are on the same screen**, in rupees as `Event.costs` already is. `createEvent` takes no
  costs, so a create with costs is two writes, the same split the wizard's cost step makes; the
  second write is skipped when every box is blank.
- **Watch:** `Event.totalCost` is rupees and `formatPaise` expects paise, so the list multiplies by
  100. Getting that wrong shows ₹6,840 for a ₹6,84,000 stall.

### 22. Web dashboard — Follow-ups lists what is due and offers no way to do it — reported 2026-09-07, DONE 2026-09-08

- **Where:** [app/(dash)/follow-ups.tsx](app/(dash)/follow-ups.tsx)
- **What is missing:** every row says who is due and how overdue, then stops. No send, no open the
  lead, no mark done, no reschedule.
- **The awkward part:** sending is a deep link — `wa.me` / `mailto:` — which hands a pre-filled
  draft to the app on the device. That is the right call on a phone. On a desktop it opens
  WhatsApp Web or a mail client, which may not be signed in. Worth deciding whether the web
  action is Send, or Copy the message, or just Open the lead.
- **Fixed 2026-09-08:** [app/(dash)/follow-ups.tsx](app/(dash)/follow-ups.tsx) rows now carry
  **WhatsApp**, **Copy** and **Done**, with All / Overdue / Today filters.
- **Built on `useLeadActions`, not on the phone's follow-up screen** — see the two defects noted
  under "Out of scope" below. The hook gained an optional `onError` callback (the phone still gets
  `Alert.alert` when it is omitted) plus `whatsappText` / `whatsappHref` / `noteWhatsAppOpened`,
  which the web needs as values because its send is an anchor rather than a handler.
- **The send is a real `<a target="_blank">` inside the click.** A programmatic open after an await
  is popup-blocked and still resolves, so the phone's pattern would claim a send that never left.
  Verified in a browser: a bare `9820441720` renders as `wa.me/919820441720` — country code
  repaired by `whatsappDigits`, which is exactly what the phone screen gets wrong.
- **Done** is `editLead(id, { followUpDate: null })` + `syncDrafts()`. `LeadPatch` has always typed
  it `string | null` and the mapper has always written it; there was simply no UI. Verified: three
  leads with dates, click Done, two remain.
- **No dialler and no `mailto:` on desktop.** `tel:` sets `window.location` and navigates the
  dashboard away; `mailto:` opens a blank tab when no handler is registered and still reports
  success, which would record a send that was never composed. Copy covers both honestly.

### 23. Web dashboard — Templates can be read but not written — reported 2026-09-07, DONE 2026-09-08

- **Where:** [app/(dash)/templates.tsx](app/(dash)/templates.tsx)
- **What is missing:** no **New template**, no edit, no set-as-default, no attachment. The body is
  rendered as static text; the token list is a legend, not an editor.
- **What exists to build on:** `useTemplateMutations` in
  [hooks/useMessageTemplates.ts](hooks/useMessageTemplates.ts) already covers create, update,
  delete and set-default, and the phone editor is
  [app/(app)/settings/whatsapp-template.tsx](app/(app)/settings/whatsapp-template.tsx).
- **Keep:** the six real tokens stay the only ones offered. Two invented ones were being sent once
  (#15) and the legend is what stops that coming back.
- **Fixed 2026-09-08:** [app/(dash)/templates.tsx](app/(dash)/templates.tsx) can create, edit,
  set-as-default and delete, against the existing `useTemplateMutations`. Admin only; a rep sees the
  templates and no buttons.
- **The token list is now derived**, not typed: `MERGE_FIELDS` drives both the chips and a live
  warning. Typing `{{senderCompany}}` — which this very screen used to advertise — now raises
  "this is not a real token … it will be sent exactly as written". Verified in a browser: it catches
  `{{senderCompany}}` and `{{invented}}`, and clears when they are corrected.
- **Subject is null for WhatsApp**, not `''` — `message_templates_subject_email_only` is a CHECK
  constraint and an empty string is rejected.
- **Delete goes through ConfirmDialog.** On the phone it is `Alert.alert`, which on web is an empty
  function — the confirmation would never appear and the delete would never fire.

### 24. Web dashboard — Team has no Invite button — reported 2026-09-07, DONE 2026-09-08

- **Where:** [app/(dash)/team.tsx](app/(dash)/team.tsx)
- **What is missing:** an admin can see members, seats and roles, and can invite nobody. No
  deactivate or reassign-role either.
- **What exists to build on:** [lib/api/invites.ts](lib/api/invites.ts) mints the token and
  `useSetMemberStatus` in [hooks/useTeam.ts](hooks/useTeam.ts) handles activate/deactivate.
- **The catch:** an invite is delivered by opening WhatsApp with a pre-filled message. On desktop
  that needs a different ending — show the invite link with a Copy button, or send the invite
  email — since there is no WhatsApp app to hand it to.
- **Guard:** admin only, and refuse past `organizations.seats`.
- **Fixed 2026-09-08:** [app/(dash)/team.tsx](app/(dash)/team.tsx) gained an admin-only invite panel
  (repeating name + phone rows), Deactivate / Restore on members, Revoke on pending invites, and a
  "Waiting to join" table. New hook `useCreateInvites` in [hooks/useTeam.ts](hooks/useTeam.ts) takes
  the organisation id and inviter from the session rather than the caller, as `useCreateEvent` does.
- **Delivery is an anchor, not `Linking.openURL`.** The phone opens WhatsApp *after* awaiting the
  insert, which in a browser runs outside the click gesture and is silently popup-blocked — and
  because the promise still resolves, the phone marks it "Sent" regardless. The web renders a real
  `<a target="_blank" rel="noopener">` plus Copy link and Copy message, and claims nothing was sent.
  Verified in a browser: the href is `https://wa.me/919820441720?text=…`, country code repaired by
  `whatsappDigits`.
- **Confirmations use [ConfirmDialog](components/dash/ConfirmDialog.tsx), never `Alert.alert`** —
  react-native-web ships `Alert` as an empty function, so a ported confirmation silently does nothing.
- **Seats are still not enforced** and this does not pretend otherwise: the panel shows an honest
  "you are over your seats" note and blocks nothing, matching the phone. Real enforcement would need
  an RPC or constraint and is a separate decision.

### 25. Web dashboard — Export only knows about the current event — reported 2026-09-07, DONE 2026-09-08

- **Where:** [app/(dash)/export.tsx](app/(dash)/export.tsx)
- **What is missing:** the scope choice is *this event* or *won only*. There is no event picker, so
  exporting last quarter's show means switching the current event first.
- **Also missing:** the column-group toggles and the date range that the phone screen has
  ([app/(app)/events/[id]/export.tsx](app/(app)/events/[id]/export.tsx)).
- **Note on scope:** `buildLeadsCsv` takes `event` / `won` / `range` — there is no "everything"
  scope, which is why the dashboard does not offer one. Adding an event dropdown is a UI change;
  adding "all events" would need a new scope in [lib/api/exportLeads.ts](lib/api/exportLeads.ts).
- **Fixed 2026-09-08:** [app/(dash)/export.tsx](app/(dash)/export.tsx) now has an event picker built
  from `useEvents()` (opening on `useCurrentEvent()`), all three scopes, the six `ExportColumns`
  toggles, and a From/To range using `DateField` — its sheet is a plain `Modal`, so it works in a
  browser unchanged.
- **Carried over from the phone:** `to` is sent as `23:59:59.999` or the last day is silently cut
  off, and custom-field headers are resolved through `fetchEventFields` so a column reads
  "Budget range" rather than a UUID. The property is `name`, not `label`.
- **Filename now uses `csvFilename(event.name)`** — the dashboard was hardcoding
  `yieldd-leads-<date>.csv` and ignoring the shared helper.
- Escaping in [lib/csv.ts](lib/csv.ts) is untouched; `npm run verify:csv` still passes, including the
  guard that a `+91 …` phone number is *not* prefixed with an apostrophe.

### 26. Web dashboard — no route to ROI, and no per-event download — reported 2026-09-07, DONE 2026-09-08

- **Where:** [app/(dash)/events.tsx](app/(dash)/events.tsx)
- **What is missing:** an event row is not clickable. There is no event dashboard, no ROI screen,
  and no download for that one event — so the seven-column cost model, which is the thing Yieldd
  does better than anyone it competes with, is invisible on the web.
- **What exists to build on:** `event_stats` already returns `wonValuePaise`, `spendPaise` and
  `expectedValuePaise`, and [lib/roi.ts](lib/roi.ts) has `roiPercent`, `costPerLeadPaise` and
  `costPerWonPaise`. The phone screen is
  [app/(app)/events/[id]/roi.tsx](app/(app)/events/[id]/roi.tsx).
- **Two rules that must survive the port:** money is `null` for a rep, not zero — RLS returns
  nothing and a `0` would read as "this event made nothing"; and every figure comes from the
  server function, never a count done in the browser.
- **Design already drawn:** [docs/web-dashboard/EventROI.dc.html](docs/web-dashboard/EventROI.dc.html)
  and `EventDashboard.dc.html`, in the canvas from 2026-09-07.
- **Fixed 2026-09-08:** an event name in the list opens
  [app/(dash)/events/[id]/index.tsx](app/(dash)/events/[id]/index.tsx) — stats, capture by hour,
  leaderboard, spend — and **ROI** on the row or in the header opens
  [app/(dash)/events/[id]/roi.tsx](app/(dash)/events/[id]/roi.tsx), which also downloads that one
  event's CSV. `DashShell` gained breadcrumbs; these are its first detail pages.
- **The move that made it possible:** `buildRoiPdfHtml` now lives in [lib/roiPdf.ts](lib/roiPdf.ts).
  It could not be imported from the phone screen — that file pulls in react-native-view-shot,
  expo-media-library, expo-print and expo-sharing at the top level, all of which would have landed
  in the browser bundle. The phone imports it from the new home, unchanged.
- **Printing on web** is a hidden iframe plus `window.print()`. `printToFileAsync` does not exist on
  web and a popup window would be blocked.
- **New suite:** `npm run verify:roi-pdf` — 14 assertions, including that a rep sees a dash and never
  ₹0, that bar widths come from `barWidth` not `shareOfTotal`, and a guard that fails if a native
  import returns to the shared module.


### 20. Export Leads hides an event that already has leads — reported 2026-09-02

- **Where:** [app/(app)/settings/export.tsx:14](app/(app)/settings/export.tsx), and the same rule on
  the event dashboard at [events/[id]/dashboard.tsx:228](app/(app)/events/[id]/dashboard.tsx).
- **Reported:** created an event today, captured into it, and it does not appear under
  Settings → Export leads.
- **The rule that was set, in full.** Not "after the event starts" exactly — it is keyed on the
  event's **status**, and the comment states the assumption out loud:

  ```ts
  // Upcoming events are left out on purpose: there is nothing to export yet.
  const exportable = events?.filter((e) => e.status !== 'upcoming') ?? [];
  ```

  Only `live` and `closed` events are listed. The dashboard hides its own **Export leads** button
  the same way, with `{!isUpcoming ? …}`.

- **Why it is wrong.** The assumption is false: `status` is derived from the dates
  (`deriveStatus` in the event mapper), so **Kisan** — starting 2026-09-04, two days out — is
  `upcoming`, while it already holds **3 captured leads**. Leads get taken before a show opens
  (pre-registrations, a soft day, a rep testing) and the export refuses to show them. "There is
  nothing to export yet" is a guess about the dates, not a fact about the data.
- **RULE DECIDED 2026-09-02 by the user:** *"If, in any event, even one lead gets captured, then
  it should come in the export leads list."* So the gate is **`event.leads > 0`**, and the
  event's status stops mattering entirely. `fetchEvents` already returns that count, so nothing
  new has to be fetched.
- ~~**Fix**~~ — **DONE 2026-09-02.**
  - [settings/export.tsx](app/(app)/settings/export.tsx) filters on `(e.leads ?? 0) > 0`.
    `fetchEvents` already counts them in the same query (`leads(count)`, defaulting to 0), so
    this costs no extra round trip.
  - An **Upcoming** group was added to the list. Without it an event could pass the filter and
    then have nowhere to render — the screen only had `live` and `closed`. Same order the
    Events tab uses, so the two screens read alike.
  - The dashboard's **Export leads** button now shows on `stats.totalLeads > 0` instead of
    `!isUpcoming`, and `isUpcoming` is gone from that screen.
  - The empty state no longer says leads "become available once an event is running", which was
    the same false claim in prose.
  - **Checked against the live database:** Kisan (`upcoming`, 3 leads) now qualifies;
    Plastindia (`upcoming`, 0 leads) still does not. `tsc` exit 0, `verify:csv` passes.

### 19. Event lead count is stale until you pull to refresh — reported 2026-09-02

- **Where:** [lib/queryClient.ts](lib/queryClient.ts), [hooks/useEvents.ts](hooks/useEvents.ts),
  [hooks/useEventStats.ts](hooks/useEventStats.ts),
  [stores/useLeadsStore.ts](stores/useLeadsStore.ts). Seen on the "N leads" figure at
  [app/(app)/(tabs)/events.tsx:108](app/(app)/(tabs)/events.tsx).
- **Reported:** two cards scanned into an event, the event kept showing one lead, and only
  pulling down to refresh corrected it. It should update without being asked.
- **Cause — two halves.** First, the cache is long-lived **on purpose**:
  [lib/queryClient.ts:16-19](lib/queryClient.ts) sets a global `staleTime: 30_000` with
  `refetchOnWindowFocus: false`, because "this app is used on exhibition-hall mobile data". There
  is no `useFocusEffect` anywhere in the app, so returning to an already-mounted tab refetches
  nothing. Second, **nothing invalidates on capture**: the only `invalidateQueries` calls in the
  app are [hooks/useEvents.ts:129,143](hooks/useEvents.ts) (event create/update) plus templates,
  organization and team. `useLeadsStore` never touches react-query. So `eventKeys.list()` and the
  `statsKeys` queries hold their last value until a manual refresh.
- ~~**Fix**~~ — **DONE 2026-09-02.** Three parts, and the third turned out to matter most.
  1. **`syncDrafts` now invalidates `eventKeys.all` and `statsKeys.all` when something actually
     reached the server.** The store imports the `queryClient` singleton directly, the same way
     `useSessionStore` already does for `resetQueryCache` — no provider plumbing needed. It is
     collected into one flag per drain rather than fired per lead, or a rep who captured forty
     offline would trigger forty refetches of the same two queries on reconnect. **The 30s
     `staleTime` is untouched** — it is deliberate for hall mobile data, and react-query only
     refetches queries that are mounted, so this costs one request on the screen being looked at.
  2. **The events tab shows `+N syncing`** beside the server's count, rather than adding local
     drafts into it. A merged total would be a number the server does not agree with, and a lead
     inserted just as the response was lost would briefly be counted twice. The drafts are
     grouped in a `useMemo` over a raw selector — deriving inside a zustand selector returns a
     new object every render and loops.
  3. ⚠️ **A capture made while a drain was running never synced until the next app foreground.**
     `syncDrafts` returns early if a drain is in progress, and iterates a snapshot taken at the
     start — so scanning two cards back to back, which is the ordinary case at a stall, left the
     second one queued and the event genuinely showing one lead. It now runs a follow-up pass
     when the last one made progress. This was very likely the real cause of the report, not
     just the stale cache.
- **Checked:** `npx tsc --noEmit` exit 0; `npm run verify:stats` (21 checks, live database,
  including that a rep still gets the real total through the server-side aggregate);
  `npm run verify:messaging` (18 checks).

### 18. Only the front of a card is scanned, and no branch address — reported 2026-09-02

- **Where:** [app/(app)/capture/camera.tsx:24](app/(app)/capture/camera.tsx),
  [lib/api/cardScan.ts:57](lib/api/cardScan.ts),
  [supabase/functions/extract-card/index.ts:151](supabase/functions/extract-card/index.ts).
- **Reported:** only one side of the card can be scanned — there should be an option to flip it
  and scan the back. **And** when a card carries a *branch* address as well as the head-office
  one, that needs capturing too, which means a new field.
- **Decided 2026-09-02:** the back is an **optional second shot**, not compulsory. Most cards
  have nothing useful on the back and forcing it slows every capture.
- **Cause:** a single photo end to end — one `takePictureAsync`, one `image_base64` in the body,
  one image in the model's content array. And `leads` has `company_address` but **no branch
  column** (`20260827080000_capture_fields_and_custom_field_types.sql` is the whole address story).
- **Fix A — the back.** After the front, offer "Scan the back" with a Skip. Send both images in
  one call and merge, front winning on conflict.
- ⚠️ **Trap: storing the back photo is a schema change, not a file write.** All four
  `card-images` policies match on `l.card_image_path = storage.objects.name` **exactly**
  ([20260827130700_storage_buckets_and_policies.sql:73-115](supabase/migrations/20260827130700_storage_buckets_and_policies.sql)),
  and [cardImagePath()](lib/api/storage.ts) returns one key per lead, `{org}/{lead}.jpg`. A
  `-back.jpg` upload is **refused**, because no row holds that value. Either add
  `card_image_back_path` and amend all four policies, or decide the back is read and discarded.
  **Decide before building** — reading and discarding is defensible and much cheaper.
- **Fix B — branch address.** Crosses the database, so it is the widest change here: additive
  migration `alter table leads add column branch_address text`; `npm run db:types`; the system
  prompt plus the `Extracted` / `EMPTY` / `normalise` triple in `extract-card`; `ScannedCard` and
  the `FunctionFields` mapping in [lib/api/cardScan.ts](lib/api/cardScan.ts); insert and patch in
  [lib/api/leads.ts:156,219](lib/api/leads.ts); the leads store; the confirm screen; and the CSV
  export — `ExportColumns` ([lib/api/exportLeads.ts:22-38](lib/api/exportLeads.ts)) groups by
  `identity` / `contact` / …, so branch address joins the `contact` group rather than becoming a
  new toggle.
- ~~**Fix**~~ — **DONE 2026-09-02, deployed.** Migration `20260902100000_lead_branch_address.sql`
  rehearsed then pushed, types regenerated, `extract-card` redeployed.
  - **The back is an optional second shot.** The camera takes the front, then asks for the back
    with a **Skip the back** alongside the shutter. Both images go up in one call, **labelled
    front and back** — two unlabelled photos read as two different cards, and the model then has
    to guess which address belongs to which. A new front clears any previous back, or a stranger's
    address could ride along on the next lead.
  - **The back photo is read and discarded**, per the trap above. Storing it would have needed a
    second column plus four storage-policy amendments for a picture nothing ever reads back.
  - `branch_address` runs the whole way through: migration → generated types → prompt → function
    → `ScannedCard` → `leads` insert and patch → the store → both capture screens → CSV export
    (in the `contact` column group).
- 🔎 **Found while verifying, and it was NOT introduced by this change.** The function read
  `payload.content[0].text` — only the *first* content block. Any response whose text was not
  block zero yielded an empty string and fell through to "nothing readable on that photo",
  **indistinguishable from a genuinely unreadable card**. It made `verify:card` fail two runs out
  of three, on different fixtures each time. Both the function and
  `scripts/compare-card-models.mjs` now join every text block. The comparison script had the same
  defect, so it could have scored a perfect extraction as 0/8 and blamed the model.
- **Measured, not assumed** — `npm run compare:card-models --models claude-sonnet-5 --runs 2`:
  **144/144 correct, 0 invented, 0 wrong, 0 missed**, 4.4s average. Sonnet stays the right choice.
  A new fixture `card-branch.jpeg` prints a registered office and a works/branch address under
  their own headings, and **every single-address fixture now asserts `branch_address: null`**, so
  the harness catches a model that invents a second address out of one. The scorer's denominator
  now follows `FIELDS.length` instead of a hardcoded 8.
- **Also checked:** `npx tsc --noEmit` exit 0; `verify:card`, `verify:csv`, `verify:duplicate` all
  pass against the live database.
- **Two rules this repo already learned, both apply:** rehearse the migration in a transaction
  first (`npm run db:rehearse` — there is no rollback net), and **re-run
  `npm run compare:card-models`** because the prompt is changing. Sonnet was chosen on a
  168-field measurement; a new field and a second image change what that measured.
- Deploy with `npx supabase functions deploy extract-card --use-api` (no Docker).

### 17. The create-event wizard is the app's only editor — reported 2026-09-02

- **Where:** [app/(app)/events/new/](app/(app)/events/new/) steps 2-5, and the three screens that
  link into them from outside the wizard.
- **Reported:** the details asked while creating an event are not added to the event, and cannot
  be edited afterwards, "because the event is not available".
- **Decided 2026-09-02:** the fix covers **everything asked at creation** — name, city, dates and
  costs — not just the cost path.
- **Cause.** Step 1 writes the real `events` row and keeps its id in the draft store
  ([events/new/index.tsx:47-62](app/(app)/events/new/index.tsx)). Finishing calls `reset()`
  ([complete.tsx:80](app/(app)/events/new/complete.tsx)), clearing it. **Every step after step 1
  gates its database write on that draft id:**
  - [cost.tsx:70](app/(app)/events/new/cost.tsx) — `if (eventId)` → costs written to nothing
  - [templates.tsx:69](app/(app)/events/new/templates.tsx) — `if (draft.eventId && user)`
  - [fields.tsx:126](app/(app)/events/new/fields.tsx) — `if (eventId)`
  - [invite.tsx:43,82](app/(app)/events/new/invite.tsx) — `if (!eventId) return`
- **And three screens outside the wizard link straight into those steps:**
  [roi.tsx:229,287](app/(app)/events/[id]/roi.tsx) → `events/new/cost`;
  [bulk-send.tsx:140,152](app/(app)/leads/bulk-send.tsx) → `events/new/templates`;
  [settings/team.tsx:38](app/(app)/settings/team.tsx) → `events/new/invite`.
  So "Edit cost" on ROI, "Add a template" from bulk send and "Invite a rep" from Settings → Team
  all open a wizard step addressing an event nobody chose.
- **Two failure modes, depending on state.** An empty draft silently drops the write and drops
  you into the rest of the wizard. A draft left over from an abandoned wizard is worse: the
  templates or invites are written **to that event instead of the one you were looking at**.
- ~~**Fix 17a**~~ — **DONE 2026-09-02.** All five links now say which event, or which scope, they
  mean. No screen outside `events/new/` opens a wizard step that guesses any more.
  - **Bulk send ×2** → the organisation's own template screens
    (`settings/whatsapp-template` / `email-template`, chosen by the channel being previewed).
    The wizard step was always the wrong destination: it *creates* templates and repoints the
    event, where the rep only wanted to edit the message these sends actually read.
  - **Settings → Team "+ Invite"** → the invite screen with `scope=team`, which forces
    `eventId` to null. `createInvites` already takes `string | null`, so an organisation invite
    with no event is a legitimate row, not a workaround. In that mode the screen also shows a
    plain header instead of "Step 3 of 5", ends on **Done** rather than pushing into step 4, and
    **no longer writes the reps back into the create-event draft** — which would otherwise show
    them as already invited on the next event anyone started.
  - **ROI ×2** → the cost screen with an explicit `eventId` parameter. Given one, that screen now
    seeds its seven fields from **that event's** stored costs rather than the draft (seeding from
    the draft would have shown one event's numbers while saving them onto another, and an
    untouched field would have blanked a real figure), saves with **Save cost**, returns instead
    of continuing into the invite step, does **not** write to the draft, and says so plainly if
    the id ever arrives empty rather than reporting a save that did not happen.
  - `npx tsc --noEmit` — exit 0.
- ~~**Fix 17b**~~ — **DONE 2026-09-02.** New
  [app/(app)/events/[id]/edit.tsx](app/(app)/events/[id]/edit.tsx), reached from **Edit event
  details** on the event dashboard. An event's details can be changed after it is created for
  the first time.
  - **It owns only name, city and dates** — the three answers that had no other home. Cost,
    custom fields, the follow-up message and rep invites are rows that open the screen which
    already owns each one, told which event it is working on. A second copy of the seven cost
    fields would have been a second thing to keep in step, which is the mistake #16 had just
    finished undoing.
  - **The two remaining wizard steps learned the same `eventId` parameter the cost step got in
    17a.** `templates` now seeds from the message that event actually sends — without that it
    would have offered the default text and overwritten a real follow-up on save — and
    `invite` accepts a named event as well as `scope=team`. Both return instead of walking on
    into the wizard, and neither writes to the create-event draft when editing one event.
  - **The button is admin-only.** `events_admin_update` (initial schema) restricts the write, so
    a rep who filled the form in would have met a 42501 at the end of it.
  - Seeding is keyed on `event.id`, not the event object: the query returns a fresh object on
    every refetch, and re-seeding on that would wipe what someone was halfway through typing.
  - `npx tsc --noEmit` — exit 0.
- **Not included:** `stall_number` exists on the event and is editable through the API, but the
  wizard never asks for it, so it is outside "everything asked at creation".

### 16. Four lead actions are dead buttons — reported 2026-09-02

- **Where:** [components/app/LeadRow.tsx:9](components/app/LeadRow.tsx) — `leadActionStub()`,
  called by all four buttons (lines 43, 53, 64, 74). The row renders on the home screen
  ([index.tsx:266](app/(app)/(tabs)/index.tsx)) and the Leads tab
  ([leads.tsx:175](app/(app)/(tabs)/leads.tsx)).
- **Reported:** on the home screen, tapping the WhatsApp icon says it isn't wired up. All four —
  Call, WhatsApp, Email, Save contact — do the same.
- **Cause: not missing features.** All four are already built, correct and in use on the lead
  detail screen ([leads/[id].tsx:280-310](app/(app)/leads/[id].tsx)) — `openDialer`,
  `sendWhatsApp`, `sendEmail`, `saveToContacts`, on top of `lib/messaging.ts` (which re-exports
  [lib/messageText.ts](lib/messageText.ts)) and [lib/contacts.ts](lib/contacts.ts). `StoredLead`
  extends `Lead`, so the row already holds phone, email, landline, website and address — no extra
  fetch is needed. `LeadRow` was simply never connected.
- **Two things naive wiring would lose**, both already handled on the detail screen:
  `recordSend` ([lib/api/messageSends.ts](lib/api/messageSends.ts)) runs after every WhatsApp and
  email send — without it the send history and follow-up counts disagree with reality — and
  `markSavedToContacts` sets the per-lead state the detail screen shows as "Saved".
- ~~**Fix**~~ — **DONE 2026-09-02.** New [hooks/useLeadActions.ts](hooks/useLeadActions.ts) holds
  all four, and both `LeadRow` and `leads/[id].tsx` now call it — the detail screen's local
  copies are gone, so there is one implementation rather than two that drift.
  - **`recordSend` comes with them.** This is the part that mattered: sends from the list are now
    recorded exactly as sends from the detail screen are. Wiring the buttons without it would
    have quietly under-reported most sends the product makes, since the list is where a rep
    works.
  - **Save contact** also carries `markSavedToContacts`, so the row shows the green tick the
    detail screen shows.
  - **Unreachable actions are dimmed, not hidden** — `canCall` / `canWhatsApp` / `canEmail`.
    Dimming keeps the icons in the same position on every row, which matters at a stall; hiding
    them would move the email icon around from lead to lead. WhatsApp is judged on
    `whatsappDigits`, not merely on a phone being present: a number with no country code cannot
    be linked to, and `whatsappUrl` falls back to opening WhatsApp with no recipient — fine as a
    deliberate choice on the detail screen, misleading as a live-looking icon in a list.
  - The row's action buttons call `e.stopPropagation()`, or the row's own press would open the
    lead detail screen behind the dialer.
  - The hook takes `StoredLead | undefined` because the detail screen renders a "this lead isn't
    here" state before it has one, and a hook cannot be called after that early return.
  - `npx tsc --noEmit` — exit 0.
- **Not covered, deliberately:** the Search stub on the home screen, and the sales/billing
  "isn't wired up" alerts on upgrade, profile and payment failure — those belong to Phase 4.
- **Same screen, decide separately:** Search is still a stub —
  [index.tsx:190](app/(app)/(tabs)/index.tsx).

### 15. No instructions for template variables — reported 2026-09-02

- **Where:** [components/app/MessageTemplateManager.tsx](components/app/MessageTemplateManager.tsx)
  and the `intro` prop on both settings screens; also
  [app/(app)/events/new/templates.tsx](app/(app)/events/new/templates.tsx).
- **Reported:** we need to tell people how to create a variable, and how to write a WhatsApp
  message.
- **Cause:** the only guidance is one sentence naming `{{name}}` and `{{event}}` — **two of the
  five that exist**. The real list is already exported and should be the source:
  `MERGE_FIELDS` at [lib/messageText.ts:35](lib/messageText.ts) — `{{name}}`, `{{company}}`,
  `{{event}}`, `{{sender}}`, `{{sender_company}}`, each with a label.
- ⚠️ **Fix the underlying defect first, or the help text documents something untrue.** Message
  *bodies* get the full context everywhere, but *subject* lines do not:
  [leads/[id].tsx:170-180](app/(app)/leads/[id].tsx) passes all five;
  [send-queue.tsx:84](app/(app)/leads/send-queue.tsx) passes `name`, `company`, `event`;
  [bulk-send.tsx:132](app/(app)/leads/bulk-send.tsx) passes only `name`, `event`. Since
  `renderTemplate` *deletes* a placeholder with no value
  ([messageText.ts:51](lib/messageText.ts)), a subject reading `Great meeting you — {{sender}}`
  silently loses the name in bulk send while working from the detail screen. Pass the same
  context in all three.
- ~~**Fix**~~ — **DONE 2026-09-02.**
  - **The subject bug is fixed first**, because the help would otherwise have documented
    something untrue. `bulk-send.tsx` and `send-queue.tsx` now build one `mergeContext` and use it
    for the body *and* the subject, so all five variables behave the same everywhere.
  - **A collapsible "How to personalise a message" block** sits at the top of the template
    editor, rendered **from `MERGE_FIELDS`** rather than a hand-typed list — the old copy named
    two of the five in a sentence of intro text, and a list written out by hand goes stale the
    first time a field is added. It carries all five with their labels, a worked example per
    channel, and the line that actually surprises people: an empty variable is *removed*, so a
    lead with no company gives "great meeting you" rather than a visible `{{company}}`.
  - It appears on all three screens automatically, since all three render
    `MessageTemplateManager`. The intro copy no longer half-names the variables.
- **Not built: tap-to-insert.** The block lists and explains the variables; inserting one at the
  cursor needs selection tracking on the message box and is worth doing only if people ask.
- **Checked:** `npx tsc --noEmit` exit 0; `npm run verify:messaging` (18 checks, including that
  an empty context leaves no placeholders behind).

### 14. Template editor sits behind the keyboard — reported 2026-09-02

- **Where:** [components/app/MessageTemplateManager.tsx](components/app/MessageTemplateManager.tsx),
  hosted by [settings/whatsapp-template.tsx](app/(app)/settings/whatsapp-template.tsx),
  [settings/email-template.tsx](app/(app)/settings/email-template.tsx) and
  [events/new/templates.tsx](app/(app)/events/new/templates.tsx).
- **Reported:** creating a new template should scroll properly — the Save button and everything
  else end up behind the keyboard.
- **Cause — three faults, compounding:**
  1. **No `KeyboardAvoidingView`.** The app has exactly three, none of them here:
     [AuthFormNative.tsx:47](components/auth/AuthFormNative.tsx),
     [AuthFormWeb.tsx:46](components/auth/AuthFormWeb.tsx),
     [complete-profile.tsx:76](app/(app)/onboarding/complete-profile.tsx).
  2. **No `keyboardShouldPersistTaps`.** React Native's default is `never`, so with the keyboard
     open the first tap on Save or Delete is consumed dismissing the keyboard and never reaches
     the button. This is most of what "not the save button" describes.
  3. The Save/Delete row is the **last** thing in the card, under a `multiline` input that grows
     without limit ([MessageTemplateManager.tsx:135](components/app/MessageTemplateManager.tsx)),
     and a new template is appended **below every existing one** with nothing scrolling it into
     view.
- **Affects three screens, not two** — the wizard's template step has the same three faults
  (ScrollView at line 110, `multiline` at 124 and 148, no `KeyboardAvoidingView`).
- ~~**Fix**~~ — **DONE 2026-09-02**, all three faults, on all three screens.
  - `KeyboardAvoidingView` with the platform behaviour plus `keyboardShouldPersistTaps="handled"`,
    copying [complete-profile.tsx:76-83](app/(app)/onboarding/complete-profile.tsx). The second
    one is what makes **Save work on the first tap** instead of the second.
  - The message box is capped at `maxHeight: 220` (min 96). Unbounded, a long message pushed Save
    and Delete off the card and grew under the keyboard as you typed.
  - A newly added template **autofocuses its name field**, which makes the ScrollView bring it
    into view on its own — it is appended below every existing one, so with a few already there
    it opened off-screen. The cursor lands where the person needs it anyway.

### 13. Scanning your own card fills in nothing — reported 2026-09-02

- **Where:** [app/(app)/card/scan-confirm.tsx](app/(app)/card/scan-confirm.tsx),
  reached from [app/(app)/capture/camera.tsx:27](app/(app)/capture/camera.tsx)
  in `mode=profile`. Entered from
  [app/(app)/card/first-scan.tsx:31](app/(app)/card/first-scan.tsx) ("Scan a card")
  and [app/(app)/card/edit.tsx:398](app/(app)/card/edit.tsx)
  ("Scan my own card instead").
- **Reported:** building your own digital card, tapped the card, tried to scan it,
  the fields never get filled in.
- **Cause — the extraction is never called on this path.** `scanCard()` from
  [lib/api/cardScan.ts](lib/api/cardScan.ts) has exactly one call site,
  [app/(app)/capture/confirm.tsx:83](app/(app)/capture/confirm.tsx) — the *lead*
  path. `scan-confirm.tsx` imports neither `scanCard` nor `useCaptureDraftStore`.
  The camera stores the photo (`setImageUri`) and pushes to `scan-confirm`, and
  that screen seeds its seven fields from `useSessionStore().user` and
  `useMyCard()` only. So the photo is taken, discarded, and the form shows
  whatever the profile already held — blank for a first-time user, which is
  exactly the person `first-scan.tsx` sends here.
- **Not a server fault.** `extract-card` is ACTIVE and works — the lead capture
  flow uses it. This is a missing client call, not a broken function.
- ~~**Fix**~~ — **DONE 2026-09-02.** `scan-confirm.tsx` now reads `imageUri` from the capture
  draft and runs `scanCard`, with the same two rules the lead screen uses: a field is filled only
  if it is still empty, so a correction typed while the read is in flight survives, and the whole
  thing is abandoned on unmount. Reading / filled / nothing-readable / failed all show, so a slow
  scan is no longer indistinguishable from this bug.
  - Mapping: `fullName → name`, `company`, `designation`, `phone → mobile`,
    `companyWebsite → website`, `companyAddress → officeAddress`.
  - **`email` is deliberately not filled** — it is read-only here because the profile guard
    trigger refuses a change to the address you signed in with.
  - **LinkedIn stays hand-typed.** `ScannedCard` has no such field; filling it would need
    `extract-card` extended, which is #18's territory.
  - The photo is cleared from the draft on save, so it cannot still be sitting there when the
    next lead capture opens.
- **Checked:** `npx tsc --noEmit` exit 0; `npm run verify:card` (live database — including that
  a card image upload is refused before its lead row exists).
- **While in there, two smaller things on the same screen:**
  - The photo is never cleared or used afterwards — `useCaptureDraftStore.reset()`
    only runs after a *lead* saves. Harmless today (the camera overwrites
    `imageUri` before `capture/confirm` ever reads it) but it is one route away
    from your own card photo being attached to a stranger's lead.
  - Nothing on the screen tells you a read is happening, so a slow scan is
    indistinguishable from this bug.

### 12. ~~Email sending~~ — DONE 2026-08-31. Kept for the reasoning and the traps.

**Everything in this item is finished.** `care@yieldd.co` sends through Google Workspace SMTP;
the App Password is on Supabase Auth *and* as the `GMAIL_APP_PASSWORD` function secret. A real
password-reset email was sent and received end to end. Both features it blocked are built:
**password reset (#7)** and the **weekly digest (TASKS 6.6)**.

The steps below are left in place because they took several wrong turns to get right —
particularly that *Google Cloud* has no email service, that App Passwords has no menu entry
any more, and that Resend's MX record would have collided with the existing mailbox.

Decided 2026-08-31: the weekly digest goes out by **email**, not WhatsApp.

**Why one setup matters:** the same sender unblocks **password reset (#7)**, the **weekly
digest (TASKS 6.6)** and any future receipt or invoice email. Supabase's built-in mailer is
rate-limited to a handful of messages an hour and is explicitly not something to launch on.

**DECIDED 2026-08-31: Google Workspace SMTP, not Resend.** Your call — no new vendor.

> **Note the distinction, because it caused confusion:** *Google Cloud* has **no** email
> sending service. Google's own Compute Engine docs say so and point you at SendGrid,
> Mailgun or Mailjet. What does work is **Google Workspace**, which you already have —
> confirmed by `yieldd.co` MX pointing at `aspmx.l.google.com`.

**It is also a better fit than Resend at this scale:** Workspace allows **2,000 messages per
user per day** against Resend's free-tier 100/day. And it needs **no DNS changes at all** —
the Google records are already on the domain.

**Sends as `care@yieldd.co`** — your call, 2026-08-31, to avoid paying for a second seat.

I had argued for a dedicated `noreply@` user because exceeding the daily cap suspends *that
account's* sending for 24 hours, which on `care@` would mean the support inbox. On reflection
the concern was overstated and the decision is right: the cap is **2,000/day**, and the
digest is one message per customer per week, so tripping it needs ~2,000 customers in a day —
roughly ₹6 crore of annual revenue, by which point this setup gets revisited anyway.

**The real risk was never volume, it is a bug** — a loop that sends repeatedly. That is
handled in code, not by buying a seat. The digest function must therefore have:
- **a hard per-run cap**, refusing to send beyond it no matter what the loop says;
- **once-per-org-per-week enforced in the database** (a `last_digest_sent_at` column), so a
  re-run or a retry cannot double-send — the same "a replay collides rather than duplicates"
  rule the device-generated lead ids already follow;
- **throttled sends**, not one burst — 200 identical messages in a second looks like spam to
  a receiving server regardless of the cap.

**Two upsides of `care@` worth noting:** replies land in the inbox that is already watched
(no reply-to workaround needed), and customers recognise the address.

**One thing to expect:** sent digests accumulate in `care@`'s Sent folder. Harmless, but it
will look busy.

> **Three different Google consoles are in play in this project. They are easy to confuse:**
>
> | Purpose | Console |
> |---|---|
> | Workspace users for `yieldd.co` (this task) | **admin.google.com** |
> | A single account's own 2FA and App Passwords | **myaccount.google.com** |
> | The OAuth client for Google sign-in (#8) | **console.cloud.google.com** — and per 8a it sits under a **personal Gmail**, project "My First Project", not the org account |
>
> Nothing in this item touches Google Cloud.

**Steps (all yours — I cannot do these). No new user needed:**
1. **admin.google.com** → Security → Authentication → **2-Step Verification**: confirm users
   are allowed to turn it on. If it is already on for `care@`, skip to step 3.
2. Sign in to **myaccount.google.com as `care@yieldd.co`** and turn on **2-Step
   Verification**. Google will not issue an App Password without it.
3. **App Passwords is no longer in any menu** — Google removed it from the account
   navigation, so clicking around will not find it. Go **directly** to
   **`myaccount.google.com/apppasswords`**, signed in as `care@yieldd.co`. Name it anything,
   Create, and copy the 16 characters — **it is shown once**. Done *as that user*; an admin
   cannot generate one on someone else's behalf, and a normal account password is rejected
   by SMTP.

   > ⚠️ **It may refuse.** Google lists three reasons the page is unavailable, and one of
   > them applies here: *"You're logged into a work, school, or other organizational
   > account"* — which `care@yieldd.co` is. The other two (2SV set up with security keys
   > only, Advanced Protection) are unlikely. If it refuses, the unblock is an Admin console
   > setting; Google's public docs do not state which one clearly, so read the actual error
   > rather than guessing at a menu path.
   >
   > **Fallback if App Passwords stay blocked:** Workspace's **SMTP relay service**
   > (`smtp-relay.gmail.com`, Admin console → Apps → Google Workspace → Gmail → Routing) is
   > the designed-for-applications route and does not depend on a per-user App Password.
4. Send that App Password over. I put it on Supabase → Project Settings → Auth → SMTP
   (`smtp.gmail.com`, port 587, user `care@yieldd.co`). Never committed.

⚠️ **Turning on 2-Step Verification for `care@` affects whoever already signs into that
mailbox** — they will be prompted for a second factor next time. Worth a heads-up to them
before doing it, rather than during a show.

**The trade-off, stated so it is not a surprise later:** Workspace gives far less delivery
visibility than a transactional provider. When a customer says "I never got the reset
email", there is no 30-day delivery log to check. Acceptable at this volume; revisit if
support starts fielding that question.

**If volume ever outgrows 2,000/day:** Workspace's **SMTP relay service**
(`smtp-relay.gmail.com`) has higher limits and is the designed-for-apps route — a config
change in the Admin console, not a rebuild.

---

**Superseded, kept for the record — the Resend route:** free tier 3,000/month but capped at
**100/day**, which the weekly digest would hit at ~100 customers. Its setup needed three DNS
records on a **subdomain** (`send.yieldd.co`), because Resend requires an **MX** record and
putting that on the root domain would have collided with the Google mailbox already
receiving `care@yieldd.co`. The GoDaddy trap there: GoDaddy appends the domain, so
`send.yieldd.co` had to be entered as `send` alone or it silently became
`send.yieldd.co.yieldd.co`. None of this is needed now.

**Facts confirmed 2026-08-31, so they are not re-derived:** DNS is on **GoDaddy**,
`care@yieldd.co` is a **live Google Workspace mailbox**, and `yieldd.co` MX is
`aspmx.l.google.com`.

**Then I can build:** the scheduled digest function, and password reset.

**Note:** the digest must honour `profiles.notifications_enabled`, which became a real
stored preference on 2026-08-31 — before that the toggle forgot on close.

### 11. Pricing — the app is publishing the sales-room price (DECISION NEEDED)
- **Where:** [app/(app)/(modals)/upgrade.tsx:38-39](app/(app)/(modals)/upgrade.tsx),
  [app/(app)/payment/success.tsx:21](app/(app)/payment/success.tsx)
- **The problem:** both screens say **₹10,000 per event**. MVP_PLAN §4 says the published
  price is **₹30,000/year + GST, annual, upfront**, and that ₹10,000 single-event is
  *"not published on the pricing page; used in the room when a prospect says 'we only do two
  shows a year.' Deliberately one-third of annual, so the customer does the arithmetic
  themselves and concludes that three shows makes annual obvious."*
- **Why it matters:** putting it in the app publishes it. That loses the ₹30,000 anchor
  ("less than the printing budget for one show") *and* the lever a salesperson plays when
  someone pushes back on price. MVP_PLAN's own upgrade copy is
  *"You've hit 100 leads. Unlock unlimited — ₹30,000/year."*
- **Also inconsistent:** the website shows no headline price at all — only
  [components/web/FAQAccordion.tsx:19](components/web/FAQAccordion.tsx) mentioning
  "₹6,000/year each" for extra seats, which does match MVP_PLAN.
- **Status 2026-08-31:** raised with you; **you said the price still needs deciding.**
  MVP_PLAN itself says *"Treat ₹30,000 as a hypothesis. Take it to five exhibitors and watch
  their faces. If nobody flinches, it is priced too low."*
- **Blocks:** every Phase 4 and Phase 5 screen shows this number. Nothing in the upgrade
  funnel should be built until it is settled, or it gets built twice.

### 7. ~~"Forgot password?"~~ — BUILT 2026-08-31, one thing left
- **Where:** [app/(auth)/forgot-password.tsx](app/(auth)/forgot-password.tsx) (request),
  [app/auth/reset-password.tsx](app/auth/reset-password.tsx) (set the new one),
  [lib/auth/passwordReset.ts](lib/auth/passwordReset.ts), and the link is back on both
  sign-in forms.
- **Unblocked by** the Google Workspace SMTP setup (#12). Every other piece was already in
  place — PKCE, `detectSessionInUrl`, the root-route pattern.
- ⚠️ **Left to do: merge to master.** The emailed link points at
  `https://yieldd.co/auth/reset-password`, and that page only exists on yieldd.co once master
  is deployed. **Until the merge, a real reset email leads to a 404.** The redirect allow list
  is already updated, so nothing else is needed.
- **The link always goes to the web, even on a phone.** A `yieldd://` recovery link cannot
  resolve in Expo Go — the same constraint as 8c — and someone locked out is the last person
  to tell "install a different build first". They set the password in the browser and sign in
  to the app with it.
- **The reset screen sits at the route root**, outside both `(auth)` and `(app)`. Following a
  recovery link *creates a session*: inside `(auth)` the signed-in guard would redirect them
  to the app, and inside `(app)` they would simply be let in — still not knowing their
  password. `handleAuthEvent` has no `PASSWORD_RECOVERY` case, so `user` stays null and no
  guard reacts, while the supabase client still holds the session that authorises the change.
- **It signs you out after a successful change,** on purpose. The recovery session would let
  someone straight in, but then the new password is first actually used days later on another
  device with no way to tell whether it saved.
- **"No account with that email" is never shown** — the confirmation is identical either way,
  or the form becomes a free membership check for anyone curious which of their competitors'
  staff use Yieldd. Asserted in the script, not just intended.
- **Checked by `npm run verify:password-reset`** — 13 live checks, including the two that
  matter: the new password signs in, and **the old one stops working**. A reset that leaves
  the old password valid is not a reset, it is an extra password. Also asserts the link is
  single-use, because email gets forwarded, backed up and synced.

### 9. Not built yet — flagged so nothing here reads as finished

These screens still show placeholder or mock content. Each one says so on screen
rather than quietly inventing something:

- ~~Card scanning (OCR)~~ — **built 2026-08-28.** The camera photo is read by
  the `extract-card` Edge Function (Claude Sonnet 5, chosen on measurements —
  see `npm run compare:card-models`) and fills the confirm screen. The photo
  itself uploads to the `card-images` bucket after the lead saves.
- ~~Voice notes~~ — **built 2026-08-29.** Real recording (2 min cap, mono 64 kbps
  for speech), upload, transcript via Deepgram nova-3 with `language=multi` for
  Hinglish, and a short summary. The Free plan's three-note limit is checked
  BEFORE recording, so nobody loses a recording to an upsell.
- ~~Company summary (AI)~~ — **built 2026-08-29, DEPLOYED AND WORKING 2026-08-31.**
  Both remaining steps are done: the migration was already applied, and the
  function is now live (`summarise-company`, version 1, ACTIVE). Checked end to
  end by `npm run verify:summary` — 19 checks, all passing: a real site returns a
  real summary, the second read comes back cached (6.2s → 0.3s), and eight
  hostile URLs are refused. **Note the cache key is the registrable domain**, so
  `www.acme.com` and `acme.com` are one exhibitor read once. Original notes below.
  The
  `summarise-company` Edge Function reads the company's OWN website — the URL
  the card scan already captures — and summarises only what is actually on the
  page. It never writes from the company name alone, which is what made the old
  version invent things. No website on the lead means it says so; a site it
  cannot read means it says that too. Summaries are cached per domain, so one
  exhibitor's site is read once for the whole team rather than once per rep.
  ~~Two steps left~~ — both done. The migration
  `20260829140000_company_summary_cache.sql` was already applied, and the
  function was deployed 2026-08-31. The ANTHROPIC_API_KEY it needs was already on
  the project from card scanning. The summary itself is written by
  `claude-haiku-4-5`.
- ~~Bulk WhatsApp send and the send queue~~ — **built 2026-08-29.** Deep links,
  not the WhatsApp Business API: a `wa.me` link opens the rep's own WhatsApp
  with the lead's chat and the event's template already typed, and they press
  send. No Meta approval, no per-message fee, no 24-hour window — and the
  customer hears from a person they met rather than a business account. The
  trade-off is that one chat opens at a time, so the queue screen is a
  walkthrough and the copy says plainly that nothing goes out on its own.
- ~~Evening review~~ — **built 2026-08-29.** Walks today's unreviewed leads for a
  note, a Hot/Warm/Cold mark and a follow-up date. Resumable: `reviewed_at`
  means nine of fourteen done comes back as five remaining, not fourteen.
- ~~Digital business card and the public card page~~ — **built 2026-08-29.** The
  card is a `business_cards` row and `/c/{slug}` is a page anyone with the link
  can open. Slugs are claimed through security-definer functions rather than
  guessed at from the client, and every URL on the public page goes through
  `safeExternalUrl` first — it is served from yieldd.co, so an unfiltered
  `javascript:` href there is stored XSS against the people the card was shared
  with.
- ~~Duplicate detection~~ — **built 2026-08-31.** This one was not merely
  unbuilt: the confirm screen showed *"Possible duplicate — Captured by Amit
  Shah · 2 days ago"* on **every** capture, about a person who does not exist.
  See the Done section below.
- ~~Save lead to phone contacts~~ — **built 2026-08-31.** Needs **no** dev
  build, unlike Google sign-in (#8c) — `expo-contacts` ships inside Expo Go, and
  the system contact form is used rather than `addContactAsync`, which is the
  call that would have required one on Android.
- ~~Excel export~~ — **built 2026-08-29, as CSV rather than .xlsx.** The only
  `xlsx` package on npm is 0.18.5 from 2022 with known prototype-pollution and
  ReDoS advisories, and a file of customers' phone numbers is not the place to
  accept that. CSV opens natively in Excel, Sheets and Tally; the screen says
  CSV rather than implying a format it does not produce.
- **Payments** — the whole of Phase 4.

### App store readiness — audited 2026-08-31

Audited against Google Play and Apple App Store rules. Two hard blockers remain; both would
be an automatic rejection, so neither store can be submitted to until they are done.

#### ~~Account deletion~~ — built, deployed AND TESTED 2026-08-31. Done.
- Settings → Delete account. Shows what will go, then asks you to type DELETE.
- **Your rule, with one refinement:** an admin deleting their account takes the whole
  organisation only when they are the **last** admin. With another admin still in place it is
  a handover instead — otherwise one of two admins could destroy the other’s company data
  without their consent. A solo user is always the "delete everything" case, because a solo
  user is an organisation of one.
- **A rep** hands their leads, events, templates and voice notes to the longest-standing
  active admin, then their login goes.
- **Files are cleared too** — card photos, card images, voice recordings. Nothing else would
  ever have removed those, and the privacy policy promises they go.
- **Bug caught while building, worth remembering:** nine columns point at `profiles` and only
  three are declared `on delete restrict`. The other six were written with no delete rule,
  which means `no action`, which blocks a delete exactly as hard while looking like nothing.
  The first draft handled only the three and would have failed at runtime in front of someone
  who had just typed DELETE. `npm run verify:deletion` now checks all of them from the
  migrations, with no database needed — add a table with a profile foreign key and forget it,
  and that script fails before a user does.
- **Where:** [supabase/migrations/20260831120000_account_deletion.sql](supabase/migrations/20260831120000_account_deletion.sql),
  [supabase/functions/delete-account/index.ts](supabase/functions/delete-account/index.ts),
  [lib/api/deleteAccount.ts](lib/api/deleteAccount.ts),
  `app/(app)/settings/delete-account.tsx`,
  [app/(web)/delete-account.tsx](app/(web)/delete-account.tsx) — the public URL Play Console asks for.
- **To deploy, and all three are needed:**
  1. `supabase db push` — applies the migration
  2. `supabase functions deploy delete-account`
  3. `npm run db:types` — then delete the `UntypedRpc` cast in `lib/api/deleteAccount.ts`,
     which only exists because the generated types predate the migration.
- ~~**Not yet tested against a real database.**~~ **TESTED 2026-08-31 — `npm run verify:deletion-live`,
  26 checks, all passing.** It really deletes throwaway `deltest-…@yieldd-test.local` accounts
  and then inspects what is left, because the delete order is circular unless done by hand and
  the failure mode was a runtime error in front of someone who had just typed DELETE. All four
  paths were exercised:
  - **solo user** → organisation, events, leads, profile and login all gone;
  - **rep leaves** → login gone, **their lead survives and now belongs to the admin** (the
    assertion that matters commercially — a rep must not take the company's leads with them);
  - **one of two admins leaves** → handover, the organisation and the other admin survive;
  - **the last admin leaves** → *now* the organisation goes, and the inherited lead with it.
  Plus: a wrong confirmation word is refused and the account still exists, an unauthenticated
  caller is refused, and **every real account was asserted untouched** before and after.
- **Deployment confirmed:** migration `20260831120000` is applied, `delete-account` is ACTIVE
  (v2), and the `UntypedRpc` cast is already gone from `lib/api/deleteAccount.ts` — all three
  deploy steps above are done.
- **Nothing left on this item.**
#### ~~iOS privacy manifest~~ — BUILT 2026-08-31. One part is yours at submission.
- `app.json` now has `ios.privacyManifests`: `NSPrivacyTracking: false`, no tracking domains,
  and the four required-reason API categories the installed packages actually use —
  `FileTimestamp` (C617.1, 0A2A.1, 3B52.1), `UserDefaults` (CA92.1), `DiskSpace` (E174.1,
  85F4.1) and `SystemBootTime` (35F9.1).
- **The reason codes were read off the packages, not recalled.** A web lookup of Apple's page
  returned invented constants (`NSPrivacyAccessedAPITypeReasonFileTimestampAPIs` and the
  like); the real codes are short strings like `C617.1`, which is what the
  `PrivacyInfo.xcprivacy` files inside `node_modules` actually contain.
- **`npm run verify:privacy` computes the union from those files and fails if app.json is
  missing any of it** — Expo does not merge them, and its own guide warns Apple mis-parses
  manifests from static CocoaPods dependencies. It also fails on *over*-declaration, since
  claiming an API you do not use is its own false statement.
  - It immediately earned itself: I had assumed nothing needed `SystemBootTime`. React
    Native's bundled **boost** does. That would have been an ITMS-91053 rejection email after
    an upload that looked fine.
- ⚠️ **`NSPrivacyCollectedDataTypes` is deliberately absent, not forgotten.** An empty array
  is a positive claim that the app collects nothing, which is false — it collects names,
  emails, phone numbers, addresses, card photos and voice recordings. Omitting the key makes
  no claim; the binding declaration for a first-party app is the **App Store Connect → App
  Privacy** questionnaire, which you fill in at submission. I could not verify Apple's exact
  data-type string constants (their docs page is JavaScript-rendered and unreadable to me),
  and guessing nine of them where one typo means rejection is not worth it.
- **What to tick in App Store Connect**, all *linked to the user*, all **not** used for
  tracking, purpose **App Functionality**: Name · Email Address · Phone Number · Physical
  Address · Photos or Videos · Audio Data · Other User Content (notes and transcripts) ·
  User ID. Nothing is collected for advertising or analytics.

#### Google Play billing — DECIDE BEFORE BUILDING PHASE 4 (see 27a — raised again 2026-09-08)
Play requires **Google Play Billing** for anything digital bought and used inside the app. A
Pro plan that unlocks app features is exactly that, so selling it through Razorpay in the
Android build is a Payments policy violation — rejection, or removal later. Razorpay was
settled as the gateway in `94c00f1` and Phase 4 is unstarted, which makes now the moment.

- **Sell only on yieldd.co** — the app never offers a purchase. Cleanest for a B2B tool and
  you keep 100%. Recommended.
- **Google Play Billing** on Android, Razorpay on web and iOS. Play takes 15–30%.
- **User Choice Billing** — India-only, Razorpay *alongside* Play Billing at a reduced fee.
  Not instead of it.

Confirm current terms with Play directly; this policy has moved repeatedly in India.

#### ~~No build config~~ — BUILT 2026-08-31. Needs your EAS account to run.
- **`eas.json` added** with three profiles: `development` (dev client, APK — this is what
  Google sign-in and invite deep links need, per 8c), `preview` (internal APK for testers) and
  `production` (**app-bundle**, which is what Play wants).
- **`"appVersionSource": "remote"` and `autoIncrement` on production.** Play rejects a
  re-upload whose versionCode has not increased, and EAS then owns that number so nobody has
  to remember. `android.versionCode: 1` and `ios.buildNumber: "1"` are set in app.json as the
  starting point EAS initialises from.
- **`expo-doctor` found a real bug while doing this**, and it was the kind that only shows up
  in a real build: `expo-asset` was a missing peer dependency of `expo-audio`, warned as
  *"Your app may crash outside of Expo Go without this dependency."* Installed. **18/18 checks
  now pass** — worth re-running before any store upload.
- ⚠️ **`play-service-account.json` is now gitignored** (along with `*-service-account.json`,
  `google-services.json`, `GoogleService-Info.plist`). That file is a Google Cloud key that
  can publish to your Play listing; `eas.json` points at it by path, so without the ignore
  rule the natural next step would have been to drop a publishing credential into the repo.
- **No keys are in `eas.json`.** The three `EXPO_PUBLIC_*` values the app needs at build time
  are not committed — see the steps below.

**What you need to do before the first build:**

> ⚠️ **Step 1 is a one-way-ish decision: whoever owns the Expo account owns every build and
> store submission.** This machine is already logged in as **`mis.orangeotec@gmail.com`**
> (accounts `misorangeotec` and `misorangeotecs-team`) — a different identity from the
> `Yieldd2care` GitHub org and the `yieldd.co` Workspace. **You chose 2026-08-31 to create a
> new, Yieldd-specific account** rather than reuse those, so the app is not tied to another
> business's login. That is the mistake #8a records for the Google OAuth client, which now
> sits under a personal Gmail and controls sign-in for the entire product.

1. **Create the Expo account** at expo.dev using a `@yieldd.co` address, then in a terminal:
   `npx eas-cli login` (interactive — it has to be you, not me). `npx eas-cli whoami` should
   then show the new account. **Tell me when that is done and I will run step 2.**
2. `eas init` — links this project to that account and writes the project id into app.json.
3. Set the build-time env vars once, on EAS (dashboard → Environment Variables, or
   `eas env:create`). All three are **plaintext, not secret** — the anon key is designed to be
   public and already ships in the yieldd.co web bundle:
   `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_CARD_BASE_URL`.
4. `eas build --profile development --platform android` — this is the build that finally lets
   you test **Google sign-in** and **invite deep links**, neither of which can work in Expo Go.
5. For Play: `eas build --profile production --platform android`, then Play Console → create
   the app → upload. `eas submit` automates the upload once you have a service-account key
   (Play Console → Setup → API access), saved as `play-service-account.json`.
- **`expo-dev-client` is not installed yet** — the `development` profile needs it. `npx expo
  install expo-dev-client` when you get to step 4. Left out for now because it is only needed
  for that profile and adds a dependency nothing else uses.

#### Fixed on 2026-08-31
- **Dead legal links, all live in the app until now:** Settings → Privacy policy and Terms of
  service opened `yieldd.co/privacy` and `/terms`, which **404’d**; the signup screen showed
  both underlined with no handler at all; the website footer labels were inert. Apple rejects
  under 5.1.1 for exactly this. Pages built and every link wired.
- **`expo-audio` had no microphone purpose string** — a bare plugin entry, so iOS got a
  generic default while camera, photos and contacts all had proper ones. Voice notes record
  audio. Fixed in `app.json`.
- **Contacts permission was requested and never used.** `lib/contacts.ts` asked for contacts
  access, then only called `presentFormAsync`, which hands the contact to the system’s own
  new-contact screen and needs no permission on either platform. READ_CONTACTS sat in the
  manifest for nothing, and Play makes you justify it at review. Request removed;
  READ_CONTACTS and WRITE_CONTACTS added to `android.blockedPermissions`.
- **Photo library READ access was requested and never used.** Both save-to-gallery calls asked
  for full read+write but only ever call `saveToLibraryAsync`. That pulls in READ_MEDIA_IMAGES,
  which Play restricts and for which "so we can save a picture" is not an accepted reason. Now
  `requestPermissionsAsync(true)` — write-only — in both places. The `photosPermission` string
  still exists because `expo-image-picker` genuinely reads the library for the card photo, but
  it now describes that rather than a dashboard image it never showed.
- **App Links were claimed but never backed.** `app.json` claimed `yieldd.co/invite` with
  `autoVerify` on Android and `associatedDomains` on iOS, but no `assetlinks.json` or
  `apple-app-site-association` existed anywhere — so every invite ever sent opened the website
  instead of the app, silently, because a failed App Link looks exactly like a normal link.
  Both files added under `public/.well-known/` (confirmed to reach the web export), and
  `vercel.json` now forces `Content-Type: application/json` on the Apple file, which has no
  extension and would otherwise be served as text and ignored.
  **Still needs you:** the two credentials cannot be invented — the Android SHA-256 signing
  fingerprint (Play Console → Setup → App signing, or `eas credentials`) and the Apple Team ID
  (developer.apple.com → Membership). `npm run verify:applinks` fails until both are real.
#### Not code — done in the consoles at submission time
- Play **Data Safety** form, and Apple **App Privacy** labels. Both must match what the privacy
  policy says, so fill them from that page rather than from memory.
- A registered business address may be wanted; the policy names Growth Saga and care@yieldd.co
  only. Worth checking with whoever reviews it.

---

## Done

### 8. Google sign-in — DONE 2026-08-31
- Project, consent screen, OAuth client, Supabase provider, and **published** — so anyone can
  sign in, not just hand-listed test users. Publishing was blocked until yieldd.co/privacy and
  /terms went live, which they did in the same day’s deploy.
- **Not yet used by anyone.** Worth signing in with a fresh Google account once, to see the
  "Almost there" screen ([app/(app)/onboarding/complete-profile.tsx](app/(app)/onboarding/complete-profile.tsx))
  that collects company and contact number — Google supplies neither. That screen has never
  been seen by a real user and its wording was written blind.
- **Where:** [lib/auth/google.ts](lib/auth/google.ts), [app/(auth)/index.tsx](app/(auth)/index.tsx),
  [app/auth/callback.tsx](app/auth/callback.tsx)
- **Done:** Google Cloud project, consent screen, OAuth client, and the provider enabled on
  Supabase with the Client ID and secret in place. Sign-in works for listed test users.
- **Left:** the consent screen is still in **Testing**, so only emails added under *Audience →
  Test users* can sign in. See 8d for what unblocks **Publish**.

#### 8a. What was actually involved (so it is not rediscovered)
- **The org Google account could not create a project** — `resourcemanager.projects.create`
  denied, and "Parent resource" was a required field. That is the tell for a Workspace-managed
  account. A **personal Gmail** was used instead.
- **Whichever Google account holds the OAuth client controls sign-in for the whole product.**
  Losing that account means nobody can sign in and nobody can fix it.
- The project is named **"My First Project"**, not "Yieldd". Worth knowing before hunting for it.
- **Only one *Web application* client is needed** — no Android client, no iOS client, no SHA-1.
  `signInWithOAuth` sends everyone through Supabase, so Google only ever talks to a website.
- Redirect URI, exactly: `https://azpanagwuskruelbwtvb.supabase.co/auth/v1/callback`
- **`supabase.co` cannot be an Authorised domain** — it is on the Public Suffix List, so Google
  rejects it as "not a top private domain". It is not needed anyway.
- **Never send a client secret through chat.** Paste it straight into Supabase → Authentication
  → Providers → Google. (This file used to say the opposite. It was wrong.)
- **Already done, so it does not need redoing:** the Supabase redirect allow list
  (`https://yieldd.co/auth/callback`, `yieldd://…`, and the localhost variants for dev), the
  PKCE flow, and the `/auth/callback` route.
#### 8b. What happens the first time someone uses it
- Google hands over a name and an email and **nothing else** — no phone number, no company.
  Left alone, that person would land in an organisation literally named "My workspace" with no
  number on their digital card.
- So a Google sign-in goes to a short **"Almost there"** screen
  ([app/(app)/onboarding/complete-profile.tsx](app/(app)/onboarding/complete-profile.tsx))
  asking for company and contact number, before the app opens. Then on to the usual
  team-or-solo question.
- **Enforced in the `(app)` layout**, not just by routing — force-quitting on that screen is not
  a way past it.
- **You will not see it:** your own account already has a contact number.
- Revisit this screen's wording and design when Google is actually switched on.

#### 8c. Needs a dev build
Google sign-in cannot work inside Expo Go — the `exp://<LAN IP>` redirect changes with the
network and cannot be allow-listed. The button says so plainly rather than failing oddly. Same
requirement invite deep links already have.

#### 8d. Publish app — the pages are live, the form is yours to fill
Google will not move an External app out of Testing without a **home page link** and a
**privacy policy link** on the Branding page. Both pages were built on 2026-08-31
([app/(web)/privacy.tsx](app/(web)/privacy.tsx), [app/(web)/terms.tsx](app/(web)/terms.tsx))
but they are only live once master is deployed.

**Once yieldd.co/privacy is live:** Google Cloud → Branding → home page `https://yieldd.co`,
privacy `https://yieldd.co/privacy`, Authorised domain `yieldd.co` → Save → Audience →
**Publish app** becomes clickable.

"Publish app" has nothing to do with the Play Store. It only decides whether anyone can sign
in, or only hand-listed emails.

### 10. A false duplicate warning on every capture
- **Where:** [app/(app)/capture/confirm.tsx](app/(app)/capture/confirm.tsx),
  [app/(app)/(modals)/duplicate-detail.tsx](app/(app)/(modals)/duplicate-detail.tsx)
- **Was:** the "Possible duplicate — Captured by Amit Shah · 2 days ago" strip had
  **no condition on it at all**. It rendered on every capture the app has ever
  made, and the sheet behind it was hardcoded down to a fake quote about a
  company called Northline. This was wrong information on screen, not a missing
  feature.
- **Fixed 2026-08-31:** the strip now appears only on a real match, and the sheet
  shows who actually captured the contact, when, and what they wrote.
- **The reason it could never have worked:** the `find_duplicate_lead` function
  compared phone numbers as exact strings, while leads are stored with whatever
  the rep typed. `9820441720` and `+91 98204 41720` are the same person and
  matched nothing. Migration `20260831090000` compares the last 10 digits
  instead. It was **not** fixed by rewriting the stored numbers — that column is
  what the dialler dials and what the customer's own copy of the export shows.
- **"Merge into existing lead" is gone.** It merged nothing, and a real one would
  need a second privileged write-door into another rep's data.
- Checked by `npm run verify:duplicate` — 31 checks against the live database,
  including that an unauthenticated caller is still refused.

### 1. Auth screens — logo too small / wrong asset
- **Where:** [app/(auth)/index.tsx](app/(auth)/index.tsx)
- **Was:** the stacked, near-square lockup was being rendered inside a 130×43 box with
  `resizeMode="contain"`, so it was fitted to the height and drew about 50 px wide.
- **Fixed 2026-08-28:** swapped to the horizontal secondary lockup at 184×55 — its own
  264×79 aspect ratio, so nothing is letterboxed.
- **Asset note:** the supplied `yieldd-secondary-lockup.png` has an opaque near-black
  background baked in, which would have shown as a rectangle over the navy and the gold glow.
  A transparent version was generated from it at
  [assets/brand/yieldd-secondary-lockup-transparent.png](assets/brand/yieldd-secondary-lockup-transparent.png)
  and that is what the screen uses. The original file is untouched.
  (`assets/brand/transparenet secondary logo.png` was not used — its background was keyed out
  badly and the letters carry visible artefacts.)

### 2. Onboarding fork routed to Create Event instead of Home
- **Where:** [app/(app)/onboarding/fork.tsx](app/(app)/onboarding/fork.tsx)
- **Was:** tapping **Team** on the solo-vs-team question went straight into Create Event, walling a brand-new user off from the rest of the app before they had an event.
- **Fixed 2026-08-28:** Team now lands on **Home**. Solo still goes to the card builder, which is that path's actual onboarding and was not reported as a problem — say if it should also land on Home.
- **Note:** the screen moved during the auth work — it now lives at `app/(app)/onboarding/fork.tsx`, not `app/(auth)/fork.tsx`, so that the signed-in guard on `(auth)` cannot bounce a just-signed-up user off it.

### 3. "Your setup for this event" screen showed hardcoded content
- **Where:** [app/(app)/events/new/complete.tsx](app/(app)/events/new/complete.tsx)
- **Was:** a fixed IMTEX 2026 example — every wizard step kept its answers in local state, so
  the last screen had nothing real to show.
- **Fixed 2026-08-28:** added [stores/useEventDraftStore.ts](stores/useEventDraftStore.ts), which
  every step now writes to. The summary renders the event name, city, the real date range, the
  number of reps actually invited and the total of all seven cost lines.
- **Details worth knowing:** a skipped step says "Not added yet" rather than showing ₹0, which
  would read as a real answer; step 1 and step 2 now re-open pre-filled, so "Edit event details"
  from the last screen works; and the draft is cleared on "Go to home" so the next event does not
  inherit this one's answers.

### 4. Contact number must be mandatory at account creation
- **Where:** [app/(auth)/index.tsx](app/(auth)/index.tsx)
- **Fixed 2026-08-28:** the create-account form has a contact-number field between Company and
  Email, required alongside the others. Validated for at least 10 digits, normalised to
  `+91…` when a bare Indian mobile is typed ([lib/phone.ts](lib/phone.ts)), and written to
  `profiles.phone` by the signup trigger (migration `20260828100000_signup_phone.sql`).
- **An invited rep** who leaves it blank inherits the number the admin typed on the invite screen.
- **Google sign-in cannot supply one**, so anyone arriving that way is sent to
  [app/(app)/onboarding/complete-profile.tsx](app/(app)/onboarding/complete-profile.tsx) before
  they can reach the app — enforced in the `(app)` layout, so force-quitting is not a way past it.

### 5. Settings — removed the chevron from the profile info block
- **Where:** [app/(app)/(tabs)/profile.tsx](app/(app)/(tabs)/profile.tsx)
- **Fixed 2026-08-28:** the arrow is gone; the block is display-only.
- **Also corrected while there:** it said "Admin" for everyone regardless of role. It now shows
  the person's designation when they have one, and falls back to their actual role.

### 6. Lead detail — Reassign button
- **Where:** [app/(app)/leads/[id].tsx](app/(app)/leads/[id].tsx),
  [app/(app)/(modals)/reassign.tsx](app/(app)/(modals)/reassign.tsx)
- **Fixed 2026-08-28:** the row now shows who the lead is actually assigned to, and an admin
  can tap **Reassign** to pick any active team member.
- **Deliberate choices:** only an admin sees the action — a rep who could reassign could move a
  lead off their own name after a bad outcome, which is what the leaderboard is not for; and
  deactivated members are not offered, since a lead parked on them would be nobody's.

---

## Card scanning reworked: capture first, read afterwards (2026-09-15)

**Done.** The confirm screen is gone. A rep photographs a card, adds a voice note,
the event's custom fields and an optional product photo, and submits. The card is
read by the sync drain, not on screen — so a capture made with no signal is
complete work that finishes itself when the network returns.

New: `app/(app)/capture/details.tsx`, `app/(app)/capture/processing.tsx`,
`components/capture/VoiceRecorder.tsx`, `hooks/useVoiceRecorder.ts`,
`hooks/useConnectivity.ts`, `lib/captureFiles.ts`, `lib/leadDisplay.ts`,
`lib/connectivity.ts`. Deleted: `app/(app)/capture/confirm.tsx` — its company
fields and the **AI company summary** moved to `app/(app)/leads/edit.tsx`, which
is now the only place that feature is reachable from.

### The second-photo trap above is CLOSED

The earlier entry decided the back of the card would be "read and discarded"
rather than pay for a second column plus four storage-policy amendments. The
product photo is different — it is the rep's own work and nothing can reproduce
it — so migration `20260915100000_lead_extra_photo.sql` pays that cost:
`leads.extra_photo_path`, all four `card_images_*` policies widened to
`(card_image_path = name or extra_photo_path = name)`, and partial indexes on
both columns, which **nothing had before** — every signed-URL batch had been a
sequential scan of `leads` since the bucket existed.

`npm run verify:extra-photo` guards it. The check that matters most is the
card-only lead with a NULL `extra_photo_path`: if the added disjunct mishandled
NULL, that is every card image in the product, not just new ones.

**The back of the card is still never uploaded.** It now rides on the draft as
`StoredLead.localBackImageUri` purely so the extraction can still read both
sides, and is dropped the moment extraction is done with it.

### Five rules in `syncDrafts` that look like details and are not

1. A transient extraction failure **`continue`s, never `break`s**. The insert's
   `break` is right because "the rest will fail the same way" — true of a dead
   connection, false of a rate-limited `extract-card`. Breaking there would
   strand every other lead's insert, photo, recording and queued edit.
2. Extracted fields are written to the device **before** the insert is
   attempted, so a transient insert failure cannot cause the same card to be
   read — and billed — twice.
3. `addLead` now passes `syncDrafts(input.capturedBy)`. Without it the drain
   skips its ownership filter and would spend a billed read on a capture
   belonging to whoever was signed in before. RLS refuses the insert, but that
   refusal arrives after the money is gone.
4. The guard is strictly `extractionStatus === 'pending'`, a value only the new
   `addLead` writes. Drafts queued before this change carry `undefined`, skip
   extraction entirely, and keep the name the rep typed by hand.
5. The drain does not extract while offline. Three dead attempts would push a
   perfectly readable card into the "gave up" bucket for a reason that was never
   about the card.

### Files are copied out of the OS cache at capture time

`lib/captureFiles.ts`. Previously the photo lived in `Paths.cache` and losing it
cost a photo — the rep had already typed the name. Now the name comes only from
the photo, so an eviction would be total, silent loss of a lead. Everything is
copied into `{document}/captures/`, renamed to `captures/{leadId}/` once an id
exists, and deleted once all four local URIs have cleared. `useCaptureDraftStore`
is persisted for the same reason, and its header comment explains why the old
"deliberately not persisted" reasoning reversed.

### Known gap, accepted by the product owner

**Nothing proof-reads the card reader.** A card that reads confidently but wrongly
gets no warning anywhere; only a card that fails completely is marked. Asked and
answered on 2026-09-15: no review step. `app/(app)/leads/review.tsx` already
exists and is the cheapest place to add one if this bites.

### Unrelated, found while running the suite

`npm run verify:duplicate` fails at **fixture setup**, not on anything it tests:
it invites a second rep into a fresh org, and the seat-limit trigger from
`20260910100000` refuses because a new org has `seats_included = 1`. Pre-dates
this work. The fixture needs to grant itself a seat before inviting.
