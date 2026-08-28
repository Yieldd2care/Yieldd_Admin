import { supabase } from '../supabase';
import type { Enums, Tables, Updates } from '../db';

type OrgRow = Tables<'organizations'>;

export type Organization = {
  id: string;
  name: string;
  planTier: Enums<'org_plan_tier'>;
  /**
   * How many people can hold an active seat.
   *
   * `seats_included` is what the plan comes with (1 on Free — the admin alone)
   * and `seats_purchased` is what has been paid for on top. The old screen
   * showed a flat "of 10", which is not a number this product sells.
   */
  seats: number;
  seatsIncluded: number;
  seatsPurchased: number;
  category: string | null;
  onboardingIntent: string | null;
};

function toOrganization(row: OrgRow): Organization {
  return {
    id: row.id,
    name: row.name,
    planTier: row.plan_tier,
    seats: row.seats_included + row.seats_purchased,
    seatsIncluded: row.seats_included,
    seatsPurchased: row.seats_purchased,
    category: row.category,
    onboardingIntent: row.onboarding_intent,
  };
}

export async function fetchOrganization(): Promise<Organization | null> {
  // RLS scopes this to the caller's own organisation, so no filter is needed
  // and adding one would only be a second place for the two to disagree.
  const { data, error } = await supabase.from('organizations').select('*').maybeSingle();
  if (error) throw error;
  return data ? toOrganization(data as OrgRow) : null;
}

/** `category` and `onboarding_intent` are the only columns a client may write. */
export async function updateOrganization(
  id: string,
  patch: { name?: string; category?: string | null; onboardingIntent?: string | null }
): Promise<void> {
  const row: Updates<'organizations'> = {};
  if (patch.name !== undefined) row.name = patch.name.trim();
  if (patch.category !== undefined) row.category = patch.category;
  if (patch.onboardingIntent !== undefined) row.onboarding_intent = patch.onboardingIntent;

  const { error } = await supabase.from('organizations').update(row).eq('id', id);
  if (error) {
    if (error.code === '42501') throw new Error('Only an admin can change company settings.');
    throw new Error("That didn't save. Check your connection and try again.");
  }
}
