// Reads a business card photo and returns the fields on it.
//
// Called from the confirm screen while the rep is still standing there, before
// the lead row exists — which is why the image arrives in the request body
// rather than being read out of the card-images bucket. The storage policies
// require the owning lead row to exist first (they join back to it), so there
// is nothing in the bucket to read at this point in the flow.
//
// It returns fields; it writes nothing. The rep reviews what came back and
// saves, and the save is what creates the lead. That ordering is deliberate:
// an extraction that wrote straight to the database would put a machine's
// guess in front of a customer without anyone having looked at it.
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
// Chosen on measurements, not on instinct — `npm run compare:card-models`.
// Over 7 card types x 3 runs (168 fields each):
//
//   claude-sonnet-5             168/168   ~3.0s
//   claude-haiku-4-5-20251001   163/168   ~2.5s   misread a company name on a
//                                                 decorative script font, the
//                                                 same way on every run
//   claude-opus-5               168/168   ~3.6s   no better, and slower
//
// Haiku's half-second saving costs a wrong company name, and a wrong value is
// worse than a blank one — the rep proof-reads a blank field but not a filled
// one. Opus buys nothing over Sonnet. Input tokens are ~1,700 either way
// because the image dominates, so cost tracks the per-token rate, not usage.
// Override with the CARD_MODEL secret if that trade ever changes.
const MODEL = Deno.env.get('CARD_MODEL') ?? 'claude-sonnet-5';

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
// 10 MiB decoded, matching the card-images bucket's own limit. Base64 is ~4/3
// of the bytes it encodes.
const MAX_BASE64_LENGTH = Math.ceil((10 * 1024 * 1024 * 4) / 3);

const SYSTEM_PROMPT = `You read business cards and return what is printed on them.

Return ONLY a JSON object, no prose and no code fence, with exactly these keys:

  full_name        the person's name
  designation      their job title
  company          the company name
  phone            their mobile or direct number
  company_landline a switchboard or office number, if separate from phone
  email            their email address
  company_website  the company's website
  company_address  the postal address as printed, on one line

Rules that matter more than completeness:

- Use null for anything not printed on the card. Never guess, never infer a
  company from an email domain, never complete a partial address.
- Copy text exactly as printed, including spelling and capitalisation of names.
- A tagline or line of business printed under the company name is not part of
  the company name. "NORTHLINE ENGINEERING" above "PRECISION CASTINGS" is a
  company called Northline Engineering.
- Indian mobile numbers are ten digits and often printed with a +91, a 0, or
  spaces. Keep the digits exactly as they are; keep a leading + if printed.
- If two numbers are printed, the mobile goes in phone and the landline or
  office number goes in company_landline. If only one is printed, it is phone.
- If the card is unreadable, blank, or is not a business card, return every
  field as null rather than inventing plausible values.`;

type Extracted = {
  full_name: string | null;
  designation: string | null;
  company: string | null;
  phone: string | null;
  company_landline: string | null;
  email: string | null;
  company_website: string | null;
  company_address: string | null;
};

const EMPTY: Extracted = {
  full_name: null,
  designation: null,
  company: null,
  phone: null,
  company_landline: null,
  email: null,
  company_website: null,
  company_address: null,
};

/** Keeps only the eight known keys, and turns blanks into null. */
function normalise(raw: Record<string, unknown>): Extracted {
  const clean = (value: unknown): string | null => {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    // Models sometimes answer the literal words rather than a null.
    if (/^(null|n\/a|none|not (printed|provided|available))$/i.test(trimmed)) return null;
    return trimmed;
  };

  return {
    full_name: clean(raw.full_name),
    designation: clean(raw.designation),
    company: clean(raw.company),
    phone: clean(raw.phone),
    company_landline: clean(raw.company_landline),
    email: clean(raw.email)?.toLowerCase() ?? null,
    company_website: clean(raw.company_website),
    company_address: clean(raw.company_address),
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  if (!ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY is not set on this project');
    return jsonResponse({ error: 'Card reading is not configured.' }, 503);
  }

  let body: { image_base64?: string; mime_type?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Expected a JSON body.' }, 400);
  }

  const imageBase64 = body.image_base64;
  const mimeType = body.mime_type ?? 'image/jpeg';

  if (!imageBase64) return jsonResponse({ error: 'No image was sent.' }, 400);
  if (!ALLOWED_MIME.has(mimeType)) return jsonResponse({ error: 'Unsupported image type.' }, 400);
  if (imageBase64.length > MAX_BASE64_LENGTH) {
    return jsonResponse({ error: 'That photo is too large. Try again.' }, 413);
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: mimeType, data: imageBase64 } },
              { type: 'text', text: 'Read this business card.' },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error('anthropic', response.status, detail);
      // 429 and 529 are worth retrying; the client is told which is which.
      const retryable = response.status === 429 || response.status >= 500;
      return jsonResponse(
        {
          error: retryable
            ? 'Card reading is busy. Type the details in, or try again in a moment.'
            : "Couldn't read that card.",
          retryable,
        },
        retryable ? 503 : 502
      );
    }

    const payload = await response.json();
    const text: string = payload?.content?.[0]?.text ?? '';

    // Defensive parse: the instruction says JSON only, but a stray code fence
    // or a sentence in front of it must not lose the whole extraction.
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      console.error('no JSON in model output', text.slice(0, 400));
      return jsonResponse({ fields: EMPTY, read: false });
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(match[0]);
    } catch {
      console.error('unparseable JSON', match[0].slice(0, 400));
      return jsonResponse({ fields: EMPTY, read: false });
    }

    const fields = normalise(parsed);
    const read = Object.values(fields).some((value) => value !== null);

    return jsonResponse({ fields, read });
  } catch (e) {
    console.error('extract-card', e);
    return jsonResponse(
      { error: 'Card reading failed. Type the details in instead.', retryable: true },
      503
    );
  }
});
