import { supabase } from '../supabase';
import { readAsBase64 } from '../files';

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
};

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
    },
  };
}
