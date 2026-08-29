# PENDING — Corrections To Do

Running list of app corrections that are **reported but not yet fixed**.
When asked "what is pending?", read this file.

Status legend: `[ ]` pending · `[~]` in progress · `[x]` done (move to Done section)

---

## Open

### 7. "Forgot password?" — password reset not built
- **Where:** sign-in screen — [app/(auth)/index.tsx](app/(auth)/index.tsx)
- **Was:** the link was on screen but only raised an "isn't connected yet" alert. Deferred on
  2026-08-28 by your call, so the link has been **removed** rather than left promising something
  that does not happen.
- **What building it actually needs** (it is a small project, not a button):
  - the client is already on `flowType: 'pkce'` and `detectSessionInUrl` on web, so that half is done;
  - a recovery route exempted from the `(auth)` signed-in guard, the way `app/auth/callback.tsx` is;
  - the recovery URL added to the Supabase redirect allow list;
  - an email template and a working SMTP sender — the project currently runs on Supabase's
    built-in mailer, which is rate-limited to a handful of messages an hour and is not
    something to launch on.
- **Until then:** someone locked out has to be reset by an admin.

### 8. Google sign-in — switch it on (deferred by your call, 2026-08-28)
- **Where:** [lib/auth/google.ts](lib/auth/google.ts), [app/(auth)/index.tsx](app/(auth)/index.tsx),
  [app/auth/callback.tsx](app/auth/callback.tsx)
- **The code is finished and wired.** Only the provider is still off on Supabase, because
  enabling it needs credentials that only you can create. Nothing in the app changes when it
  is turned on — the button simply starts working.

#### 8a. Create the Google OAuth client (about 5 minutes, needs you)
1. Google Cloud Console → APIs & Services → Credentials → **Create OAuth client ID** → *Web application*.
2. Authorised redirect URI — exactly this, nothing else:
   `https://azpanagwuskruelbwtvb.supabase.co/auth/v1/callback`
3. Send over the **Client ID** and **Client secret**; enabling the provider from there is a
   one-command change on my side.
- **Already done, so it does not need redoing:** the Supabase redirect allow list
  (`https://yieldd.co/auth/callback`, `yieldd://…`, and the localhost variants for dev), the
  PKCE flow, and the `/auth/callback` route.
- **Until then:** tapping the button says *"Google sign-in is not switched on for this app yet."*
  It checks first rather than navigating — a disabled provider makes Supabase answer with a raw
  JSON error page that strands the person with no way back.

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
- **Company summary (AI)** — the button says it is not switched on. It used to
  invent a sentence about a real company and label it AI-generated. The key is
  available; this is simply not built yet.
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
- **Digital business card and the public card page** — still on a local store.
- ~~Excel export~~ — **built 2026-08-29, as CSV rather than .xlsx.** The only
  `xlsx` package on npm is 0.18.5 from 2022 with known prototype-pollution and
  ReDoS advisories, and a file of customers' phone numbers is not the place to
  accept that. CSV opens natively in Excel, Sheets and Tally; the screen says
  CSV rather than implying a format it does not produce.
- **Payments** — the whole of Phase 4.

---

## Done

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
