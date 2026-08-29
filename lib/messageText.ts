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
  { token: '{{sender}}', label: 'Your name' },
  { token: '{{sender_company}}', label: 'Your company' },
] as const;

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
    '{{sender}}': context.sender?.trim() ?? '',
    '{{sender_company}}': context.senderCompany?.trim() ?? '',
  };

  let out = template;
  for (const [token, value] of Object.entries(values)) {
    out = out.split(token).join(value);
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
