import { supabase } from '../supabase';
import { readAsBase64, readRemoteAsBase64 } from '../files';

/**
 * Reading a business card photo.
 *
 * The call goes to the `extract-card` Edge Function with the image in the
 * request body, not to the card-images bucket. At this point in the flow the
 * lead row does not exist yet, and the bucket's policies join back to the
 * owning lead — so there is nothing in storage to point at. The photo is
 * uploaded later, once the lead has been saved.
 *
 * Nothing is written to the database here. The rep reviews what came back and
 * saves; an extraction that wrote straight through would put a machine's guess
 * in front of a customer with nobody having looked at it.
 */

export type ScannedCard = {
  fullName: string | null;
  designation: string | null;
  company: string | null;
  phone: string | null;
  companyLandline: string | null;
  email: string | null;
  companyWebsite: string | null;
  companyAddress: string | null;
  /** A second address — branch, works or regional office — when the card has one. */
  branchAddress: string | null;
  /**
   * Everything the card printed BEYOND the single values above.
   *
   * Always an array, never null, and empty for the ordinary card - which is
   * also what a client talking to a not-yet-redeployed function sees, since
   * the mapping below coalesces a missing key to []. That is deliberate: the
   * app ships before the function does.
   */
  extraPhones: string[];
  extraEmails: string[];
  extraDesignations: string[];
};

export type ScanResult =
  | { ok: true; fields: ScannedCard; read: boolean }
  | { ok: false; message: string; retryable: boolean };

type FunctionFields = {
  full_name: string | null;
  designation: string | null;
  company: string | null;
  phone: string | null;
  company_landline: string | null;
  email: string | null;
  company_website: string | null;
  company_address: string | null;
  branch_address: string | null;
  extra_phones?: string[] | null;
  extra_emails?: string[] | null;
  extra_designations?: string[] | null;
};

/**
 * The Edge Function's own message, recovered from a thrown transport error.
 *
 * supabase-js wraps every non-2xx in a FunctionsHttpError and hangs the original
 * `Response` off `.context`, so the body has to be read back out by hand. Typed
 * loosely on purpose: this runs on the failure path, and a helper that can itself
 * throw while explaining a failure is worse than no helper.
 *
 * Returns null when there is nothing useful to show, which leaves the caller's
 * generic message in place — a gateway's HTML error page, for instance.
 */
async function messageFromResponse(error: unknown): Promise<ScanResult | null> {
  const context = (error as { context?: unknown } | null)?.context;
  if (!context || typeof (context as Response).json !== 'function') return null;

  const response = context as Response;
  try {
    const body = (await response.json()) as { error?: unknown; retryable?: unknown };
    if (typeof body.error !== 'string' || !body.error.trim()) return null;

    return {
      ok: false,
      message: body.error,
      // The function sets this itself on the replies that have an opinion. For
      // the rest, a 429 or a 5xx is worth another go and a 4xx is not.
      retryable:
        typeof body.retryable === 'boolean'
          ? body.retryable
          : response.status === 429 || response.status >= 500,
    };
  } catch {
    return null;
  }
}

/**
 * `backImageUri` is optional and stays that way.
 *
 * Most cards have nothing useful on the back, so requiring a second photo would
 * slow every capture to buy something that helps a minority of them. When it is
 * supplied both images go up in one call, labelled front and back — two
 * unlabelled photos read as two different cards, and the model then has to guess
 * which address belongs to which.
 *
 * A back photo that cannot be read is dropped rather than failing the scan: the
 * front is the half that carries the name and the number.
 */
export async function scanCard(imageUri: string, backImageUri?: string): Promise<ScanResult> {
  let base64: string;
  try {
    base64 = await readAsBase64(imageUri);
  } catch {
    return { ok: false, message: "Couldn't open that photo.", retryable: false };
  }

  let backBase64: string | undefined;
  if (backImageUri) {
    try {
      backBase64 = await readAsBase64(backImageUri);
    } catch {
      backBase64 = undefined;
    }
  }

  return await requestExtraction(base64, backBase64);
}

/**
 * The half both entry points share: one call to `extract-card`, and the
 * mapping of everything it can answer with.
 *
 * Split out when the retry-from-bucket path arrived. The two callers differ
 * only in where the bytes came from, and duplicating this would have meant two
 * copies of the `error.context` unwrapping below — the subtle part, and the one
 * that already had to be fixed once.
 */
async function requestExtraction(base64: string, backBase64?: string): Promise<ScanResult> {
  const { data, error } = await supabase.functions.invoke<{
    fields?: FunctionFields;
    read?: boolean;
    error?: string;
    retryable?: boolean;
  }>('extract-card', {
    body: {
      image_base64: base64,
      ...(backBase64 ? { back_image_base64: backBase64 } : {}),
      mime_type: 'image/jpeg',
    },
  });

  if (error) {
    // A network failure at a stall is the normal case, not an exception. The
    // rep types the details in and the lead still saves — nothing is lost.
    if (__DEV__) console.warn('[cardScan]', error);

    // But not every `error` here is a network failure, and this is where the
    // function's own messages were being swallowed.
    //
    // supabase-js throws FunctionsHttpError for ANY non-2xx and leaves `data`
    // null, so every deliberate reply the function writes — "That photo is too
    // large.", "Unsupported image type.", "Card reading is busy." — used to land
    // here and be replaced with the generic line below, while the `data?.error`
    // branch underneath could never run. The response is on `error.context`.
    const fromFunction = await messageFromResponse(error);
    if (fromFunction) return fromFunction;

    return {
      ok: false,
      message: "Couldn't read the card. Type the details in instead.",
      retryable: true,
    };
  }

  if (!data?.fields) {
    return {
      ok: false,
      message: data?.error ?? "Couldn't read the card.",
      retryable: Boolean(data?.retryable),
    };
  }

  const f = data.fields;
  return {
    ok: true,
    read: Boolean(data.read),
    fields: {
      fullName: f.full_name,
      designation: f.designation,
      company: f.company,
      phone: f.phone,
      companyLandline: f.company_landline,
      email: f.email,
      companyWebsite: f.company_website,
      companyAddress: f.company_address,
      branchAddress: f.branch_address,
      extraPhones: f.extra_phones ?? [],
      extraEmails: f.extra_emails ?? [],
      extraDesignations: f.extra_designations ?? [],
    },
  };
}

/**
 * Read a card that is already in the bucket, not on this device.
 *
 * The retry path. By the time a rep taps "Read the card again" on a lead whose
 * extraction failed, the sync drain has uploaded the photo and deleted the
 * local copy — so the only remaining copy is the object behind a signed URL.
 *
 * Front only, deliberately. The back of the card is never uploaded (it has no
 * column and no storage policy, see migration 20260915100000), so a retry has
 * strictly less to work with than the first attempt did. That is a real and
 * accepted limitation: paying for a second column and four more policy
 * amendments to improve a retry nobody may ever press is the wrong trade, and
 * the first attempt — the one that had both sides — already happened.
 */
export async function scanCardFromUrl(url: string): Promise<ScanResult> {
  let base64: string;
  try {
    base64 = await readRemoteAsBase64(url);
  } catch {
    // Distinct from the local "Couldn't open that photo": this one is a network
    // failure against the bucket, so it is worth trying again.
    return { ok: false, message: "Couldn't fetch the card photo.", retryable: true };
  }
  return await requestExtraction(base64);
}
