/**
 * Links on a digital business card.
 *
 * Pure, and separate from anything React Native, because the public card page
 * renders these for strangers and the rules have to be identical in the app
 * preview, on the hosted page and in the test.
 *
 * The security point, which is not theoretical: the card owner types their own
 * website, LinkedIn and social URLs, and the hosted page is served from
 * yieldd.co. An unfiltered `javascript:` or `data:` href on that page runs in
 * yieldd.co's origin for every visitor who taps it — stored XSS against the
 * people the card was shared with, not against its owner. So an href is only
 * ever produced from `safeExternalUrl`, which admits http and https and
 * nothing else.
 */

/** `https://yieldd.co/c/priya-sharma`. Overridable so a card subdomain can be pointed here later without a code change. */
export const CARD_BASE_URL = (
  process.env.EXPO_PUBLIC_CARD_BASE_URL ?? 'https://yieldd.co/c'
).replace(/\/+$/, '');

export function cardShareUrl(slug: string): string {
  return `${CARD_BASE_URL}/${slug}`;
}

/** `yieldd.co/c/priya-sharma` — what a person reads, without the scheme. */
export function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//i, '').replace(/\/+$/, '');
}

const SCHEME = /^([a-z][a-z0-9+.-]*):/i;

/**
 * A URL safe to put in an href, or null.
 *
 * A bare `yieldd.co` is assumed to be https — people type their website
 * without a scheme and rejecting that would be pedantry. Anything carrying an
 * explicit scheme that is not http or https is refused outright rather than
 * repaired, because there is no honest repair for `javascript:alert(1)`.
 */
export function safeExternalUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const text = raw.trim();
  if (!text) return null;

  const scheme = text.match(SCHEME)?.[1]?.toLowerCase();
  if (scheme && scheme !== 'http' && scheme !== 'https') return null;

  const withScheme = scheme ? text : `https://${text}`;

  // A control character in a URL is how a filter gets walked past —
  // `java\nscript:` survives a naive scheme check and is re-joined by some
  // parsers. Nothing legitimate contains one.
  if (/[\u0000-\u001f\u007f]/.test(withScheme)) return null;

  try {
    const parsed = new URL(withScheme);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    if (!parsed.hostname) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * LinkedIn, however it was typed.
 *
 * People enter `priya-sharma`, `@priya-sharma`, `linkedin.com/in/priya-sharma`
 * or the full URL, and all four mean the same profile.
 */
export function linkedinUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const text = raw.trim().replace(/^@/, '');
  if (!text) return null;

  if (/linkedin\.com/i.test(text)) return safeExternalUrl(text);
  if (SCHEME.test(text)) return safeExternalUrl(text);
  // A bare handle. Slashes are stripped so `in/priya` and `priya` agree.
  const handle = text.replace(/^\/+|\/+$/g, '').replace(/^in\//i, '');
  if (!/^[\w.-]+$/.test(handle)) return null;
  return `https://www.linkedin.com/in/${handle}`;
}

/** Digits only, with India assumed when no country code was typed. */
export function telUrl(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const trimmed = phone.trim();
  const digits = trimmed.replace(/[^\d]/g, '');
  if (digits.length < 6) return null;
  return trimmed.startsWith('+') ? `tel:+${digits}` : `tel:${digits}`;
}

export function mailtoUrl(email: string | null | undefined): string | null {
  if (!email) return null;
  const text = email.trim();
  // Deliberately loose — an address is validated by whether mail arrives, not
  // by a regex. This only rejects what would break the URL.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) return null;
  return `mailto:${encodeURIComponent(text).replace(/%40/g, '@')}`;
}

export type SocialLink = { label: string; url: string };

/**
 * The card owner's social list, cleaned for display.
 *
 * `social_links` is jsonb and the column check only proves it is an array —
 * element shape is not enforced by the database, and the comment on that
 * column says so. So every element is re-validated here, on the read side,
 * which is the side that matters.
 */
export function readSocialLinks(value: unknown): SocialLink[] {
  if (!Array.isArray(value)) return [];
  const out: SocialLink[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const record = item as Record<string, unknown>;
    const url = safeExternalUrl(typeof record.url === 'string' ? record.url : null);
    if (!url) continue;
    const rawLabel = typeof record.label === 'string' ? record.label.trim() : '';
    out.push({ label: (rawLabel || hostLabel(url)).slice(0, 40), url });
  }
  return out.slice(0, 20);
}

function hostLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'Link';
  }
}
