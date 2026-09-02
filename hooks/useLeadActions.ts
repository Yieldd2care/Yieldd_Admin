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
export function useLeadActions(lead: StoredLead | undefined) {
  const user = useSessionStore((s) => s.user);
  const eventId = lead?.eventId || undefined;

  // All three are cached queries keyed by event and channel, so a list of forty
  // leads from one event shares one copy rather than fetching per row.
  const { data: event } = useEvent(eventId);
  const { template: whatsappTemplate } = useEventTemplate(eventId, 'whatsapp');
  const { template: emailTemplate } = useEventTemplate(eventId, 'email');

  const mergeContext = {
    name: lead?.name,
    company: lead?.company,
    event: event?.name,
    stall: event?.stallNumber,
    sender: user?.name,
    senderCompany: user?.company,
  };

  const call = async () => {
    if (!lead) return;
    const outcome = await openDialer(lead.phone);
    if (!outcome.ok) Alert.alert('Cannot call', outcome.message);
  };

  const whatsapp = async () => {
    if (!lead) return;
    const body = whatsappTemplate?.body ?? 'Hi {{name}}, great meeting you at {{event}}.';
    const outcome = await openWhatsApp(lead.phone, renderTemplate(body, mergeContext));
    if (!outcome.ok) {
      Alert.alert('Cannot open WhatsApp', outcome.message);
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
    if (!lead.email?.trim()) {
      Alert.alert('No email', 'This lead was captured without an email address.');
      return;
    }
    const body = emailTemplate?.body ?? 'Hi {{name}}, thank you for stopping by our stall.';
    const outcome = await openEmail(
      lead.email,
      renderTemplate(emailTemplate?.subject ?? 'Great meeting you at {{event}}', mergeContext),
      renderTemplate(body, mergeContext)
    );
    if (!outcome.ok) {
      Alert.alert('Cannot open mail', outcome.message);
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
      Alert.alert(
        outcome.reason === 'permission' ? 'Contacts is off' : 'Could not save',
        outcome.message
      );
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
  };
}
