# UI Development Plan — Phase 1

**Product:** Offline-first exhibition lead capture + event ROI platform
**Version:** 1.0
**Status:** Screen inventory for build estimation

---

## Table of contents

1. [Scope and platform decisions](#1-scope-and-platform-decisions)
2. [Screen inventory summary](#2-screen-inventory-summary)
3. [Group A — Web (pre-auth and public)](#3-group-a--web-pre-auth-and-public)
4. [Group B — Signup](#4-group-b--signup)
5. [Group C — Onboarding: solo path](#5-group-c--onboarding-solo-path)
6. [Group D — Onboarding: admin path](#6-group-d--onboarding-admin-path)
7. [Group E — Core capture](#7-group-e--core-capture)
8. [Group F — Lead management](#8-group-f--lead-management)
9. [Group G — Follow-up and pipeline](#9-group-g--follow-up-and-pipeline)
10. [Group H — Admin visibility](#10-group-h--admin-visibility)
11. [Group I — Monetization](#11-group-i--monetization)
12. [Group J — Settings and account](#12-group-j--settings-and-account)
13. [Shared components](#13-shared-components)
14. [Empty and error states](#14-empty-and-error-states)
15. [Deliberately not in Phase 1](#15-deliberately-not-in-phase-1)

---

## 1. Scope and platform decisions

**Three surfaces, not one.**

| Surface | Contains | Notes |
|---|---|---|
| **Mobile app** | Everything after signup | The product. Offline-first. |
| **Marketing web** | Landing, pricing | Static, no auth |
| **Hosted card page** | Public digital business card | Public URL, no auth, must render on any device |

**Decision made:** there is **no web admin dashboard** in Phase 1. The admin checks live counts and ROI on his phone, per the journey. A web dashboard is a real Phase 2 request but doubles the front-end surface, and the admin's actual moment of use — 9pm, at dinner, on a phone — does not need one.

**Decision made:** the admin uses the same mobile app as the rep, with role-gated screens. No separate admin app.

**Total screen count: 41** — 3 web, 38 in-app. Of the 38, roughly 12 are genuinely complex; the rest are forms, lists, or confirmations.

---

## 2. Screen inventory summary

| Group | Screens | Count |
|---|---|---|
| A — Web (pre-auth and public) | Landing, pricing, hosted card | 3 |
| B — Signup | Phone, OTP, name/company, fork | 4 |
| C — Onboarding: solo | Card builder, card preview, share, first scan prompt | 4 |
| D — Onboarding: admin | Create event, event cost, invite reps, custom fields, templates, setup complete | 6 |
| E — Core capture | Home/scan, camera, confirm, duplicate detail, manual entry, voice record, save confirmation | 7 |
| F — Lead management | Lead list, lead detail, evening review, bulk select, send handoff | 5 |
| G — Follow-up and pipeline | Today's follow-ups, log outcome, status change, deal value entry | 4 |
| H — Admin visibility | Event list, event dashboard, ROI dashboard, export | 4 |
| I — Monetization | Free limit sheet, upgrade modal, payment success, payment failure | 4 |
| J — Settings and account | Settings, profile edit, team management | 3 |

---

## 3. Group A — Web (pre-auth and public)

### A1. Landing page

**Purpose:** convert a cold admin into a signup, and give WhatsApp arrivals a low-commitment door.

**Shows:** spend-led headline · 20-second product video above the fold · three proof blocks (works offline, voice becomes summary, every lead tied to event cost) · pricing summary · two CTAs of unequal weight.

**User can:** start free (primary) · make a digital card free (secondary, smaller) · view the video without a form · reach the pricing page.

> **Rule:** the demo is never gated behind a form.

### A2. Pricing page

**Purpose:** answer "what does it cost" without a sales call, and pre-frame the number against stall spend.

**Shows:** headline framing price against brochure cost · Free and Pro plan cards · three arithmetic framings (per show, per lead, against the stall) · four-question FAQ.

**User can:** start free · begin Pro checkout · open WhatsApp to sales via the two-shows-a-year FAQ answer.

> Copy is locked in the monetization copy deck. The ₹10,000 single-event price never appears here.

### A3. Hosted digital card page

**Purpose:** the public artifact a visitor lands on after scanning a rep's QR. Also the product's main distribution loop.

**Shows:** name, designation, company, photo, contact details · save-to-contacts button · small "make your own card, free" link.

**User can:** save vCard to phone · tap to call, WhatsApp, or email · follow the link to sign up.

> Must render correctly with no app installed, on any browser, on a slow connection. This page is seen by more people than any other screen in the product.

---

## 4. Group B — Signup

### B1. Phone number entry

**Purpose:** start the account with the identity this market actually uses.

**Shows:** country code (defaulted to +91), phone field, continue button, one line on why we use phone.

**User can:** enter number and request OTP.

### B2. OTP verification

**Purpose:** verify the number.

**Shows:** six-digit entry, number being verified, resend timer.

**User can:** enter code · resend after timeout · edit the number.

> Auto-read the SMS where the OS permits. A rep on a train should not be switching apps.

### B3. Name and company

**Purpose:** the minimum needed to personalise everything downstream, including the digital card.

**Shows:** two fields, both required.

**User can:** enter name and company, continue.

### B4. Fork question

**Purpose:** the single branch that routes all onboarding.

**Shows:** the question — setting this up for a team, or just yourself — as two large tap targets.

**User can:** choose team (admin path) or solo.

> Rep invite deep links bypass B3 and B4 entirely — the rep OTPs in and lands directly inside the event they were invited to.

---

## 5. Group C — Onboarding: solo path

### C1. Digital card builder

**Purpose:** deliver something the user owns within 90 seconds of signup.

**Shows:** pre-filled name and company · fields for designation, mobile, optional photo · live preview.

**User can:** fill three fields · add a photo · skip the photo · save.

### C2. Card preview with QR

**Purpose:** show the user the thing they just made.

**Shows:** finished card, QR code visible, share button prominent.

**User can:** share · edit · continue.

### C3. Share sheet

**Purpose:** trigger the distribution loop.

**Shows:** native OS share sheet, WhatsApp surfaced first.

**User can:** send the card link to anyone. Most send it to themselves or a colleague, which is exactly what we want.

### C4. First scan prompt

**Purpose:** get the user to experience core capture before they lose interest.

**Shows:** one line inviting them to scan a business card from their wallet · scan button · skip.

**User can:** open the camera and run their first capture · skip to home.

---

## 6. Group D — Onboarding: admin path

### D1. Create event

**Purpose:** an admin with no event has bought nothing. This is the screen that must not be abandoned.

**Shows:** event name with autocomplete against a pre-loaded list of major Indian shows (IMTEX, Plastindia, Vibrant Gujarat, Auto Expo, IITF) · city · start and end date.

**User can:** select a known show or type a new one · set dates · continue.

> The pre-loaded list does double duty: selecting beats typing, and it signals that we know this industry.

### D2. Event cost

**Purpose:** capture the number the entire ROI feature depends on, at the moment the admin is most motivated.

**Shows:** five optional fields (stall, fabrication, travel, staff, marketing) · running total · framing line explaining this is what produces the ROI number.

**User can:** enter any or all costs · skip and add later · continue.

> Skippable, but make skipping feel like a loss. Without this number the dashboard is just a lead count.

### D3. Invite reps

**Purpose:** get the team into the event before the show, not during it.

**Shows:** name and phone rows, add-another control, count of invites to be sent.

**User can:** add reps · remove a row · send invites via WhatsApp · skip.

> Invites go by WhatsApp only. Email invitations will not be opened.

### D4. Custom fields

**Purpose:** let the admin capture what his industry actually needs, without making him design a form.

**Shows:** three or four pre-built field templates (product interest, order quantity, buying timeline) · option to add a custom field · field type selector (dropdown, text, number).

**User can:** enable a template set · add up to five custom fields · reorder · skip.

### D5. Message templates

**Purpose:** make the admin aware the follow-up feature exists, and give reps a default they will actually use.

**Shows:** pre-written WhatsApp template with merge fields · same for email · both editable.

**User can:** accept the defaults · edit either · skip.

> Most admins accept the default. That is a success, not a failure — the point is awareness.

### D6. Setup complete

**Purpose:** close the loop and set the offline expectation.

**Shows:** summary of event, team size, cost entered · one line confirming everything works without network.

**User can:** go to home · invite more reps · edit the event.

> **Target for D1–D6: four minutes.** If it runs to twelve, cut fields.

---

## 7. Group E — Core capture

This group is the product. Every other group can be adequate; these seven must be excellent.

### E1. Home / scan

**Purpose:** get the rep from pocket to capture in one tap, and reassure him the app works in this hall.

**Shows:** large offline-ready banner · one dominant SCAN button · today's capture count · current event name · small entry points to leads and follow-ups.

**User can:** scan · switch to manual entry · open the lead list · open follow-ups · switch event.

> One screen, one button. Nothing else competes for the thumb.

### E2. Camera capture

**Purpose:** get the image and get out.

**Shows:** live camera with card-shaped guide · shutter · torch toggle.

**User can:** capture · retake · cancel.

> **The image is stored and the screen advances immediately.** Extraction happens afterwards. The rep never waits for OCR. This is the single most important interaction decision in the build.

### E3. Confirm lead

**Purpose:** let the rep correct what the AI got wrong, in two taps, without reading carefully.

**Shows:** extracted fields (name, company, designation, phone, email) · custom fields · consent toggle · duplicate flag if triggered · voice note button · save.

**User can:** edit any field · toggle consent · record a voice note · save · discard.

> Fields populate progressively as extraction completes. If extraction hasn't finished, the rep can still save — fields fill in later.

### E4. Duplicate detail

**Purpose:** turn a duplicate from an error into the product's best small moment.

**Shows:** who captured this contact, when, and their note or transcript summary.

**User can:** read the earlier note · continue with the new capture · merge into the existing lead.

> Read access only, and only at the moment a duplicate fires. Reps do not browse each other's leads.

### E5. Manual entry

**Purpose:** capture the visitor who has no card, as fast as scanning.

**Shows:** name and phone as the only required fields, large · everything else collapsed below.

**User can:** enter name and number in 15 seconds · expand for more fields · attach a voice note · save.

> Reachable in one tap from home. Never buried in a menu.

### E6. Voice note recording

**Purpose:** capture the conversation before it evaporates.

**Shows:** press-and-hold or tap-to-start control · elapsed timer · waveform or simple level indicator.

**User can:** record · stop · play back · re-record · delete.

> Audio is stored on-device. Transcription and summarisation happen server-side after sync. The rep is never blocked.

### E7. Save confirmation

**Purpose:** confirm the capture and return to scanning.

**Shows:** brief confirmation with the lead name · running count for the day.

**User can:** return to scan (automatic after a moment) · open the lead just saved.

> On a free account at lead 101, the free limit sheet appears here — **after** this confirmation renders, never instead of it.

---

## 8. Group F — Lead management

### F1. Lead list

**Purpose:** the rep's view of what he has captured at this event.

**Shows:** leads in reverse chronological order · name, company, capture time · status pill · indicators for voice note attached and note missing · filter and search.

**User can:** open a lead · filter by status or "needs a note" · search · multi-select · switch event.

> Reps see their own leads by default. Admins see all leads in the event.

### F2. Lead detail

**Purpose:** everything known about one lead, on one screen.

**Shows:** all captured fields · card image · voice note with playback, transcript, and summary · consent status · assignment history · status · follow-up date · activity log.

**User can:** edit fields · play or re-record voice · change status · set follow-up date · call · WhatsApp · email · save to phone contacts · reassign (admin only).

### F3. Evening review

**Purpose:** the ten-minute ritual everything downstream depends on. If this screen is slow or vague, the CRM and ROI layers get no data.

**Shows:** a specific, finite, closeable number — today's captures and how many need a note · queue of incomplete leads, one at a time.

**User can:** step through incomplete leads · add or fix notes · correct garbled names · mark hot, warm, or cold · set follow-up dates · exit at any point.

> **Target: under 10 minutes for 47 leads.** Design this screen with the same care as the scan screen. It is the second of the three moments that decide the product.

### F4. Bulk select and send

**Purpose:** eight follow-up messages in ninety seconds.

**Shows:** selectable lead list · running count of selected · template preview · channel choice (WhatsApp or email).

**User can:** select multiple leads · choose channel · preview and override the template · start the send queue.

### F5. Send handoff

**Purpose:** manage the deep-link queue, since the OS controls the actual send.

**Shows:** progress through the queue · which lead is next · skip and cancel controls.

**User can:** send each message · skip one · cancel the batch · resume later.

> `wa.me` and `mailto:` hand off to the native app. The rep taps send there and returns; the app queues the next. Log each send against the lead.

---

## 9. Group G — Follow-up and pipeline

### G1. Today's follow-ups

**Purpose:** the reason a rep opens the app in the week after a show, when he was expecting nothing.

**Shows:** count of follow-ups due today · each entry with lead name, company, **the transcript summary of what was said at the booth**, and a call button · overdue items surfaced separately.

**User can:** call · WhatsApp · open the lead · log an outcome · defer.

> The booth conversation summary on this screen is what makes the follow-up feel informed rather than cold. It is the payoff for the whole voice feature.

### G2. Log outcome

**Purpose:** one-tap logging, because anything longer will not happen.

**Shows:** outcome options (connected, no answer, not interested, meeting set) · optional note · next follow-up date picker with quick presets.

**User can:** select outcome · add a note · set the next date · save.

### G3. Status change

**Purpose:** move a lead through the pipeline.

**Shows:** five states — new, contacted, qualified, won, lost · current state highlighted.

**User can:** change status. Selecting Won opens G4.

### G4. Deal value entry

**Purpose:** capture the number that turns cost-per-lead into actual ROI.

**Shows:** value field, currency-formatted · optional close date and note.

**User can:** enter value · confirm · cancel back to previous status.

> **Value is required on Won, not optional.** An admin seeing "3 deals won, ₹0 attributed" concludes the product is broken.

---

## 10. Group H — Admin visibility

### H1. Event list

**Purpose:** switch between events and see the portfolio.

**Shows:** events with dates, lead count, status (upcoming, live, closed) · create event.

**User can:** open an event · create one · edit · archive.

> On Free, one active event; creating a second triggers the upgrade modal.

### H2. Event dashboard

**Purpose:** the live view during the show. This is the admin's 10:30am moment.

**Shows:** total leads today and cumulative · rep-wise count · leaderboard (admin-toggleable per event) · last-sync timestamp · capture rate by hour.

**User can:** drill into a rep's captures · toggle the leaderboard's visibility to reps · refresh.

> State counts as "as of last sync." An admin in a dead zone will otherwise assume a rep has stopped working.

### H3. ROI dashboard

**Purpose:** the 9pm screen. He bought the product for this and never touches the scan screen.

**Shows:** event cost · total leads · cost per lead · deals won and value attributed · ROI percentage · pipeline value by status · rep-wise split.

**User can:** edit event cost · drill into any number · export · share as an image.

> **Make this screenshot-friendly.** The admin will send it to his MD, and that is free distribution to someone who did not buy it.

### H4. Export

**Purpose:** get the data out, in the format this customer already lives in.

**Shows:** scope selector (event, date range, status) · field selector · format (Excel).

**User can:** configure and generate · share the file via WhatsApp, email, or Drive.

> Export is the switching-cost reducer. It makes trying the product feel reversible, which is why it is not locked on Free.

---

## 11. Group I — Monetization

Copy for all four is locked in the monetization copy deck.

### I1. Free limit sheet

**Purpose:** convert at lead 101, mid-rush, mid-success, without ever blocking work.

**Shows:** dismissible bottom sheet · confirmation the lead saved · what needs Pro · price.

**User can:** open the upgrade modal · dismiss and keep scanning.

> Appears after the save confirmation renders. Repeats every 25 leads, not every lead.

### I2. Upgrade modal

**Purpose:** one modal, four triggers.

**Shows:** variable headline by trigger · shared body with Pro price, feature list, per-show framing · three actions.

**User can:** pay with UPI · open WhatsApp to sales · dismiss for the session.

> **Build once with a variable headline block.** Four triggers, one screen. Do not design four upsell screens.

### I3. Payment success

**Purpose:** confirm and get him back to work.

**Shows:** confirmation · what is now unlocked · single dominant button back to scanning · note about receipt and GST invoice.

**User can:** return to scanning · view the invoice in settings.

### I4. Payment failure

**Purpose:** recover a customer who had already decided to pay.

**Shows:** what happened · explicit confirmation that nothing was lost and no money was taken · retry.

**User can:** retry · switch payment method · contact sales on WhatsApp · dismiss.

> Copy not yet written. UPI on a congested venue network will fail more often than in testing — this screen will be seen more than you expect.

---

## 12. Group J — Settings and account

### J1. Settings

**Purpose:** the container for everything infrequent.

**Shows:** profile · team (admin) · plan and billing · GST invoices · notification preferences · sync status and manual sync · storage used · support via WhatsApp · logout.

**User can:** navigate to any of the above · force a sync · contact support.

### J2. Profile and card edit

**Purpose:** maintain the digital card after onboarding.

**Shows:** the same fields as the builder · live preview · public card URL · QR.

**User can:** edit fields · replace photo · copy the link · re-share · download the QR.

### J3. Team management

**Purpose:** admin control over who is in the account.

**Shows:** user list with role, status, seat count against plan limit · pending invites.

**User can:** invite · resend an invite · change role · deactivate.

> Deactivating a user must never delete their leads. Reassign or hold at admin level, but keep the data. Sales turnover in this segment is high.

---

## 13. Shared components

Not screens, but each needs designing once and appears throughout.

| Component | Where it appears | Notes |
|---|---|---|
| **Offline / sync indicator** | Persistent, all in-app screens | Green when synced or cleanly offline. Visible only when it needs attention. Sync is invisible unless it fails. |
| **Event context bar** | Capture and lead screens | Which event am I capturing into. Prevents the single worst data error in the product. |
| **Consent toggle** | Confirm lead, manual entry | Timestamped, stored against the lead, exportable. |
| **Voice player** | Lead detail, evening review, follow-ups | Playback, transcript, summary, re-record. |
| **Status pill** | Lead list, lead detail, dashboards | Five states, one colour system. |
| **Upgrade trigger** | Four locations | Calls I2 with a trigger parameter. |

---

## 14. Empty and error states

Cheap to skip, expensive to omit. Each needs one line of copy and one action.

- **No leads yet** — on lead list, before the first capture
- **No follow-ups today** — the good-news empty state, not a failure
- **No event created** — admin has skipped setup
- **Extraction failed** — card unreadable; offer manual entry with the image attached
- **Camera permission denied** — with a path to settings
- **Microphone permission denied** — same
- **Sync failed** — what failed, what is safe, retry. Never imply data loss.
- **Payment pending verification** — UPI can hang; state it plainly
- **Free plan, feature locked** — greyed rather than hidden, so the user knows what exists

---

## 15. Deliberately not in Phase 1

Listed so nobody assumes they were forgotten.

**Screens:** web admin dashboard · kiosk / self-capture mode · catalogue microsite · lead scoring view · cross-event comparison · notification centre · in-app chat support · onboarding tour or coach marks.

**Behaviours:** territory or team hierarchy management · custom role permissions · lead routing rules · approval workflows · activity quotas · multi-card profiles · NFC share · card themes or branding · view analytics on the hosted card.

---

## Build order note

The three screens that decide the product are **E2/E3 (four-second capture)**, **F3 (evening review)**, and **H3 (ROI dashboard)**. If the schedule compresses, protect the polish on those three and let the forms in Groups D and J be plain.
