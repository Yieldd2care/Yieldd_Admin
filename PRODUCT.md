# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

## Users

Two roles, one app: **reps** and **admins** at Indian trade shows and exhibitions (industrial/manufacturing-heavy — IMTEX, Plastindia, Auto Expo, IITF are the named reference shows). Reps capture leads on the show floor in seconds, often in low- or no-signal halls. Admins use the same mobile app with role-gated screens: they set up an event before the show, watch live counts during it, and review ROI after — specifically the ~9pm moment, at dinner, on a phone.

## Product Purpose

An offline-first exhibition lead-capture and event-ROI platform. It captures every lead in seconds (scan a card, manual entry, or a voice note), cleans and enriches it automatically, sends the first follow-up before the visitor leaves the stall, and produces a cost-per-lead/ROI dashboard the admin can screenshot and forward to their MD. Success means a lead that would otherwise die on a business card in a blazer pocket instead becomes tracked, followed-up pipeline with a real, attributable ROI number.

## Positioning

Purpose-built for the Indian trade-show floor, not a generic CRM: works fully offline (never waits on network at a crowded venue), captures a lead in about 4 seconds without waiting on OCR to finish, ties every lead back to a specific event's real cost so ROI is a genuine percentage rather than a lead count, and follows up over WhatsApp — the channel this market actually uses — rather than email. The free hosted digital business card doubles as the product's own distribution loop.

## Operating Context

Three real moments the whole product is designed around: (1) the 4-second capture at the booth, mid-conversation; (2) the ~10-minute evening review ritual where a rep clears the day's incomplete leads; (3) the admin's 9pm ROI check, at dinner, on a phone. Multi-day trade shows, hundreds of leads per rep, unreliable venue connectivity. On a team account, an admin sets up an event (cost, custom fields, WhatsApp message templates) before the show and invites reps by WhatsApp link; a rep tapping that link skips straight into the event.

## Capabilities and Constraints

- Offline-first: captures save locally first and sync later; the rep never waits on network or OCR to proceed to the next screen.
- Card OCR extraction and voice-note transcription/summarization happen server-side, asynchronously, after sync — never blocking the capture flow.
- Multi-tenant via Supabase RLS: reps see only their own captured/assigned leads by default; admins see everything in their org's event.
- Exactly two roles — rep and admin. No other role types.
- Free/Pro plan tiers gate specific features (voice notes past 3 per event, a second concurrent event, the follow-up pipeline, the ROI dashboard, custom fields, team invites). Gated features render greyed and visible, never hidden.
- A lead marked "Won" requires a deal value — enforced at the database level, not just in the UI.
- WhatsApp is the primary distribution, invite, and follow-up channel for this market; email invites are explicitly assumed to go unopened.
- Payment is UPI via Razorpay (India), not Stripe. Congested venue networks are expected to make payment occasionally fail; failure states must reassure the user that no money was taken.
- Deactivating a team member must never delete their captured leads — reassign or hold at admin level. Sales-rep turnover in this segment is high.
- Export target is Excel specifically (not just CSV) — this customer segment already lives in Excel.
- No web admin dashboard by design. The admin uses the same mobile app as reps, role-gated, because their actual moment of use (9pm, on a phone) doesn't need one.

## Brand Commitments

Name: **Yieldd**. Support email: care@yieldd.co. "A product by Growth Saga" appears as a footer line on the auth screen. An established navy/gold visual system is already in production use across the approved screens — do not replace it, extend it:

- `--navy:#0B132B` `--navy-elevated:#101C3E` `--blue:#1D3F8A` `--gold:#F4B000` `--gold-hover:#FFC53D`
- `--slate:#5A6B87` `--hairline:#E3E7EF` `--section:#F5F7FB` `--surface:#EEF1F7` `--label:#8A98B0` `--ink-muted:#3C4C68` `--success:#4ED17F` `--placeholder:#97A3B8`
- Typeface: Inter only, weights 400/500/600/700/800 — no secondary typeface.
- Real brand assets live at `assets/brand/` (transparent lockup + mark).

This system was confirmed/approved by the user section-by-section across the landing page, auth screen, and onboarding flows already shipped.

## Evidence on Hand

- Live marketing site at yieldd.co — landing page approved section-by-section.
- Real, already-approved in-app screens (Expo Router routes, not just mockups): Auth (sign up/sign in), Fork (team vs. solo), Home tab shell, digital business-card flow (edit/share/first-scan), full event setup wizard (create/cost/invite/fields/templates/complete).
- Full 41-screen UI spec at `ui-development-plan-v1.md` — the plan of record for every screen's purpose/shows/user-can bullets.
- Qualitative product rationale at `MVP_PLAN.md` (the three moments that decide the product, explicit risk callouts).
- Live Supabase schema at `DATABASE_SCHEMA.md` / `supabase/migrations/` (14 tables, RLS policies, helper functions) — currently ahead of the app; most UI isn't wired to real data yet.
- Engineering task breakdown at `TASKS.md`, cross-referencing UI-plan screen codes to real file paths and DB tables.
- An existing multi-artboard Claude Design canvas and its `.dc.html` sources at `design/yieldd-app-screens/` (see that folder's own README.md), including a stakeholder-facing status tracker artifact.
- No customer testimonials, case studies, or press exist yet — none should be fabricated.

## Product Principles

- Never make the rep wait: capture is instant; extraction and transcription always happen after the fact, never blocking the screen.
- Offline is the default assumption of the venue, not a fallback mode.
- A gated Pro feature stays visible and greyed, never hidden — the user should always see what exists.
- Design the three moments that decide adoption (4-second capture, evening review, 9pm ROI check) with more care than any ordinary form screen.
- Meet this market where it already works: WhatsApp for invites and follow-up, UPI for payment, Excel for export.

## Accessibility & Inclusion

No project-specific accessibility requirement has been established beyond the standard mobile touch-target floor (44px+) already used across the built screens.
