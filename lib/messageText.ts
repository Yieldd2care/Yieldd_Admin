/**
 * Follow-up messages, sent by handing the phone's own apps a pre-filled draft.
 *
 * There is no WhatsApp Business API here and that is the design, not a
 * shortcut. A `wa.me` link opens the rep's own WhatsApp, on their own number,
 * with the lead's chat open and the message already typed. The rep presses send.
 *
 * What that buys: it works on day one with no Meta approval, no per-message
 * fee, no 24-hour session window, and no template pre-approval. The customer
 * gets a message from a person they just met rather than from a business
 * account they have never heard of.
 *
 * What it costs, and the UI must be honest about it: nothing is sent
 * automatically, and **one chat opens at a time**. "Bulk send" is a queue the
 * rep walks through, not a broadcast — which is why the send-queue screen is
 * built as one card with Skip and Open, rather than a progress bar that fills
 * on its own. The app cannot know whether the rep actually pressed send in
 * WhatsApp, so a send is recorded as "opened it for them", never as delivered.
 */

export type MergeContext = {
  /** The lead's name. `{{name}}` */
  name?: string | null;
  /** The lead's company. `{{company}}` */
  company?: string | null;
  /** The event they were met at. `{{event}}` */
  event?: string | null;
  /** The stall they were met at, from the event. `{{stall}}` */
  stall?: string | null;
  /** The rep sending it. `{{sender}}` */
  sender?: string | null;
  /** The rep's own company. `{{sender_company}}` */
  senderCompany?: string | null;
};

/** The placeholders a template may use, and where each one gets its value. */
export const MERGE_FIELDS = [
  { token: '{{name}}', label: 'Their name' },
  { token: '{{company}}', label: 'Their company' },
  { token: '{{event}}', label: 'The event' },
  { token: '{{stall}}', label: 'Your stall number' },
  { token: '{{sender}}', label: 'Your name' },
  { token: '{{sender_company}}', label: 'Your company' },
] as const;

/**
 * The one place a merge context is assembled.
 *
 * This object was written out by hand in three screens, and each carried a
 * comment about the same class of bug: a subject rendered with fewer fields
 * than its body, because one copy drifted. A fourth copy was about to be
 * written for the web dashboard, so it lives here now instead.
 *
 * `event` must be **the lead's own event**, not whichever event the app happens
 * to be pointed at. A follow-up once went out naming the wrong show because of
 * that, and it supplies two of the six fields — the name and the stall.
 */
export function buildMergeContext(
  lead: { name?: string | null; company?: string | null } | null | undefined,
  event: { name?: string | null; stallNumber?: string | null } | null | undefined,
  user: { name?: string | null; company?: string | null } | null | undefined
): MergeContext {
  return {
    name: lead?.name,
    company: lead?.company,
    event: event?.name,
    stall: event?.stallNumber,
    sender: user?.name,
    // Empty for an admin who has not named their organisation yet — the
    // placeholder is stripped at the seam, in lib/mappers/profile.ts. The help
    // text on the template editor offers "{{sender}}, {{sender_company}}" as
    // its worked example, so renderTemplate below has to take the joining comma
    // out with the empty token rather than sign a message to a real prospect
    // "Priya,".
    senderCompany: user?.company,
  };
}

/** Every `{{…}}` in a piece of text, in the order it appears, without repeats. */
export function mergeTokensIn(text: string): string[] {
  const found = text.match(/\{\{[^}]*\}\}/g) ?? [];
  return [...new Set(found)];
}

/**
 * The `{{…}}` in a template that this app has never heard of.
 *
 * Anyone can type `{{Interest/Requirement}}` into the message box, and nothing
 * stopped them: `renderTemplate` replaces the tokens it knows and leaves the
 * rest exactly as typed, so an invented one travels all the way into WhatsApp
 * and is read by a customer as literal `{{Interest/Requirement}}`.
 *
 * Deleting them instead would be worse — that is silently throwing away
 * something a person deliberately wrote. They are surfaced in the editor
 * instead, while there is still someone there to fix them.
 */
export function unknownMergeTokens(text: string): string[] {
  const known = new Set<string>(MERGE_FIELDS.map((f) => f.token));
  return mergeTokensIn(text).filter((token) => !known.has(token));
}

/**
 * Fills a template in.
 *
 * A placeholder with nothing behind it is removed rather than left as
 * `{{name}}` or replaced with the word "null" — "Hi , great meeting you" reads
 * as careless, but "Hi {{name}}" reads as broken software, and the customer
 * sees whichever one goes out.
 */
export function renderTemplate(template: string, context: MergeContext): string {
  const values: Record<string, string> = {
    '{{name}}': firstName(context.name) ?? '',
    '{{company}}': context.company?.trim() ?? '',
    '{{event}}': context.event?.trim() ?? '',
    '{{stall}}': context.stall?.trim() ?? '',
    '{{sender}}': context.sender?.trim() ?? '',
    '{{sender_company}}': context.senderCompany?.trim() ?? '',
  };

  let out = template;
  for (const [token, value] of Object.entries(values)) {
    if (value) {
      out = out.split(token).join(value);
      continue;
    }

    /**
     * An empty token takes the separator in FRONT of it with it.
     *
     * The template editor's own worked example is "{{sender}}, {{sender_company}}",
     * and `{{sender_company}}` is empty for anyone who has not named their
     * organisation yet (#58, stripped in lib/mappers/profile.ts). Plain
     * substitution leaves "Priya," — a dangling
     * comma in a message going to a customer, which the tidy-up below cannot
     * remove because it only strips whitespace before punctuation.
     *
     * Only a separator BEFORE the token, which is the only one that was joining
     * it to something. "Hi {{name}}," keeps its comma, because that comma
     * belongs to the greeting and not to the placeholder.
     */
    const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    out = out.replace(new RegExp(`[ \\t]*[,;·-][ \\t]*${escaped}`, 'g'), '');
    out = out.split(token).join('');
  }

  return (
    out
      // "Hi , great meeting you" → "Hi, great meeting you"
      .replace(/\s+([,.!?])/g, '$1')
      // Any run of spaces left where a placeholder used to be.
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  );
}

/** People say "Hi Rajesh", not "Hi Rajesh Menon". */
function firstName(full: string | null | undefined): string | null {
  const trimmed = full?.trim();
  if (!trimmed) return null;
  return trimmed.split(/\s+/)[0];
}

/**
 * wa.me wants bare digits with a country code and no plus.
 *
 * A number with no country code cannot be linked to at all — wa.me would open a
 * contact picker instead of the right chat — so this returns null rather than
 * guessing, and the caller offers to open WhatsApp without a recipient.
 */
export function whatsappDigits(phone: string | null | undefined): string | null {
  const digits = (phone ?? '').replace(/\D/g, '');
  if (digits.length < 10) return null;
  // A bare ten-digit Indian mobile, as printed on most cards here.
  if (digits.length === 10) return `91${digits}`;
  // `0` + ten digits is the domestic trunk form.
  if (digits.length === 11 && digits.startsWith('0')) return `91${digits.slice(1)}`;
  return digits;
}

export function whatsappUrl(phone: string | null | undefined, message: string): string {
  const digits = whatsappDigits(phone);
  const text = encodeURIComponent(message);
  return digits ? `https://wa.me/${digits}?text=${text}` : `https://wa.me/?text=${text}`;
}

export function mailtoUrl(email: string | null | undefined, subject: string, body: string): string {
  const address = (email ?? '').trim();
  const params = new URLSearchParams({ subject, body }).toString().replace(/\+/g, '%20');
  return `mailto:${encodeURIComponent(address)}?${params}`;
}
