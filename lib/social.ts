/**
 * Yieldd's own social accounts.
 *
 * One list, read by both the app's Settings screen and the website footer. The
 * two render it completely differently — a settings row is not a footer icon —
 * but the URLs themselves must not live in two places, or a changed handle gets
 * fixed on the website and left wrong in the app for months.
 *
 * These are ours and hardcoded, so they do not go through `safeExternalUrl` the
 * way a link typed onto a business card does. That check exists to stop a
 * `javascript:` URL somebody else supplied; there is no untrusted input here.
 */
export type SocialAccount = {
  key: 'instagram' | 'facebook' | 'linkedin';
  label: string;
  /** Shown beside the row in the app, where a bare URL is unreadable at 12px. */
  handle: string;
  url: string;
};

export const SOCIAL_ACCOUNTS: readonly SocialAccount[] = [
  {
    key: 'instagram',
    label: 'Instagram',
    handle: '@yieldd.co',
    url: 'https://www.instagram.com/yieldd.co/',
  },
  {
    key: 'facebook',
    label: 'Facebook',
    handle: 'Yieldd',
    // A numeric profile URL rather than a vanity one, because that is what the
    // page currently has. Swapping in /yieldd later is a one-line change here.
    url: 'https://www.facebook.com/profile.php?id=61594168014763',
  },
  {
    key: 'linkedin',
    label: 'LinkedIn',
    handle: 'yieldd',
    url: 'https://www.linkedin.com/company/yieldd/',
  },
];
