// Writes a short summary of a company by reading that company's own website.
//
// Why it works this way, and not the obvious way:
//
// The obvious way is to hand the company name to a model and ask what the
// company does. That is what this button used to do, and it is why it was
// switched off — the model has nothing to read, so it writes a fluent,
// confident paragraph about a company it has never heard of, and the rep
// forwards it to that company. Card scanning and voice notes are safe because
// the model is looking at something real: a photo, an audio file. This has to
// be the same. It reads pages, or it says it could not.
//
// The URL comes off a business card via OCR, which means it is attacker-
// influenced text pointed at a server-side fetch. Everything in `hostProblem`
// and the manual redirect loop exists for that reason. This function must
// never become a way to ask Supabase's network to fetch something on the
// caller's behalf.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');

// A plain text-summarising job over text the model can see, so the cheap fast
// model is right here — the same call the voice-note summary makes. There is
// no reading-a-photo risk to buy off, because the source text is in the
// prompt and a wrong summary is visibly wrong against it.
const MODEL = Deno.env.get('COMPANY_SUMMARY_MODEL') ?? 'claude-haiku-4-5-20251001';

// Company websites change slowly. Ninety days keeps a summary useful without
// re-reading a static brochure site every exhibition.
const CACHE_MAX_AGE_DAYS = Number(Deno.env.get('COMPANY_SUMMARY_MAX_AGE_DAYS') ?? '90');

const MAX_PAGES = 3;              // homepage + two supporting pages
const PER_PAGE_CHARS = 6_000;
const TOTAL_CHARS = 14_000;
const MIN_USABLE_CHARS = 200;     // below this a page is a splash screen
const FETCH_TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 3;
const MAX_BYTES = 1_500_000;

// Identifies the fetch honestly. A company that wants to block it can.
const USER_AGENT =
  'YieilddBot/1.0 (+https://yieldd.co; summarises a company site for a sales rep who met them)';

const SYSTEM_PROMPT = `You write a short summary of a company for a sales rep who has just met someone from that company at a trade show and will ring them in a day or two.

You are given text taken from that company's own website. Use only what is in that text.

Rules:
- Every fact must come from the text you were given. Never add something you
  know, or think you know, about this company or a company with a similar name.
- Open with what the company actually makes or does. Then whatever is concrete:
  the industries it serves, where it is based, how long it has been going,
  plant, capacity, certifications, notable customers.
- Leave out slogans and self-praise. "Committed to excellence and customer
  satisfaction" tells a rep nothing they can use on a call.
- Two or three plain sentences. No heading, no bullet points, no preamble, and
  do not open with "This company" or "The website says".
- If the text is only navigation, contact details, cookie notices or a holding
  page, and never says what the company does, reply with exactly: NOT_ENOUGH`;

type Fetched = { url: string; text: string };

// ---------------------------------------------------------------------------
// Where we are allowed to fetch from
// ---------------------------------------------------------------------------

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    return true; // unparseable: treat as unsafe
  }
  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) || // link-local, and the cloud metadata endpoint
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) || // carrier-grade NAT
    a >= 224 // multicast and reserved
  );
}

const IPV4_LITERAL = /^\d{1,3}(\.\d{1,3}){3}$/;

/**
 * Returns a reason string when the URL must not be fetched, or null when it is
 * fine. Called again on every redirect hop — a public host that 302s to
 * 169.254.169.254 is the whole point of doing redirects by hand.
 */
async function hostProblem(url: URL): Promise<string | null> {
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return 'scheme';

  // Anything but the default web ports is not a company website.
  if (url.port !== '' && url.port !== '80' && url.port !== '443') return 'port';

  const host = url.hostname.toLowerCase();

  if (!host) return 'empty host';
  // A literal address on a business card is not a website, and allowing them
  // would mean re-implementing the whole private-range check on the hot path.
  if (IPV4_LITERAL.test(host)) return 'ip literal';
  if (host.includes(':')) return 'ipv6 literal';
  // Single-label names resolve against the container's own search domain.
  if (!host.includes('.')) return 'single label';
  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host.endsWith('.home.arpa')
  ) {
    return 'internal name';
  }

  // Best-effort: catch a public name that points at a private address. Not
  // every runtime exposes resolveDns, and it cannot close the gap between the
  // lookup and the fetch, so it is a second lock rather than the only one.
  try {
    const addresses = await Deno.resolveDns(host, 'A');
    if (addresses.length && addresses.every(isPrivateIPv4)) return 'resolves private';
    if (addresses.some(isPrivateIPv4)) return 'resolves private';
  } catch {
    /* Unavailable or the name does not resolve — the fetch will fail anyway. */
  }

  return null;
}

/** Reads at most MAX_BYTES of the body, then gives up on the rest. */
async function readCapped(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return '';

  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (total < MAX_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      chunks.push(value);
      total += value.length;
    }
  } finally {
    try {
      await reader.cancel();
    } catch {
      /* already closed */
    }
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }
  return new TextDecoder('utf-8', { fatal: false }).decode(merged);
}

