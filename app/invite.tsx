import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';

import { Typography } from '../components/ui/Typography';
import { Button } from '../components/ui/Button';
import { NavyGlowBackdrop } from '../components/app/NavyGlowBackdrop';
import { supabase } from '../lib/supabase';
import { useSessionStore } from '../stores/useSessionStore';

type Invite = {
  organization_name: string;
  event_name: string | null;
  inviter_name: string;
  invited_name: string | null;
  invite_role: 'admin' | 'rep';
  expires_at: string;
  is_valid: boolean;
};

/**
 * Invite landing screen — reached from a WhatsApp link.
 *
 * Deliberately at the route root rather than inside (auth): that group now
 * redirects anyone signed in straight to the app, which would bounce a
 * logged-in person off this screen before they could read it. Here, both
 * cases can be handled honestly.
 */
export default function InviteScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const [invite, setInvite] = useState<Invite | null>(null);
  const [checking, setChecking] = useState(true);

  const user = useSessionStore((s) => s.user);
  const setPendingInviteToken = useSessionStore((s) => s.setPendingInviteToken);
  const signOut = useSessionStore((s) => s.signOut);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!token) {
        setPendingInviteToken(null);
        setChecking(false);
        return;
      }
      // Checked BEFORE signup on purpose. If a stale token reaches signUp, the
      // database raises, and GoTrue rewrites that into "Database error saving
      // new user" — losing the one message that would have helped.
      const { data } = await supabase.rpc('peek_invite', { p_token: token });
      if (cancelled) return;

      const row = Array.isArray(data) ? (data[0] as Invite | undefined) : undefined;
      setInvite(row ?? null);
      setChecking(false);

      // Held in persisted state, because opening a link can cold-start the app.
      //
      // Clearing on an invalid link matters as much as setting it on a valid
      // one: open a good invite, then a dead one, and without this the good
      // token is still sitting there — quietly joining you to the first
      // organisation when you eventually sign up.
      setPendingInviteToken(row?.is_valid ? token : null);
    })();

    return () => {
      cancelled = true;
    };
  }, [token, setPendingInviteToken]);

  const Frame = ({ children }: { children: React.ReactNode }) => (
    <SafeAreaView className="flex-1 bg-navy" edges={['top', 'bottom']}>
      <NavyGlowBackdrop />
      <View className="flex-1 justify-center px-8">{children}</View>
    </SafeAreaView>
  );

  if (checking) {
    return (
      <Frame>
        <Typography className="text-[14px] text-white/[0.55] text-center">
          Checking your invite&hellip;
        </Typography>
      </Frame>
    );
  }

  if (!invite || !invite.is_valid) {
    return (
      <Frame>
        <Typography className="text-[22px] font-extrabold text-white text-center tracking-[-0.01em]">
          This invite has expired
        </Typography>
        <Typography className="mt-3 text-[13.5px] leading-[1.55] text-white/[0.60] text-center">
          {invite
            ? `Ask ${invite.inviter_name} to send you a fresh link.`
            : 'This link is no longer valid. Ask whoever invited you for a new one.'}
        </Typography>
        <Button
          label="Go to sign in"
          onPress={() => router.replace('/(auth)')}
          shape="pill"
          className="w-full mt-8"
        />
      </Frame>
    );
  }

  // Signed in already. One person belongs to exactly one organisation, so this
  // cannot be accepted without leaving the current one first.
  if (user) {
    return (
      <Frame>
        <Typography className="text-[22px] font-extrabold text-white text-center tracking-[-0.01em]">
          {invite.inviter_name} invited you to {invite.organization_name}
        </Typography>
        <Typography className="mt-3 text-[13.5px] leading-[1.55] text-white/[0.60] text-center">
          You&rsquo;re currently signed in as {user.name} at {user.company}. An account belongs to
          one company, so you&rsquo;ll need to sign out before accepting this.
        </Typography>
        <Button
          label="Sign out and accept"
          onPress={async () => {
            const keep = token ?? null;
            await signOut();
            // signOut clears the pending token along with everything else, so
            // put it back — the user is mid-way through accepting.
            setPendingInviteToken(keep);
            router.replace('/(auth)');
          }}
          shape="pill"
          className="w-full mt-8"
        />
        <Typography
          onPress={() => router.replace('/(app)')}
          className="mt-5 text-[12.5px] font-bold text-gold text-center"
        >
          Stay signed in as {user.name}
        </Typography>
      </Frame>
    );
  }

  return (
    <Frame>
      <Typography className="text-[12px] font-bold tracking-[0.14em] text-gold text-center">
        YOU&rsquo;VE BEEN INVITED
      </Typography>
      <Typography className="mt-4 text-[24px] leading-[1.25] font-extrabold text-white text-center tracking-[-0.01em]">
        {invite.inviter_name} invited you to join {invite.organization_name}
      </Typography>
      <Typography className="mt-3 text-[13.5px] leading-[1.55] text-white/[0.60] text-center">
        {invite.invite_role === 'admin' ? 'As an admin' : 'As a sales rep'}
        {invite.event_name ? ` for ${invite.event_name}` : ''}. Create your account and you&rsquo;ll
        join their team straight away.
      </Typography>

      <Button
        label="Create my account"
        onPress={() => router.replace('/(auth)')}
        shape="pill"
        className="w-full mt-8"
      />
    </Frame>
  );
}
