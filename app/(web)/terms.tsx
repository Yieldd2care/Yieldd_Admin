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
 * Deliberately short and readable. The app links here from Settings and from
 * the signup screen, so it is read by sales reps on a phone at an exhibition,
 * not by lawyers at a desk.
 */
export default function TermsScreen() {
  return (
    <LegalPage
      title="Terms of use"
      updated="31 August 2026"
      intro="These are the terms you agree to when you use Yieldd. We have kept them short and in plain English, because terms nobody can read protect nobody."
    >
      <LegalHeading>Who this agreement is with</LegalHeading>
      <LegalText>
        Yieldd is a product by Growth Saga. &ldquo;We&rdquo; and &ldquo;us&rdquo; mean Growth Saga.
        &ldquo;You&rdquo; means the person using Yieldd, and the organisation they use it for. By
        creating an account you accept these terms on behalf of that organisation.
      </LegalText>

      <LegalHeading>Your account</LegalHeading>
      <LegalBullet>
        Give us accurate details when you sign up, and keep them current. We rely on your contact
        number to reach you.
      </LegalBullet>
      <LegalBullet>
        Keep your sign-in to yourself. Anything done from your account is treated as done by you.
      </LegalBullet>
      <LegalBullet>
        An admin who invites reps is responsible for who they let in, and for removing people who
        leave.
      </LegalBullet>

      <LegalHeading>The leads you capture are your responsibility</LegalHeading>
      <LegalCallout>
        This is the most important clause here. Yieldd stores information about real people who did
        not sign up to Yieldd. You are the one who chose to collect it, and you are responsible for
        being allowed to.
      </LegalCallout>
      <LegalBullet>
        Only capture someone&apos;s details when they have knowingly given them to you, and use the
        consent switch on the capture screen honestly.
      </LegalBullet>
      <LegalBullet>
        Only contact them about what they actually spoke to you about. Do not use Yieldd to build
        lists for unsolicited marketing.
      </LegalBullet>
      <LegalBullet>
        If someone asks you to delete their details, do it. Tell us if you need help.
      </LegalBullet>
      <LegalBullet>
        Follow the law that applies to you — in India, that includes the Digital Personal Data
        Protection Act.
      </LegalBullet>

      <LegalHeading>What you may not do</LegalHeading>
      <LegalBullet>Buy, scrape or import contact lists that were not given to you directly.</LegalBullet>
      <LegalBullet>Use Yieldd to send spam, or anything unlawful, deceptive or harassing.</LegalBullet>
      <LegalBullet>
        Try to reach another organisation&apos;s data, break the service, or work around its
        limits.
      </LegalBullet>
      <LegalBullet>Resell Yieldd or pass your account to someone else without asking us.</LegalBullet>

      <LegalHeading>The AI features are assistants, not authorities</LegalHeading>
      <LegalText>
        Card reading, voice-note summaries and company summaries are produced automatically and can
        be wrong. A misread digit, a mis-heard word, a summary that misses the point — all of these
        are possible.
      </LegalText>
      <LegalCallout>
        Check what these features produce before you rely on it, and certainly before you send it
        to a customer. You remain responsible for what you send.
      </LegalCallout>

      <LegalHeading>Follow-ups are sent by you</LegalHeading>
      <LegalText>
        Yieldd prepares WhatsApp and email follow-ups and opens them in your own apps. You press
        send. That means the message comes from you, is subject to WhatsApp&apos;s and your mail
        provider&apos;s own rules, and is your responsibility.
      </LegalText>

      <LegalHeading>Plans and payment</LegalHeading>
      <LegalText>
        Some features and limits depend on your plan, and the current limits are shown in the app.
        If you take a paid plan, the price, billing period and refund position are what we state to
        you at the time you buy. We will tell you before any price change affects you.
      </LegalText>

      <LegalHeading>Your data stays yours</LegalHeading>
      <LegalText>
        Everything you put into Yieldd remains yours. We use it to run the service for you, as
        described in our privacy policy, and for nothing else. You can export your leads from the
        app at any time — do that before you close an account, because closing it deletes the data.
      </LegalText>

      <LegalHeading>Availability</LegalHeading>
      <LegalText>
        We work to keep Yieldd running, but we do not promise it will never be unavailable. We may
        change or withdraw features. If we make a change that materially reduces what you are
        paying for, we will tell you.
      </LegalText>

      <LegalHeading>Ending it</LegalHeading>
      <LegalText>
        You can stop using Yieldd and ask us to close your account at any time by writing to{' '}
        <LegalMail />. We may suspend or close an account that breaks these terms, particularly the
        section about the leads you capture. Where it is reasonable to do so, we will warn you
        first.
      </LegalText>

      <LegalHeading>Liability</LegalHeading>
      <LegalText>
        Yieldd is provided as it is. To the extent the law allows, we are not liable for lost
        profits, lost business or lost data, and our total liability is limited to what you paid us
        in the twelve months before the claim. Nothing here limits liability that cannot legally be
        limited.
      </LegalText>

      <LegalHeading>Changes to these terms</LegalHeading>
      <LegalText>
        If we change these terms we will update this page and the date at the top, and tell account
        holders directly when the change is significant. Continuing to use Yieldd after that means
        you accept the new terms.
      </LegalText>

      <LegalHeading>Governing law</LegalHeading>
      <LegalText>
        These terms are governed by the laws of India, and disputes go to the Indian courts.
      </LegalText>

      <LegalHeading>Contact</LegalHeading>
      <LegalText>
        Anything at all — <LegalMail />.
      </LegalText>

      <LegalText>
        <LegalStrong>See also: </LegalStrong>
        our privacy policy, which explains what we do with information and who else handles it.
      </LegalText>
    </LegalPage>
  );
}
