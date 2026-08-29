import { Linking } from 'react-native';

import { mailtoUrl, whatsappUrl } from './messageText';

/**
 * Handing a draft to the phone's own apps.
 *
 * Split from `messageText.ts` so the part that composes what a customer will
 * read — merge fields, phone normalisation, URL building — can be checked by
 * `npm run verify:messaging` without React Native loaded. This half is the
 * thin bit that cannot be tested off-device anyway.
 */

// Re-exported so callers have one import for the whole job.
export * from './messageText';

export type OpenOutcome = { ok: true } | { ok: false; message: string };

async function open(url: string, appName: string): Promise<OpenOutcome> {
  try {
    await Linking.openURL(url);
    return { ok: true };
  } catch {
    return { ok: false, message: `${appName} could not be opened on this device.` };
  }
}

export function openWhatsApp(phone: string | null | undefined, message: string) {
  return open(whatsappUrl(phone, message), 'WhatsApp');
}

export function openEmail(email: string | null | undefined, subject: string, body: string) {
  return open(mailtoUrl(email, subject, body), 'Your email app');
}

export function openDialer(phone: string | null | undefined): Promise<OpenOutcome> {
  const number = (phone ?? '').replace(/[^\d+]/g, '');
  if (!number) {
    return Promise.resolve({ ok: false, message: 'This lead has no phone number.' });
  }
  return open(`tel:${number}`, 'The phone');
}
