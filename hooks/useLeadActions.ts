import { Alert } from 'react-native';

import { useEvent } from './useEvents';
import { useEventTemplate } from './useMessageTemplates';
import { useLeadsStore, type StoredLead } from '../stores/useLeadsStore';
import { useSessionStore } from '../stores/useSessionStore';
import {
  openDialer,
  openEmail,
  openWhatsApp,
  renderTemplate,
  whatsappDigits,
  whatsappUrl,
  buildMergeContext,
} from '../lib/messaging';
import { recordSend } from '../lib/api/messageSends';
import { saveLeadToContacts } from '../lib/contacts';

/**
 * The four things a rep does with a lead: call, WhatsApp, email, save to phone.
 *
 * This is a hook because there are two places that need it and only one of them
 * had it. The lead *detail* screen has had all four working for a while; the
 * lead *row* — on the home screen and the Leads tab, which is where a rep
 * actually spends the day — alerted "isn't wired up yet" on every one of them.
 *
 * Copying the handlers across would have worked once and drifted afterwards.
 * The part that matters most is `recordSend`: it is what makes the send history
 * and the follow-up counts agree with what the rep did. A row that opened
 * WhatsApp without recording it would quietly under-report every send made from
 * the list, which is most of them.
 *
 * Nothing here sends anything. Each action hands a pre-filled draft to the
 * phone's own app and the rep presses send, so a send is recorded as "opened it
 * for them", never as delivered.
 *
 * `lead` is optional because the detail screen renders a "no such lead" state
 * before it has one, and a hook cannot be called after that early return.
 */