/** Fetches one page, following redirects by hand so each hop is re-checked. */
async function fetchHtml(start: URL): Promise<{ url: URL; html: string } | null> {
  let current = start;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const problem = await hostProblem(current);
    if (problem) {
      console.warn('refused', current.hostname, problem);
      return null;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(current.toString(), {
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          'user-agent': USER_AGENT,
          accept: 'text/html,application/xhtml+xml',
          'accept-language': 'en-IN,en;q=0.9',
        },
      });
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      await response.body?.cancel().catch(() => {});
      if (!location) return null;
      try {
        current = new URL(location, current);
      } catch {
        return null;
      }
      continue;
    }

    if (!response.ok) {
      await response.body?.cancel().catch(() => {});
      return null;
    }

    const contentType = (response.headers.get('content-type') ?? '').toLowerCase();
    if (!contentType.includes('html') && contentType !== '') {
      await response.body?.cancel().catch(() => {});
      return null;
    }

    return { url: current, html: await readCapped(response) };
  }

  return null; // redirect loop
}

// ---------------------------------------------------------------------------
// Turning a page into something worth reading
// ---------------------------------------------------------------------------

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“',
  ndash: '–', mdash: '—', hellip: '…', middot: '·',
  reg: '®', copy: '©', trade: '™', deg: '°', eacute: 'é',
};

function decodeEntities(input: string): string {
  return input.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (whole, code: string) => {
    if (code[0] === '#') {
      const value =
        code[1] === 'x' || code[1] === 'X'
          ? parseInt(code.slice(2), 16)
          : parseInt(code.slice(1), 10);
      if (!Number.isFinite(value) || value < 9 || value > 0x10ffff) return whole;
      try {
        return String.fromCodePoint(value);
      } catch {
        return whole;
      }
    }
    return NAMED_ENTITIES[code.toLowerCase()] ?? whole;
  });
}

function htmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script\s*>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style\s*>/gi, ' ')
      .replace(/<noscript[\s\S]*?<\/noscript\s*>/gi, ' ')
      .replace(/<svg[\s\S]*?<\/svg\s*>/gi, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      // Keep the line structure the page had, so a list of products does not
      // run into one sentence.
      .replace(/<\/(p|div|li|tr|h[1-6]|section|article)\s*>/gi, '\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
  )
    // Carriage returns first. Without this a Windows-authored page arrives as
    // thousands of CRLF pairs that the collapse below never matches, and the
    // character budget goes on blank lines instead of on what the company
    // does — which is most of a real corporate homepage, measured.
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t\f\v ]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

/** The title and meta description are often the clearest line on the site. */
function pageHeadline(html: string): string {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title\s*>/i)?.[1] ?? '';
  const description =
    html.match(
      /<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i
    )?.[1] ??
    html.match(
      /<meta[^>]+property=["']og:description["'][^>]*content=["']([^"']*)["']/i
    )?.[1] ??
    '';

  return [decodeEntities(title).trim(), decodeEntities(description).trim()]
    .filter(Boolean)
    .join(' — ');
}

// Pages that say what a company does. Deliberately not "contact" or "careers".
const WORTH_READING =
  /(about|company|profile|who-we-are|our-story|overview|products?|services?|solutions?|what-we-do|manufactur|infrastructure|capabilit)/i;
const NOT_A_PAGE = /\.(pdf|jpe?g|png|gif|webp|svg|zip|docx?|xlsx?|pptx?|mp4|mp3)$/i;

function supportingLinks(html: string, base: URL, limit: number): URL[] {
  const found: URL[] = [];
  const seen = new Set<string>([base.toString()]);
  const anchor = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]{0,200}?)<\/a\s*>/gi;

  let match: RegExpExecArray | null;
  while ((match = anchor.exec(html)) !== null && found.length < limit) {
    let candidate: URL;
    try {
      candidate = new URL(match[1], base);
    } catch {
      continue;
    }
    if (candidate.protocol !== 'https:' && candidate.protocol !== 'http:') continue;
    if (candidate.hostname.toLowerCase() !== base.hostname.toLowerCase()) continue;
    if (NOT_A_PAGE.test(candidate.pathname)) continue;

    candidate.hash = '';
    const key = candidate.toString();
    if (seen.has(key)) continue;

    const label = htmlToText(match[2]);
    if (!WORTH_READING.test(candidate.pathname) && !WORTH_READING.test(label)) continue;

    seen.add(key);
    found.push(candidate);
  }

  return found;
}

// ---------------------------------------------------------------------------

function normaliseWebsite(raw: string): URL | null {
  const trimmed = raw.trim().replace(/^[<(]|[>)]$/g, '');
  if (!trimmed) return null;

  // Cards print "www.northline.co.in", not "https://www.northline.co.in".
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const url = new URL(withScheme);
    url.hash = '';
    return url;
  } catch {
    return null;
  }
}

/** northline.co.in — what the cache is keyed on. */
function cacheKey(url: URL): string {
  return url.hostname.toLowerCase().replace(/^www\./, '');
}

