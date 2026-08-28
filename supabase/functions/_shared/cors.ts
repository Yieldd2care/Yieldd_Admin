/**
 * The app calls these functions from a browser on yieldd.co as well as from
 * the native app, so the preflight has to be answered.
 *
 * `authorization` and `apikey` are both listed because supabase-js sends both
 * on every functions.invoke call.
 */
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
