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

You may be given one image or two. Two images are the front and the back of the
SAME card — read them together and return one object describing that one card.
The back of a card is often blank, a logo, or the same details in another
language; if it adds nothing, that is a normal result, not a failure.

Return ONLY a JSON object, no prose and no code fence, with exactly these keys:

  full_name        the person's name
  designation      their job title
  company          the company name
  phone            their mobile or direct number
  company_landline a switchboard or office number, if separate from phone
  email            their email address
  company_website  the company's website
  company_address  the postal address as printed, on one line
  branch_address   a SECOND address, when the card prints one
  extra_phones       every OTHER number printed for this person, as an array
  extra_emails       every OTHER email address printed, as an array
  extra_designations any FURTHER job titles printed, as an array

Rules that matter more than completeness:

- Use null for anything not printed on the card. Never guess, never infer a
  company from an email domain, never complete a partial address.
- Indian cards often print two addresses — a registered or head office and a
  branch, works, factory or regional office. Put the head or registered office
  in company_address and the other in branch_address. If a card prints only one
  address it goes in company_address and branch_address is null. Never split one
  address across the two fields, and never copy the same address into both.
- Copy text exactly as printed, including spelling and capitalisation of names.
- A tagline or line of business printed under the company name is not part of
  the company name. "NORTHLINE ENGINEERING" above "PRECISION CASTINGS" is a
  company called Northline Engineering.
- Indian mobile numbers are ten digits and often printed with a +91, a 0, or
  spaces. Keep the digits exactly as they are; keep a leading + if printed.
- If two or more numbers are printed, the mobile goes in phone and the landline
  or office number goes in company_landline. Any number beyond those two goes
  in extra_phones, in the order it is printed. If only one is printed, it is
  phone. Never repeat a number that is already in phone or company_landline.
- The first email goes in email; any further address printed for the same
  person goes in extra_emails, in the order printed. A generic company address
  (info@, sales@, enquiry@) printed alongside a personal one is an extra, and
  is never the value of email.
- Indian cards often print a compound title on one line - "Director - Sales &
  Marketing", "MD & CEO". That is ONE designation, not two; keep it whole in
  designation. Use extra_designations only when the card prints genuinely
  separate titles, on separate lines or for a second company.
- The three array fields are ALWAYS arrays. Use [] - never null, never a bare
  string - when there is nothing extra. Never move a value out of phone, email
  or designation into an array to make an array non-empty.
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
  branch_address: string | null;
  extra_phones: string[];
  extra_emails: string[];
  extra_designations: string[];
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
  branch_address: null,
  extra_phones: [],
  extra_emails: [],
  extra_designations: [],
};

/** Keeps only the known keys, and turns blanks into null or []. */
function normalise(raw: Record<string, unknown>): Extracted {
  const clean = (value: unknown): string | null => {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    // Models sometimes answer the literal words rather than a null.
    if (/^(null|n\/a|none|not (printed|provided|available))$/i.test(trimmed)) return null;
    return trimmed;
  };

  /**
   * Element-wise, so the trim and the literal-"null" guard above apply to
   * every entry rather than to the array as a whole. Anything that is not an
   * array at all - a bare string, a null - becomes [], because the caller and
   * the column both want a list.
   */
  const cleanList = (value: unknown): string[] =>
    Array.isArray(value)
      ? value.map(clean).filter((entry): entry is string => entry !== null)
      : [];

  return {
    full_name: clean(raw.full_name),
    designation: clean(raw.designation),
    company: clean(raw.company),
    phone: clean(raw.phone),
    company_landline: clean(raw.company_landline),
    email: clean(raw.email)?.toLowerCase() ?? null,
    company_website: clean(raw.company_website),
    company_address: clean(raw.company_address),
    branch_address: clean(raw.branch_address),
    extra_phones: cleanList(raw.extra_phones),
    extra_emails: cleanList(raw.extra_emails).map((entry) => entry.toLowerCase()),
    extra_designations: cleanList(raw.extra_designations),
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  if (!ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY is not set on this project');
    return jsonResponse({ error: 'Card reading is not configured.' }, 503);
  }

  let body: { image_base64?: string; back_image_base64?: string; mime_type?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Expected a JSON body.' }, 400);
  }

  const imageBase64 = body.image_base64;
  // Optional. Plenty of cards print the addresses, or a second language, on the
  // back — but plenty print nothing there at all, which is why the app offers
  // the second shot rather than demanding it.
  const backImageBase64 = body.back_image_base64;
  const mimeType = body.mime_type ?? 'image/jpeg';

  if (!imageBase64) return jsonResponse({ error: 'No image was sent.' }, 400);
  if (!ALLOWED_MIME.has(mimeType)) return jsonResponse({ error: 'Unsupported image type.' }, 400);
  // Checked separately and against the same limit: two 9 MiB images are within
  // the per-image cap and well past what the model will take in one request.
  for (const image of [imageBase64, backImageBase64]) {
    if (image && image.length > MAX_BASE64_LENGTH) {
      return jsonResponse({ error: 'That photo is too large. Try again.' }, 413);
    }
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
            // Labelled front and back rather than sent as two bare images. Two
            // unlabelled photos of the same card read as two cards, and the
            // model then has to guess which address belongs to which.
            content: backImageBase64
              ? [
                  { type: 'text', text: 'Front of the card:' },
                  { type: 'image', source: { type: 'base64', media_type: mimeType, data: imageBase64 } },
                  { type: 'text', text: 'Back of the same card:' },
                  {
                    type: 'image',
                    source: { type: 'base64', media_type: mimeType, data: backImageBase64 },
                  },
                  { type: 'text', text: 'Read this business card.' },
                ]
              : [
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

    // EVERY text block, joined — not `content[0]`.
    //
    // Reading only the first block is why extraction intermittently came back
    // completely empty: any response whose first block is not the text one, or
    // whose JSON is split across blocks, yielded '' and fell through to the
    // "unreadable card" answer below. That failure is indistinguishable from a
    // genuinely unreadable photo, which is the worst way for this to break.
    const blocks: unknown[] = Array.isArray(payload?.content) ? payload.content : [];
    const text: string = blocks
      .filter(
        (b): b is { type: string; text: string } =>
          typeof b === 'object' &&
          b !== null &&
          (b as { type?: unknown }).type === 'text' &&
          typeof (b as { text?: unknown }).text === 'string'
      )
      .map((b) => b.text)
      .join('\n');

    // Defensive parse: the instruction says JSON only, but a stray code fence
    // or a sentence in front of it must not lose the whole extraction.
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      console.error('no JSON in model output', {
        stop_reason: payload?.stop_reason,
        block_types: blocks.map((b) => (b as { type?: string } | null)?.type),
        text: text.slice(0, 400),
      });
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
    /*
     * An empty array is not a reading.
     *
     * This was `value !== null` while every field was a nullable string. The
     * moment the three array fields arrived that became true for EVERY scan,
     * because [] !== null - so a photo of a thumb would have come back
     * `read: true`, and the "Nothing readable on that photo." state that
     * useLeadsStore sets from this flag would have disappeared silently.
     */
    const read = Object.values(fields).some((value) =>
      Array.isArray(value) ? value.length > 0 : value !== null
    );

    return jsonResponse({ fields, read });
  } catch (e) {
    console.error('extract-card', e);
    return jsonResponse(
      { error: 'Card reading failed. Type the details in instead.', retryable: true },
      503
    );
  }
});
