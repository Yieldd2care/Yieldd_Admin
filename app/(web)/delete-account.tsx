import {
  LegalBullet,
  LegalCallout,
  LegalHeading,
  LegalMail,
  LegalPage,
  LegalStrong,
  LegalText,
} from '../../components/web/LegalPage';

/**
 * The public "how do I delete my account" page.
 *
 * Google Play wants a URL it can put in the store listing — reachable without
 * installing the app or signing in, which is the whole point: someone who has
 * already uninstalled still has to be able to find out how to be erased.
 *
 * It describes the same two outcomes the app itself does. If the behaviour in
 * `supabase/migrations/20260831120000_account_deletion.sql` ever changes, this
 * page changes with it.
 */
export default function DeleteAccountInfoScreen() {
  return (
    <LegalPage
      title="Deleting your Yieldd account"
      updated="31 August 2026"
      intro="You can delete your Yieldd account and its data from inside the app, or by writing to us. This page explains how, and exactly what goes."
    >
      <LegalHeading>Delete it yourself, in the app</LegalHeading>
      <LegalBullet>Open Yieldd and go to the Settings tab.</LegalBullet>
      <LegalBullet>Scroll to the bottom and tap Delete account.</LegalBullet>
      <LegalBullet>
        The next screen shows exactly what will be removed for your account, including how many
        leads and whether your whole organisation goes with it.
      </LegalBullet>
      <LegalBullet>Type DELETE to confirm.</LegalBullet>
      <LegalText>It happens immediately, and it cannot be undone.</LegalText>

      <LegalHeading>Or ask us</LegalHeading>
      <LegalText>
        If you have already uninstalled the app, or you cannot sign in, email <LegalMail /> from
        the address on the account. We will action it within 30 days and confirm when it is done.
      </LegalText>

      <LegalHeading>What happens depends on who is left</LegalHeading>
      <LegalText>
        Yieldd accounts belong to an organisation, so deleting yours has to answer a second
        question: does the company carry on without you?
      </LegalText>
      <LegalBullet>
        <LegalStrong>If another admin remains </LegalStrong>— only your account goes. Your login,
        your profile and your digital business card are deleted. The leads you captured stay with
        your organisation and move to the remaining admin, because they are the company&apos;s
        records, not yours to take away.
      </LegalBullet>
      <LegalBullet>
        <LegalStrong>If no admin remains </LegalStrong>— the organisation goes with you. Every
        event, every lead, every business card photo and voice note, and the accounts of any
        remaining team members. If you use Yieldd on your own, this is always what happens,
        because a solo account is an organisation of one.
      </LegalBullet>
      <LegalCallout>
        Export your leads before you delete, if you want to keep them. Settings → Export leads
        gives you a spreadsheet. Once deletion runs there is nothing left to export.
      </LegalCallout>

      <LegalHeading>What is deleted</LegalHeading>
      <LegalBullet>Your login, name, email, phone number, job title and company.</LegalBullet>
      <LegalBullet>Your digital business card and its public page.</LegalBullet>
      <LegalBullet>
        Where the organisation is deleted too: all leads and their notes, all business card
        photos, all voice recordings, their transcripts and summaries, all events, and all
        message templates.
      </LegalBullet>

      <LegalHeading>What is kept, and why</LegalHeading>
      <LegalBullet>
        <LegalStrong>Leads you captured, when a colleague carries on. </LegalStrong>
        They belong to your organisation, which collected them, and that company still needs its
        own customer records.
      </LegalBullet>
      <LegalBullet>
        <LegalStrong>Records we are legally required to keep </LegalStrong>— for example invoices
        and tax records, if you ever paid for a plan. These are kept only for as long as the law
        requires and are not used for anything else.
      </LegalBullet>
      <LegalText>
        Anything else is removed. If you want to know what is held about you before deciding,
        write to <LegalMail /> and ask — you are entitled to that.
      </LegalText>

      <LegalHeading>If your details were captured by someone else</LegalHeading>
      <LegalText>
        If a company scanned your business card at an exhibition, that company holds your details,
        not us — we store them on its behalf. Ask them directly, and email <LegalMail /> as well;
        we will pass it on and help make sure it happens. You do not need a Yieldd account to make
        that request.
      </LegalText>
    </LegalPage>
  );
}
