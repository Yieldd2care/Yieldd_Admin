import {
  LegalBullet,
  LegalCallout,
  LegalHeading,
  LegalLink,
  LegalMail,
  LegalPage,
  LegalStrong,
  LegalText,
} from '../../components/web/LegalPage';

/**
 * Written from what the app actually does, not from a template.
 *
 * Every service named below is one the code really calls, and every store of
 * files named is one that really exists. If a feature changes, this page
 * changes with it — a privacy policy that drifts from the product is worse
 * than none, because it is a promise nobody is keeping.
 */
export default function PrivacyScreen() {
  return (
    <LegalPage
      title="Privacy policy"
      updated="31 August 2026"
      intro="Yieldd captures leads at exhibitions. That means we hold information about two different groups of people — the people who use Yieldd, and the people whose business cards they scan. This policy covers both, and is specific about which is which."
    >
      <LegalHeading>Who we are</LegalHeading>
      <LegalText>
        Yieldd is a product by Growth Saga. Anything in this policy, and any request about your
        information, can be raised with us at <LegalMail /> — that address is also our contact for
        grievances under India&apos;s Digital Personal Data Protection Act.
      </LegalText>

      <LegalHeading>The two groups of people in this policy</LegalHeading>
      <LegalText>This distinction matters, so it comes first rather than being buried.</LegalText>
      <LegalBullet>
        <LegalStrong>Users. </LegalStrong>
        People who sign in to Yieldd — an admin who sets up an organisation, and the sales reps on
        their team. We decide how their information is handled, so this policy governs it directly.
      </LegalBullet>
      <LegalBullet>
        <LegalStrong>Leads. </LegalStrong>
        People whose details a rep captures at an event. We store that information on behalf of the
        organisation that captured it. That organisation decided to collect it and is responsible
        for having a proper reason to. We hold and process it for them.
      </LegalBullet>
      <LegalCallout>
        If your card was scanned at an exhibition and you want your details removed, the fastest
        route is the company whose stall you visited. Write to us at care@yieldd.co as well and we
        will pass it on and help make sure it happens.
      </LegalCallout>

      <LegalHeading>What we collect about users</LegalHeading>
      <LegalBullet>
        Name, work email, phone number, company name and job title, given at signup.
      </LegalBullet>
      <LegalBullet>
        Your role in the organisation — admin or rep — and which events you are assigned to.
      </LegalBullet>
      <LegalBullet>
        If you sign in with Google, we receive your name and email address from Google and nothing
        else. No contacts, no calendar, no Drive, no access to your Google account.
      </LegalBullet>
      <LegalBullet>
        Basic technical information needed to keep you signed in and to keep the service running.
      </LegalBullet>
      <LegalText>
        We do not use advertising trackers, and we do not sell anything about you to anybody.
      </LegalText>

      <LegalHeading>What we store about leads</LegalHeading>
      <LegalText>
        When a rep captures a lead, we store what is on the card and what the rep adds: name, job
        title, phone, landline, email, company, company website, address, and the rep&apos;s notes.
        The capture screen carries a consent switch, which the rep is expected to use honestly at
        the moment of the conversation.
      </LegalText>
      <LegalBullet>
        <LegalStrong>Business card photos </LegalStrong>
        are stored privately. Only the organisation that captured the lead can open them.
      </LegalBullet>
      <LegalBullet>
        <LegalStrong>Voice notes </LegalStrong>
        a rep records about a conversation are stored privately, along with their transcript and
        summary.
      </LegalBullet>
      <LegalBullet>
        Files an organisation attaches to its own follow-up message templates.
      </LegalBullet>

      <LegalHeading>How we use AI, and what leaves our systems</LegalHeading>
      <LegalText>
        Some features work by sending content to specialist providers. We would rather name them
        than describe them vaguely:
      </LegalText>
      <LegalBullet>
        <LegalStrong>Reading a business card. </LegalStrong>
        The photo is sent to Anthropic (Claude), which returns the text printed on it. The rep
        checks the result before the lead is saved.
      </LegalBullet>
      <LegalBullet>
        <LegalStrong>Voice notes. </LegalStrong>
        The recording is sent to Deepgram to be turned into text, and that text is sent to
        Anthropic for a short summary.
      </LegalBullet>
      <LegalBullet>
        <LegalStrong>Company summaries. </LegalStrong>
        We fetch pages from the company&apos;s own public website and send that page text to
        Anthropic for a summary. We do not send it your lead&apos;s personal details.
      </LegalBullet>
      <LegalText>
        These providers process this content to return a result to us. They are not permitted to
        use it to train their models.
      </LegalText>

      <LegalHeading>Your digital business card is public</LegalHeading>
      <LegalCallout>
        If you publish a digital business card, its page and its photo are readable by anyone with
        the link, without signing in. That is the point of it — but it means whatever you put on
        that card is public. Do not put anything there you would not hand to a stranger.
      </LegalCallout>
      <LegalText>
        You can unpublish your card at any time from the app. Everything else you store in Yieldd
        is private to your organisation.
      </LegalText>

      <LegalHeading>Who else handles your information</LegalHeading>
      <LegalBullet>
        <LegalStrong>Supabase </LegalStrong>— hosting, database, sign-in and file storage. This is
        where your data lives.
      </LegalBullet>
      <LegalBullet>
        <LegalStrong>Anthropic </LegalStrong>— reads business card photos, and writes voice-note
        and company summaries.
      </LegalBullet>
      <LegalBullet>
        <LegalStrong>Deepgram </LegalStrong>— turns voice recordings into text.
      </LegalBullet>
      <LegalBullet>
        <LegalStrong>Google </LegalStrong>— only if you choose to sign in with Google.
      </LegalBullet>
      <LegalText>
        Some of these providers operate outside India, so your information may be processed abroad.
        We will also disclose information if the law genuinely requires it.
      </LegalText>

      <LegalHeading>Follow-ups are sent by your rep, not by us</LegalHeading>
      <LegalText>
        When a rep follows up on WhatsApp or by email, Yieldd opens their own WhatsApp or mail app
        with the message ready and they press send. We do not send messages on anyone&apos;s
        behalf, and we do not have access to their WhatsApp or their mailbox.
      </LegalText>

      <LegalHeading>How long we keep it</LegalHeading>
      <LegalText>
        We keep your account and your organisation&apos;s leads for as long as the account is open,
        because that history is what the product is for. When an account is closed we delete its
        data, other than anything we are required to keep by law.
      </LegalText>

      <LegalHeading>Deleting your account</LegalHeading>
      <LegalText>
        You can delete your account and its data yourself, from inside the app: Settings, then
        Delete account at the bottom. The screen shows you exactly what will go before you
        confirm, including whether your whole organisation goes with it. It is immediate and
        cannot be undone.
      </LegalText>
      <LegalText>
        <LegalLink href="/delete-account">What deletion removes, in full</LegalLink> — including
        what is kept when a colleague carries on running the organisation, and how to ask if you
        can no longer sign in.
      </LegalText>

      <LegalHeading>Your other rights</LegalHeading>
      <LegalText>
        You can ask us to show you what we hold about you, or correct it. Email <LegalMail /> and
        we will act within 30 days. If you are a rep, note that leads you captured belong to your
        organisation&apos;s account, so a request about those goes to your admin — we will help
        you reach the right person.
      </LegalText>

      <LegalHeading>Security</LegalHeading>
      <LegalText>
        Information is encrypted in transit and at rest. Access is enforced per organisation at the
        database itself, not merely hidden in the app, so one company cannot read another&apos;s
        leads. Card photos, voice notes and template attachments are held in private storage that
        cannot be read without permission.
      </LegalText>

      <LegalHeading>Children</LegalHeading>
      <LegalText>
        Yieldd is a tool for work and is not intended for anyone under 18. We do not knowingly
        collect information about children.
      </LegalText>

      <LegalHeading>Changes to this policy</LegalHeading>
      <LegalText>
        If we change how any of this works, we will change this page and update the date at the
        top. If a change is significant, we will tell account holders directly rather than relying
        on you to notice.
      </LegalText>

      <LegalHeading>Contact</LegalHeading>
      <LegalText>
        Questions, requests and complaints all go to <LegalMail />. A real person reads it.
      </LegalText>
    </LegalPage>
  );
}
