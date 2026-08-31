# PENDING — Corrections To Do

Running list of app corrections that are **reported but not yet fixed**.
When asked "what is pending?", read this file.

Status legend: `[ ]` pending · `[~]` in progress · `[x]` done (move to Done section)

---

## Open

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

#### Google Play billing — DECIDE BEFORE BUILDING PHASE 4
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

#### No build config — cannot produce a Play upload yet
- No `eas.json` anywhere, and `app.json` has no `android.versionCode`.
- Play rejects a re-upload whose versionCode has not gone up, so set
  `"appVersionSource": "remote"` in eas.json and let EAS manage it.

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
