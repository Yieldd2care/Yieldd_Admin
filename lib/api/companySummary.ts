import { supabase } from '../supabase';

/**
 * A short summary of a company, written from that company's own website.
 *
 * The website comes off the business card — `extract-card` reads it, and the
 * rep can correct it on the confirm screen before pressing the button. With no
 * website there is nothing to read and nothing honest to say, so the caller is
 * told that rather than being handed a paragraph the model made up.
 *
 * The work happens in the `summarise-company` Edge Function: fetching a URL
 * that came out of OCR is not something to do from the device, and the result
 * is cached per domain so one exhibitor's site is read once for the whole team.
 */

export type CompanySummaryResult =
  | { ok: true; summary: string; cached: boolean }
  | { ok: false; message: string; retryable: boolean };

type FunctionResponse = {
  summary?: string;
  cached?: boolean;
  sources?: string[];
  reason?: string;
  error?: string;
  retryable?: boolean;
};

/**
 * supabase-js turns any non-2xx into an error and throws the body away, but
 * the body is where the readable message is. It hangs off `context` as the
 * original Response.
 */
async function bodyOfError(error: unknown): Promise<FunctionResponse | null> {
  const context = (error as { context?: unknown })?.context;
  if (!context || typeof (context as Response).json !== 'function') return null;
  try {
    return (await (context as Response).json()) as FunctionResponse;
  } catch {
    return null;
  }
}

export async function summariseCompany(input: {
  website: string;
  companyName?: string;
  /** Set by "Regenerate" — otherwise a cached summary comes straight back. */
  refresh?: boolean;
}): Promise<CompanySummaryResult> {
  const website = input.website.trim();
  if (!website) {
    return {
      ok: false,
      message: 'This lead does not have a company website.',
      retryable: false,
    };
  }

  const { data, error } = await supabase.functions.invoke<FunctionResponse>(
    'summarise-company',
    {
      body: {
        website,
        company_name: input.companyName ?? '',
        refresh: input.refresh ?? false,
      },
    }
  );

  if (error) {
    const body = await bodyOfError(error);
    if (__DEV__) console.warn('[companySummary]', error, body);
    return {
      ok: false,
      message: body?.error ?? "Couldn't reach the summary service. Try again in a moment.",
      retryable: body?.retryable ?? true,
    };
  }

  // The function answers 200 with a reason when the site was reachable but had
  // nothing to say — that is an outcome, not a failure, and it is not retried.
  if (!data?.summary) {
    return {
      ok: false,
      message: data?.error ?? "Couldn't read anything useful from their website.",
      retryable: false,
    };
  }

  return { ok: true, summary: data.summary, cached: Boolean(data.cached) };
}