async function writeSummary(text: string, companyName: string): Promise<string | null> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 400,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Company name as printed on the business card: ${companyName || 'not given'}

Text from their website:

${text}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    console.error('anthropic', response.status, await response.text());
    throw Object.assign(new Error('model'), {
      retryable: response.status === 429 || response.status >= 500,
    });
  }

  const payload = await response.json();
  const summary: string = (payload?.content?.[0]?.text ?? '').trim();

  // The prompt's own escape hatch: the pages were fetched but never said what
  // the company does. Better than a paragraph of recycled navigation.
  if (!summary || summary.includes('NOT_ENOUGH')) return null;
  return summary;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

  if (!supabaseUrl || !serviceKey || !anonKey) {
    console.error('project environment is incomplete');
    return jsonResponse({ error: 'Company summaries are not configured.' }, 503);
  }
  if (!ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY is not set on this project');
    return jsonResponse({ error: 'Company summaries are not configured.' }, 503);
  }

  // Signed-in callers only. This function makes outbound requests to a URL the
  // caller supplies, so it is not something to leave open to anonymous traffic
  // even with the host checks in place.
  const caller = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });
  const { data: auth } = await caller.auth.getUser();
  if (!auth?.user) return jsonResponse({ error: 'Not signed in.' }, 401);

  let body: { website?: string; company_name?: string; refresh?: boolean };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Expected a JSON body.' }, 400);
  }

  const url = normaliseWebsite(body.website ?? '');
  if (!url) {
    return jsonResponse(
      { reason: 'no_website', error: 'This lead does not have a company website.' },
      400
    );
  }

  const problem = await hostProblem(url);
  if (problem) {
    return jsonResponse(
      { reason: 'bad_website', error: "That does not look like a company website." },
      400
    );
  }

  const companyName = (body.company_name ?? '').trim();
  const domain = cacheKey(url);
  const service = createClient(supabaseUrl, serviceKey);

  // Forty reps at one stall scan the same card. Read the site once.
  if (!body.refresh) {
    const { data: cached } = await service
      .from('company_summaries')
      .select('summary, source_urls, refreshed_at')
      .eq('domain', domain)
      .maybeSingle();

    if (cached) {
      const ageDays = (Date.now() - new Date(cached.refreshed_at).getTime()) / 86_400_000;
      if (ageDays < CACHE_MAX_AGE_DAYS) {
        return jsonResponse({
          summary: cached.summary,
          cached: true,
          sources: cached.source_urls ?? [],
        });
      }
    }
  }

  const home = await fetchHtml(url);
  if (!home) {
    return jsonResponse({
      reason: 'unreachable',
      error: "Couldn't open their website. Type anything you already know instead.",
    });
  }

  const pages: Fetched[] = [];
  const headline = pageHeadline(home.html);
  const homeText = htmlToText(home.html);
  pages.push({
    url: home.url.toString(),
    text: [headline, homeText].filter(Boolean).join('\n').slice(0, PER_PAGE_CHARS),
  });

  // An About or Products page is usually where a manufacturer actually says
  // what it makes; the homepage is often a slider and three icons.
  for (const link of supportingLinks(home.html, home.url, MAX_PAGES - 1)) {
    const page = await fetchHtml(link);
    if (!page) continue;
    const text = htmlToText(page.html);
    if (text.length < MIN_USABLE_CHARS) continue;
    pages.push({ url: page.url.toString(), text: text.slice(0, PER_PAGE_CHARS) });
  }

  const combined = pages
    .map((page) => `--- ${page.url}\n${page.text}`)
    .join('\n\n')
    .slice(0, TOTAL_CHARS);

  // A site that is one hero image, or renders entirely in JavaScript, leaves
  // nothing behind. Say so rather than summarising a navigation bar.
  if (combined.replace(/\s/g, '').length < MIN_USABLE_CHARS) {
    return jsonResponse({
      reason: 'unreadable',
      error: "Couldn't read anything useful from their website.",
    });
  }

  let summary: string | null;
  try {
    summary = await writeSummary(combined, companyName);
  } catch (e) {
    const retryable = Boolean((e as { retryable?: boolean }).retryable);
    return jsonResponse(
      {
        reason: retryable ? 'busy' : 'failed',
        error: retryable
          ? 'The summary service is busy. Try again in a moment.'
          : "Couldn't write a summary just now.",
        retryable,
      },
      retryable ? 503 : 502
    );
  }

  if (!summary) {
    return jsonResponse({
      reason: 'unreadable',
      error: "Their website doesn't say what the company does.",
    });
  }

  const sources = pages.map((page) => page.url);
  const { error: cacheError } = await service.from('company_summaries').upsert(
    {
      domain,
      summary,
      source_urls: sources,
      model: MODEL,
      refreshed_at: new Date().toISOString(),
    },
    { onConflict: 'domain' }
  );
  // A cache miss costs a re-read next time; it is not worth failing the call
  // the rep is waiting on.
  if (cacheError) console.error('cache write', cacheError);

  return jsonResponse({ summary, cached: false, sources });
});