export function useLeadActions(
  lead: StoredLead | undefined,
  opts: {
    /**
     * Where a failure should be shown. Omit it and the phone's `Alert.alert`
     * is used, exactly as before.
     *
     * The web dashboard passes one because react-native-web ships `Alert` as
     * an empty function — every one of these messages would otherwise vanish,
     * leaving a button that appears to do nothing.
     */
    onError?: (title: string, message: string) => void;
  } = {}
) {
  const user = useSessionStore((s) => s.user);
  const fail = (title: string, message: string) =>
    opts.onError ? opts.onError(title, message) : Alert.alert(title, message);
  const eventId = lead?.eventId || undefined;

  // All three are cached queries keyed by event and channel, so a list of forty
  // leads from one event shares one copy rather than fetching per row.
  const { data: event } = useEvent(eventId);
  const { template: whatsappTemplate } = useEventTemplate(eventId, 'whatsapp');
  const { template: emailTemplate } = useEventTemplate(eventId, 'email');

  const mergeContext = buildMergeContext(lead, event, user);

  const call = async () => {
    if (!lead) return;
    const outcome = await openDialer(lead.phone);
    if (!outcome.ok) fail('Cannot call', outcome.message);
  };

  /**
   * A message must never go out with a blank name in it.
   *
   * Every default template opens `Hi {{name}},`, and since the capture rework a
   * lead can legitimately exist with no name at all — the card was photographed
   * but could not be read. Sending would put "Hi ," in front of a customer.
   * This repo has already shipped that exact class of bug once, with a blank
   * `{{event}}` going out in a follow-up.
   *
   * Calling is deliberately NOT gated: a phone call carries no template, and a
   * rep ringing someone whose card did not scan is a perfectly good recovery.
   */
  const needsNameFirst = (): boolean => {
    if (lead?.name?.trim()) return false;
    fail(
      'Add their name first',
      'This card could not be read, so the message would go out addressed to nobody. Add a name on the lead and try again.'
    );
    return true;
  };

  const whatsapp = async () => {
    if (!lead) return;
    if (needsNameFirst()) return;
    const body = whatsappTemplate?.body ?? 'Hi {{name}}, great meeting you at {{event}}.';
    const outcome = await openWhatsApp(lead.phone, renderTemplate(body, mergeContext));
    if (!outcome.ok) {
      fail('Cannot open WhatsApp', outcome.message);
      return;
    }
    if (user) {
      void recordSend({
        leadId: lead.id,
        sentBy: user.id,
        channel: 'whatsapp',
        templateUsed: whatsappTemplate?.name,
        templateId: whatsappTemplate?.id,
        status: 'sent',
      });
    }
  };

  const email = async () => {
    if (!lead) return;
    if (needsNameFirst()) return;
    if (!lead.email?.trim()) {
      fail('No email', 'This lead was captured without an email address.');
      return;
    }
    const body = emailTemplate?.body ?? 'Hi {{name}}, thank you for stopping by our stall.';
    const outcome = await openEmail(
      lead.email,
      renderTemplate(emailTemplate?.subject ?? 'Great meeting you at {{event}}', mergeContext),
      renderTemplate(body, mergeContext)
    );
    if (!outcome.ok) {
      fail('Cannot open mail', outcome.message);
      return;
    }
    if (user) {
      void recordSend({
        leadId: lead.id,
        sentBy: user.id,
        channel: 'email',
        templateUsed: emailTemplate?.name,
        templateId: emailTemplate?.id,
        status: 'sent',
      });
    }
  };

  /**
   * Into the rep's own phone contacts.
   *
   * Stays available after it has been done. The flag is per-lead on the server,
   * not per-device, so a lead saved on one phone reads as saved on a second
   * where the contact does not exist — and a contact can simply be deleted.
   * Disabling the button would make either case a dead end.
   *
   * The note and the voice summary are deliberately left out of the contact;
   * see lib/contacts.ts.
   */
  const saveToContacts = async () => {
    if (!lead) return;
    const outcome = await saveLeadToContacts({
      name: lead.name,
      company: lead.company,
      designation: lead.designation,
      phone: lead.phone,
      landline: lead.companyLandline,
      email: lead.email,
      website: lead.companyWebsite,
      address: lead.companyAddress,
    });

    if (!outcome.ok) {
      fail(outcome.reason === 'permission' ? 'Contacts is off' : 'Could not save', outcome.message);
      return;
    }
    // The contact form reports dismissal, not Save — so this records that the
    // form was opened, the same honest limit message sends already accept.
    useLeadsStore.getState().markSavedToContacts(lead.id);
  };

  return {
    call,
    whatsapp,
    email,
    saveToContacts,
    savedToContacts: Boolean(lead?.savedToContacts),
    /**
     * For dimming a button rather than opening something that cannot work.
     * WhatsApp is its own case: a number with no country code cannot be linked
     * to, and `whatsappUrl` then opens WhatsApp with no recipient — useful from
     * the detail screen, misleading as a live-looking icon in a list.
     */
    canCall: Boolean(lead?.phone?.trim()),
    canWhatsApp: Boolean(whatsappDigits(lead?.phone)),
    canEmail: Boolean(lead?.email?.trim()),

    /**
     * The finished message and the link to it.
     *
     * The web needs both as values rather than as an action: a send there is a
     * real `<a>` inside the click (a programmatic open after an await is
     * popup-blocked), and "Copy message" needs the text itself.
     */
    whatsappText: renderTemplate(
      whatsappTemplate?.body ?? 'Hi {{name}}, great meeting you at {{event}}.',
      mergeContext
    ),
    whatsappHref: whatsappUrl(
      lead?.phone,
      renderTemplate(
        whatsappTemplate?.body ?? 'Hi {{name}}, great meeting you at {{event}}.',
        mergeContext
      )
    ),
    /** Records the send the web just handed over, since no outcome comes back. */
    noteWhatsAppOpened: () => {
      if (!lead || !user) return;
      void recordSend({
        leadId: lead.id,
        sentBy: user.id,
        channel: 'whatsapp',
        templateUsed: whatsappTemplate?.name,
        templateId: whatsappTemplate?.id,
        status: 'sent',
      });
    },
  };
}
