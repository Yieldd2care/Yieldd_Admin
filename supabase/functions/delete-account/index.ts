// Deletes the caller's account, and the whole organisation if nobody is left
// to run it.
//
// Apple 5.1.1(v) and Google Play both refuse an app that can create an account
// but not delete one, so this is not optional. It is also irreversible, which
// is why the ordering below is exact rather than convenient.
//
// The work is split because the schema forces it:
//
//   1. `perform_account_deletion()` — one transaction. Moves or deletes
//      everything that is ON DELETE RESTRICT against a profile, and hands back
//      the auth user ids that are now free to go.
//   2. storage — the buckets keep no foreign keys, so nothing else will ever
//      clean these files up. If this is skipped the rows vanish and the
//      business card photos and voice recordings quietly stay.
//   3. the admin API deletes the logins, which cascades the profiles away.
//   4. the organisation row last, because profiles.organization_id is RESTRICT
//      and it could not have gone earlier.
//
// Storage is deliberately step 2, not step 4: once the logins are gone nobody
// can retry, so the files that need permission to find are cleared while the
// database still knows where they are.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';

/** `{organization_id}/…` — see lib/api/storage.ts for who writes these. */
const ORG_BUCKETS = ['card-images', 'voice-notes', 'template-attachments'];
/** `{profile_id}/…` — the digital business card photo. */
const PROFILE_BUCKET = 'card-photos';

type Plan = {
  mode: 'org' | 'handover';
  organization_id: string;
  user_ids: string[];
  handed_over_to: string | null;
};

/**
 * Empties one prefix. Returns how many objects went, or null if the listing
 * itself failed — a distinction worth keeping, because "nothing there" and
 * "could not look" must not report the same thing to someone who just asked
 * for their data to be erased.
 */
async function emptyPrefix(
  service: ReturnType<typeof createClient>,
  bucket: string,
  prefix: string
): Promise<number | null> {
  let removed = 0;

  // A prefix holds one file per lead or per voice note, so an organisation
  // that worked a busy show can hold thousands. Paged rather than assuming.
  for (let page = 0; page < 50; page++) {
    const { data, error } = await service.storage
      .from(bucket)
      .list(prefix, { limit: 100, offset: 0 });

    if (error) {
      console.error('storage list', bucket, prefix, error.message);
      return null;
    }
    if (!data || data.length === 0) break;

    const paths = data.map((entry) => `${prefix}/${entry.name}`);
    const { error: removeError } = await service.storage.from(bucket).remove(paths);
    if (removeError) {
      console.error('storage remove', bucket, prefix, removeError.message);
      return null;
    }

    removed += paths.length;
    if (data.length < 100) break;
  }

  return removed;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

  if (!supabaseUrl || !serviceKey || !anonKey) {
    console.error('project environment is incomplete');
    return jsonResponse({ error: 'Account deletion is not configured.' }, 503);
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  const caller = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: auth } = await caller.auth.getUser();
  if (!auth?.user) return jsonResponse({ error: 'Not signed in.' }, 401);

  // Typing the word is checked on the server too. The confirmation screen can
  // be skipped by anyone calling this directly, and this is not a request to
  // action on a stray tap.
  let body: { confirm?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Expected a JSON body.' }, 400);
  }
  if ((body.confirm ?? '').trim().toUpperCase() !== 'DELETE') {
    return jsonResponse({ error: 'Deletion was not confirmed.' }, 400);
  }

  const service = createClient(supabaseUrl, serviceKey);

  // Step 1 — one transaction. Runs as the caller so auth.uid() is them; the
  // function is security definer, so it still sees past RLS.
  const { data: planRaw, error: planError } = await caller.rpc('perform_account_deletion');
  if (planError || !planRaw) {
    console.error('perform_account_deletion', planError);
    return jsonResponse({ error: 'Could not delete the account. Nothing was changed.' }, 500);
  }
  const plan = planRaw as Plan;

  // Step 2 — files. Failures are collected rather than thrown: the account
  // still has to go, but the person is told the truth about what is left.
  const storageFailures: string[] = [];

  if (plan.mode === 'org') {
    for (const bucket of ORG_BUCKETS) {
      if ((await emptyPrefix(service, bucket, plan.organization_id)) === null) {
        storageFailures.push(bucket);
      }
    }
  }
  for (const userId of plan.user_ids) {
    if ((await emptyPrefix(service, PROFILE_BUCKET, userId)) === null) {
      storageFailures.push(`${PROFILE_BUCKET}/${userId}`);
    }
  }

  // Step 3 — the logins. Cascades the profiles, event memberships and
  // business cards with them.
  const failedUsers: string[] = [];
  for (const userId of plan.user_ids) {
    const { error } = await service.auth.admin.deleteUser(userId);
    if (error) {
      console.error('deleteUser', userId, error.message);
      failedUsers.push(userId);
    }
  }

  if (failedUsers.length) {
    // The data is already gone, so reporting success would be a lie, and so
    // would "nothing happened". Say exactly where it stopped.
    return jsonResponse(
      {
        error:
          'Your data was deleted but the login could not be removed. Please contact care@yieldd.co.',
        partial: true,
      },
      500
    );
  }

  // Step 4 — the organisation, now that nothing references it.
  if (plan.mode === 'org') {
    const { error } = await service.from('organizations').delete().eq('id', plan.organization_id);
    if (error) console.error('organization delete', error.message);
  }

  return jsonResponse({
    deleted: true,
    mode: plan.mode,
    storageFailures: storageFailures.length ? storageFailures : undefined,
  });
});
