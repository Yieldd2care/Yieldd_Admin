import type { LeadStatus } from '../data/leads';

/**
 * The rules for showing a lead's deal value on the detail screens (PENDING 71).
 *
 * Out here rather than inside the screens because the phone and the dashboard
 * both render the same row, and two JSX copies of "who sees money, and what is
 * it called" is how they drift apart. scripts/verify-lead-edit.mjs compiles
 * THIS FILE standalone, so it must keep no runtime imports — the type import
 * above is erased at compile time.
 */

export type DealValueLabel = 'Expected value' | 'Deal value';

/**
 * What the row is called, by status — so a forecast is never mistaken for
 * revenue. New, Contacted and Lost get null: no row at all, never a blank one.
 */
export function dealValueLabel(status: LeadStatus): DealValueLabel | null {
  if (status === 'Qualified') return 'Expected value';
  if (status === 'Won') return 'Deal value';
  return null;
}

/**
 * Who sees the value: an admin on any lead, and a rep on a lead that is theirs
 * — captured by them or assigned to them. There is no column recording who
 * actually typed the amount, and none is to be added; capture/assignment is
 * the honest proxy, and it is the same shape the server already uses (see
 * 20260915100000_lead_extra_photo.sql).
 *
 * This is a UI rule, NOT a security boundary. `deal_value_paisa` is not
 * column-gated on `leads` — a rep's row read still carries it; money is
 * enforced server-side in the export function and the stats functions. It
 * does, however, match who may WRITE: RLS `leads_update_own_or_admin` gates
 * on exactly these three identities, so everyone shown the pencil can save.
 *
 * The `userId != null` guard is load-bearing: without it a missing user id
 * against a missing capturedBy would match (undefined === undefined) and show
 * the row to nobody-in-particular.
 */
export function canSeeDealValue(args: {
  isAdmin: boolean;
  userId: string | undefined;
  capturedBy: string | undefined;
  assignedToId: string | undefined;
}): boolean {
  if (args.isAdmin) return true;
  if (args.userId == null) return false;
  return args.capturedBy === args.userId || args.assignedToId === args.userId;
}

/** Only the digits count — people type "4,20,000" and "Rs 420000" alike.
 *  Returns rupees; 0 means "nothing usable", which every caller refuses. */
export function parseDealValueInput(raw: string): number {
  return parseInt(raw.replace(/[^\d]/g, ''), 10) || 0;
}

/**
 * The one decision both screens render from: the row's label, or null for no
 * row at all.
 *
 * Null when the status carries no value (New/Contacted/Lost), when the viewer
 * is not admin-or-owner, and when the value itself is missing or zero. The
 * last case is real, not defensive: `leads_qualified_requires_value` is
 * NOT VALID, so a lead Qualified before 2026-09-02 can hold NULL until its
 * next status touch — and a ₹0 row is the exact thing item 71 exists to avoid.
 */
export function dealValueRow(args: {
  status: LeadStatus;
  dealValue: number | undefined;
  isAdmin: boolean;
  userId: string | undefined;
  capturedBy: string | undefined;
  assignedToId: string | undefined;
}): { label: DealValueLabel } | null {
  const label = dealValueLabel(args.status);
  if (label == null) return null;
  if (!canSeeDealValue(args)) return null;
  if (args.dealValue == null || args.dealValue <= 0) return null;
  return { label };
}
