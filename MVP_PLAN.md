# MVP Plan — Phase 1

**Product:** Offline-first exhibition lead capture + event ROI platform
**Version:** 1.0
**Status:** Locked scope for build

---

## Table of contents

1. [Product overview](#1-product-overview)
2. [Finalized MVP features](#2-finalized-mvp-features)
3. [Detailed user journey](#3-detailed-user-journey)
4. [Monetization plan](#4-monetization-plan)

---

## 1. Product overview

### Vision, in one line

> **Every lead captured in four seconds, every exhibition measured in rupees.**

### The pain point

An Indian B2B manufacturer spends ₹8–15 lakh on a single exhibition stall. Over a year, four to fifteen shows. It is one of the largest lines in the marketing budget.

At the end of it, the leads sit in a paper register or an Excel sheet typed up a week late. The conversation that happened at the booth — what the buyer actually wanted, what he objected to, when to call him back — exists only in the memory of whichever rep was standing there.

Two consequences follow, and both cost real money:

| Problem | What it costs |
|---|---|
| **Context dies at the booth** | Follow-ups happen days late, without memory of the conversation. A competitor who called on day one has already had the meeting. |
| **Spend cannot be measured** | The promoter cannot answer "did that show pay for itself?" Digital marketing has dashboards. Exhibitions have a stack of cards — which is why exhibition budgets get cut first in a bad year, regardless of whether they worked. |

### What we are building

A mobile app that works with no network, captures a lead from a visiting card in four seconds with a spoken note attached, and gives the person who signed the stall cheque a live ROI number against that event.

### Who it is for

- **The Admin** — promoter or marketing head of a B2B SME. Buys it. Wants proof and visibility. Rarely touches the scan screen.
- **The Rep** — booth staff. Uses it eight hours a day. Didn't choose it. Has 90 seconds per visitor. Distrusts apps in halls because they have failed him before.
- **The Solo user** — single rep or small trader on the free tier. Our acquisition wedge.

---

## 2. Finalized MVP features

### The five that define the product

Everything in the build maps to one of these five sentences. Anything that doesn't, gets cut.

| # | Feature | The sentence it earns |
|---|---|---|
| **1** | **Offline-first lead capture** | *Speed at the booth.* Card scan with AI extraction, manual entry, editable confirm screen, sync queue. |
| **2** | **Voice notes with transcript + summary** | *Context that survives the show.* |
| **3** | **Event and team layer** | *Control for the boss.* Events, roles, assignment, reassignment, custom fields. |
| **4** | **One-click WhatsApp follow-up** | *Same-day contact.* Deep-link based, with consent captured at scan. |
| **5** | **Event ROI dashboard + Excel export** | *Proof the spend was worth it.* |

### Full feature list by layer

#### Foundation
- Offline-first storage with sync queue
- Event as the container for every lead
- Multi-user with admin / rep roles

#### Capture
- Card scan → AI extraction → editable confirm screen
- Manual entry (must be as fast as scanning)
- Voice note: recorded on-device, transcribed and summarised server-side after sync
- Consent toggle, timestamped
- Admin-configurable custom fields
- Save lead to phone contacts
- Duplicate detection across reps within an event

#### Work
- Lead assignment and reassignment
- Status pipeline with deal value on Won
- Follow-up date + "Today's follow-ups" list

#### Communication
- Per-event WhatsApp and email templates — admin-set, rep-overridable
- One-click send via `wa.me` and `mailto:` deep links

#### Visibility
- Event cost input
- Cost per lead
- ROI dashboard
- Live scan count by rep + leaderboard
- Excel export

#### Identity
- Digital business card — profile, hosted page, QR, vCard

### Explicitly out of scope for Phase 1

WhatsApp Business API and automation · AI lead scoring and enrichment · Show intelligence digest · Voice AI · Catalogue microsites with engagement tracking · NFC sharing · Cross-event benchmarking · Native CRM integrations

Each of these carries a dependency — BSP onboarding, template approval, thin Indian enrichment data, or a customer base we don't yet have — that would extend the timeline without proportionate return in v1.

### Build sequence

1. **Foundation** — events, users, roles, offline sync. Nothing else until sync is reliable, because every later feature writes through it.
2. **Capture** — scan, manual entry, custom fields, confirm screen, consent, save-to-contacts. At the end of this step the product is demoable.
3. **Voice** — recording, then the transcription pipeline.
4. **Work layer** — assignment, status, follow-ups, duplicates.
5. **Communication + dashboard + export** — fast, because the data already exists.
6. **Digital business card** — last, deliberately. The only item fully independent of everything above, so the only one that can be cut late without breaking anything.

### Two known risks

**Voice transcription on a noisy floor.** Code-mixed Gujarati/Hindi/English at 85dB is the one genuine unknown in this build. Every other item is conventional engineering with a predictable cost. Test real hall audio during step 1, not step 3. Judge success on whether the *summary* is useful, not whether the transcript is word-perfect — the rep can always replay the original audio.

**Digital business card scope creep.** Logos, themes, colour pickers, view analytics, NFC, multi-card — each is a reasonable request, none takes long alone, and together they turn a one-week feature into a two-month one. Definition of done is fixed at: **fields, hosted page, QR, vCard.** Everything else is Phase 2.

---

## 3. Detailed user journey

### 3.1 Morning — the show opens

#### Rep, 9:15am, walking to the booth

| Step | What happens | Design rule |
|---|---|---|
| 1 | Opens the app. Synced overnight, everything cached. | **Large green banner: "Ready — works offline."** Reps distrust apps in halls; this single reassurance matters more than it sounds. |
| 2 | Home screen loads. | **One screen, one button: SCAN.** Nothing competing for the thumb. |
| 3 | First visitor. Rep holds the card, taps, camera fires. | **Capture is instant — the image is stored, extraction happens later.** Never make the rep wait for OCR at the booth. This is the single most important interaction decision in the product. |
| 4 | Confirm screen shows extracted fields. Rep glances, taps **Save**. | ~4 seconds elapsed. |
| 5 | Rep taps mic: *"party ne 500 units joiye, price high lagyo, follow up next week."* Releases. | Audio stored locally. Transcription happens after sync. |
| 6 | Back to SCAN. | Ready for the next person. |

#### Admin, 10:30am, in a meeting elsewhere

Opens the app. Live counts: **Rajesh 14 · Priya 9 · Amit 3.**

Amit is on his phone somewhere.

> **This is the moment the admin decides the purchase was worth it.** He now has information he has never had before.

---

### 3.2 Midday — the rush

Roughly **1pm–4pm on days one and two.** Where the product either holds or breaks.

**1. Queue at the booth.**
Three visitors waiting, all reps engaged. Reps scan fast and skip voice notes, promising themselves they'll fill in later. Design the evening screen assuming this happens.

**2. Duplicate flags fire.**
A buyer who spoke to Rajesh on day one returns to Priya on day two. Priya's confirm screen shows: *"Rajesh captured this contact yesterday — view his note?"* She reads it in three seconds and continues a conversation instead of restarting one. Small feature, disproportionate wow effect.

**3. Battery becomes the real enemy.**
Eight hours of camera and microphone will drain a phone by 3pm. Keep background sync attempts minimal, idle screens dark. *A rep whose phone dies stops using the product for the rest of the show — and remembers why.*

**4. Capture without a card.**
Some visitors have none. Manual entry must be as fast as scanning — name and number in 15 seconds — not buried in a menu.

**5. Intermittent connectivity.**
When a bar of signal appears, the queue drains silently. The rep never sees a sync screen and never taps anything. **Sync is invisible unless it fails.**

---

### 3.3 End of day — the ritual that everything depends on

#### Rep, 6:45pm, sitting down for the first time

1. Opens the app. Screen reads: **"You captured 47 leads today. 12 need a note."**
   Not a list of tasks — a specific, finite, closeable number.
2. Taps through the 12. Voice notes have transcribed and summarised. Rep fixes two garbled names, adds notes to leads captured during the rush.
3. **Marks the hot ones.** Three-way tap: hot / warm / cold. Nothing more complex at this hour.
4. **Bulk WhatsApp follow-up.** Selects 8 hot leads, hits send. App opens WhatsApp with the first, pre-filled from the event template. Rep taps send; app queues the next. Eight messages in ~90 seconds.
5. Done. Phone away.

> **Target: under 10 minutes.** If this ritual takes 30, it does not happen — and the CRM and ROI layers have nothing to work with.

#### Admin, 9pm, at dinner

Opens the dashboard. **143 leads today, 312 across the show. Cost per lead ₹3,850 and falling.** Rep-wise split.

He screenshots it and sends it to the MD.

> **The product just got shown to someone who didn't buy it.**

---

### 3.4 Weekly — where exhibition tools usually die

#### Monday

1. Rep opens the app expecting nothing. Sees: **"9 follow-ups due today."** These are the dates he set last week.
2. Each entry shows the lead, **the transcribed summary of what was actually said at the booth**, and a call button. He is not reconstructing from memory or a spreadsheet.
3. He calls, logs the outcome in one tap, sets the next follow-up date.

#### Wednesday

4. Admin reviews. Some leads have had no touch. He reassigns four to a different rep.
   **Reassignment sends a WhatsApp notification** — reps don't check apps unprompted.

#### Friday

5. First deal marked **Won**. Value ₹4,20,000 entered.
6. **The ROI dashboard changes state for the first time:**

   | Event cost | Revenue attributed | ROI |
   |---|---|---|
   | ₹12,00,000 | ₹4,20,000 | −65% and rising |

   The admin now has a live number where he previously had a feeling.

#### Off-season — the structural reality

**~340 days a year, nobody opens the app.** Design for this rather than fighting it.

**Weekly WhatsApp digest, automated, no login required:**

> *"IMTEX: 312 leads · 41 contacted this week · 12 pending · 1 won (₹4.2L) · ROI 35% recovered."*

One message. This is the retention mechanism for the dormant period.

**Renewal** arrives once a year, attached to the year's numbers rather than to an invoice:

> *"Last year: 4 events, ₹47L spent on exhibitions, 1,240 leads, ₹1.8Cr closed. Renew?"*

---

## 4. Monetization plan

### The two plans

| | **Free** | **Pro** |
|---|---|---|
| **Price** | ₹0 | **₹30,000 / year** + GST |
| **Users** | 1 | 5 included · ₹6,000/year each thereafter |
| **Events** | 1 active | Unlimited |
| **Leads** | 100 per event | Unlimited |
| **Voice notes** | 3, then locked | Included |
| **Billing** | — | Annual, upfront |

### What Free gets

- Digital business card — profile, hosted page, QR, vCard. **No limit.**
- Card scan + manual entry, fully offline
- Save lead to phone contacts
- One-click WhatsApp and email via deep link
- Excel export

**Not included:** team features, custom fields, ROI dashboard, follow-up pipeline, unlimited voice.

### What Pro adds

- Voice notes with transcript and summary
- Unlimited events, unlimited leads
- Team: assignment, reassignment, roles, duplicate detection
- Follow-up dates and today's follow-up list
- Status pipeline with deal value
- Custom fields, per-event WhatsApp and email templates
- Event cost, cost per lead, ROI dashboard
- Live scan count and rep leaderboard

### How the price is framed

Never quote a monthly figure. This customer budgets per exhibition, not per month.

| Frame | Number | Use it when |
|---|---|---|
| **Per exhibition** | ~₹5,000 per show for a team doing six a year | Opening a sales conversation |
| **Per lead** | ~₹12 per lead captured, with the conversation attached | Talking to anyone who exhibits heavily — the number improves the more they use it |
| **Against the stall** | 2–3% of a single ₹12 lakh stall | When price resistance appears |

### Why this pricing works

**Anchored to the stall, not to software.** ₹30,000 is less than the printing budget for one show. Never let the conversation drift into comparing against other apps.

**Free is an acquisition engine, not a trial.** The digital card is unlimited on Free deliberately — every visitor who saves a rep's card sees the product and can make their own in two minutes. Meanwhile the 100-lead cap bites naturally: a real exhibitor collects 200–400 at a single show, so anyone serious hits the wall on day two of their first event.

**Voice sits behind the paywall for two reasons.** It is the most distinctive feature, and it is the only one with a real per-use cost — transcription is billed by the minute.

**Annual only, deliberately.** The app is used ~15 days a year. On monthly billing a customer pays for two months and cancels. Annual matches how the customer already budgets, since they plan their exhibition calendar a year ahead.

### The four upgrade moments

In descending order of power.

**1. The 100-lead wall — strongest by far.**
Day one of the first real show, ~2pm. Solo user hits 100 leads mid-rush, actively succeeding, holding a card.

> *"You've hit 100 leads. Unlock unlimited — ₹30,000/year."*

Two non-negotiable rules:
- **Never block the scan.** Let him capture lead 101 and 102. Show the prompt *after* the save, never instead of it. Blocking a rep in a rush converts him into an enemy.
- **One tap to pay. UPI.** He is standing in a hall, not opening a laptop.

**2. The voice lock.**
Three free voice notes, then lock. Once they have heard their own summary appear, taking it away has teeth. Locking at zero fires before they have felt the pain of forgetting a conversation.

**3. The ROI curiosity.**
Free user finishes a show, opens the dashboard, sees lead count only with the ROI panel visible but greyed: *"Add your event cost to see ROI — Pro."* Targets the admin, and fires exactly when they are wondering whether the show was worth it.

**4. The second person.**
Solo user tries to add a colleague → *"Teams start at Pro."* Honest and easy, but rare.

### Sales-room tactics

**Single event: ₹10,000.** Not published on the pricing page; used in the room when a prospect says "we only do two shows a year." Deliberately one-third of annual, so the customer does the arithmetic themselves and concludes that three shows makes annual obvious.

**Discount by structure, not by digits.** For the first ten customers, do not offer ₹22,000 — that reintroduces a random number and teaches the market that the price is soft. Offer *six months free on year one*, or *ten users at the five-user price*. Same value to them; the headline price stays intact.

**Treat ₹30,000 as a hypothesis.** Take it to five exhibitors and watch their faces. If nobody flinches, it is priced too low — a more common mistake than pricing too high.

---

## The three moments that decide everything

If everything else is mediocre and these three are excellent, there is a business here.

| # | Moment | Why |
|---|---|---|
| **1** | **The 4-second capture** | Everything we sell rests on the rep not resenting the app during the rush. |
| **2** | **The 10-minute evening ritual** | If reps skip it, nothing gets qualified, no follow-ups get scheduled, and the CRM and ROI layers have nothing to work with. |
| **3** | **The admin's 9pm dashboard** | He bought it, he renews it, and he never touches the scan screen. One screen, one moment, one feeling: *I made a good decision.* |

Everything else is supporting cast.
