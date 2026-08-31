import { supabase } from '../supabase';

/**
 * Deleting your own account.
 *
 * Required by both app stores — Apple 5.1.1(v) and Google Play's data-deletion
 * policy — and irreversible, so the flow is two steps on purpose: ask what
 * would happen, show the person that answer, and only then act on it. Nobody
 * should learn the scope of this after the fact.
 *
 * Which outcome applies is decided by the server, not here, because it depends
 * on who else is in the organisation and the client cannot see that reliably.
 */

export type DeletionPreview = {
  /**
   * `org` — nobody is left to run the organisation, so all of it goes.
   * `handover` — another admin remains and inherits this person's work.
   */
  mode: 'org' | 'handover';
  organizationName: string | null;
  /** Leads deleted (org) or handed to the surviving admin (handover). */
  leadsAffected: number;
  eventsDeleted: number;
  /** Colleagues whose logins go too. Only ever non-zero in `org` mode. */
  membersDeleted: number;
};

type PreviewRow = {
  mode: 'org' | 'handover';
  organization_name: string | null;
  leads_affected: number;
  events_deleted: number;
  members_deleted: number;
};

/**
 * `types/database.ts` is generated from the deployed database, and
 * `account_deletion_preview` arrives with migration `20260831120000`, which is
 * not applied yet — so the generated union does not contain its name.
 *
 * Once the migration is live, run `npm run db:types` and delete this: the call
 * below then type-checks on its own.
 */
type UntypedRpc = (
  fn: string
) => Promise<{ data: PreviewRow | null; error: { message: string } | null }>;

export async function previewAccountDeletion(): Promise<
  { ok: true; preview: DeletionPreview } | { ok: false; message: string }
> {
  const { data, error } = await (supabase.rpc as unknown as UntypedRpc)(
    'account_deletion_preview'
  );

  if (error || !data) {
    if (__DEV__) console.warn('[deleteAccount] preview', error);
    return { ok: false, message: "Couldn't check what would be deleted. Try again in a moment." };
  }

  const row = data;
  return {
    ok: true,
    preview: {
      mode: row.mode,
      organizationName: row.organization_name,
      leadsAffected: Number(row.leads_affected ?? 0),
      eventsDeleted: Number(row.events_deleted ?? 0),
      membersDeleted: Number(row.members_deleted ?? 0),
    },
  };
}

/**
 * Actually deletes it. `confirm` must be the word DELETE — checked here so the
 * round trip is not wasted, and again on the server, because the screen that
 * asks for it is not the only way to reach the function.
 */
export async function deleteAccount(
  confirm: string
): Promise<{ ok: true; storageFailures?: string[] } | { ok: false; message: string }> {
  if (confirm.trim().toUpperCase() !== 'DELETE') {
    return { ok: false, message: 'Type DELETE to confirm.' };
  }

  const { data, error } = await supabase.functions.invoke<{
    deleted?: boolean;
    storageFailures?: string[];
    error?: string;
    partial?: boolean;
  }>('delete-account', { body: { confirm } });

  if (error) {
    const context = (error as { context?: Response })?.context;
    let message = 'Could not delete the account. Nothing was changed.';
    try {
      const parsed = await context?.json();
      if (parsed?.error) message = parsed.error;
    } catch {
      /* Keep the default. */
    }
    if (__DEV__) console.warn('[deleteAccount]', error);
    return { ok: false, message };
  }

  if (!data?.deleted) {
    return { ok: false, message: data?.error ?? 'Could not delete the account.' };
  }

  // The session belongs to a user that no longer exists. Clearing it locally
  // stops the app retrying with a token that can only fail.
  await supabase.auth.signOut().catch(() => {
    /* Already invalid — the sign-out is housekeeping, not the point. */
  });

  return { ok: true, storageFailures: data.storageFailures };
}
