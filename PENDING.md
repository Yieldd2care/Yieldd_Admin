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

**Blocked on you, not on code**

| # | Item | Waiting on |
|---|---|---|
| 11 | Pricing — app publishes the ₹10,000 sales-room price | Your decision on the number |
| 7 | Password reset | A merge to master; until then the emailed link 404s |
| — | App Links | Android SHA-256 fingerprint + Apple Team ID |
| — | EAS build | A Yieldd-owned Expo account (blocks Google sign-in testing) |
| ~~27a~~ | ~~Play billing~~ | **DECIDED 2026-09-08 — sell on yieldd.co only. Not blocked any more; it is now code to remove.** |

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

---

**Play Store legal + billing queue — reported 2026-09-08**

An external review of the published privacy policy and terms. Four blockers plus five
smaller corrections. Every one of them touches **both** the web pages and the app — the app
links to these same pages, and the Play data safety form has to match them word for word.

| Order | # | Correction | Status |
|---|---|---|---|
| 1 | 27a | Play billing — **decided 2026-09-08: sell on web only.** Strip purchase from the app | `[ ]` |
| 2 | 27b | /privacy, /terms, /delete-account must render without JavaScript | `[ ]` |
| 3 | 27c | Deletion section — the link that renders as plain text | `[~]` sentence fixed 2026-09-08, anchor still not an `<a>` |
| 4 | 27d | /delete-account — reachable, self-serve, and named in the data safety form | `[ ]` |
| 5 | 27e | Contacts, camera and microphone are never named in the policy | `[x]` done 2026-09-08 |
| 6 | 27f | Two DPDP rights missing — withdraw consent, nominate | `[x]` done 2026-09-08 |
| 7 | 27g | Terms promise export at any time; the pricing deck locks it behind Pro | `[ ]` |
| 8 | 27h | Verify the no-training claim against the actual Anthropic/Deepgram plan | `[ ]` |

---

## Open

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
