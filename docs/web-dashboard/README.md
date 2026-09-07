# Yieldd web dashboard — screen designs

Eleven desktop admin screens: Home, Leads, Lead detail, Events, Event dashboard, Event ROI, Follow-ups, Team, Templates, Export, Settings.

**These are mockups, not implementation.** Nothing here is wired to Supabase and none of it ships in the app. They exist to settle what the web dashboard looks like before it gets built.

Live canvas: https://claude.ai/code/artifact/a87f6ff3-9e93-4951-8160-7e5ac414c351

## What governed the design

Styling was lifted from the real app, not invented — `tailwind.config.js` and `components/ui/*`:

| Token | Value | Where it came from |
|---|---|---|
| Page background | `#F5F7FB` | `section` |
| Card | white, `1px #E3E7EF`, radius 16 | `components/ui/Card.tsx` |
| Primary button | `#F4B000`, radius 10, `0 10px 26px rgba(244,176,0,0.34)` | `components/ui/Button.tsx` |
| Dark stat panel | `#101C3E` | `navy.elevated` |
| Pills | rounded-full, active `#0B132B` / inactive `#EEF1F7` | `app/(app)/(tabs)/leads.tsx` |
| Micro-label | 9.5px, 700, 0.08em, uppercase | `leads.tsx` |
| Type | Inter 400/500/600/700/800 | `app/_layout.tsx` |

The information architecture (persistent left sidebar, wide tables with bulk select) follows Popl's dashboard — see `../competitors/popl-dashboard-teardown.md`. Only the shape was borrowed.

## Scope rule

**Only features Yieldd already has.** Every screen maps to something in the schema today:

- Home / Event dashboard → `event_stats`, `event_hourly_capture`, `event_leaderboard`, `active_event_count`
- Leads / Lead detail → `leads`, `lead_activity`, `voice_notes`, `message_sends`
- Event ROI → the seven event cost columns + `total_cost_paisa`
- Team → `profiles`, `event_members`, `invites`
- Templates → `message_templates`, and only the six real merge tokens
- Lead detail custom fields → `event_custom_field_defs`

Deliberately **not** included, because Yieldd does not have them: tags, card view/link-tap analytics, CRM sync, subteams, enrichment credits, email signatures, billing.

Names, companies and figures throughout are sample data.

## Editing

The canvas is editable in the browser at the link above. To change the source here instead, edit the `.dc.html` files and re-seed the canvas; `canvas.json` holds the layout.
