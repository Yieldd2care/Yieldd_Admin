import type { ReactNode } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Link, usePathname } from 'expo-router';
import Svg, { Path } from 'react-native-svg';

import { Typography } from '../ui/Typography';
import { useSessionStore } from '../../stores/useSessionStore';

/**
 * The frame every dashboard screen sits in: a fixed navy rail on the left, a
 * white title bar, and a scrolling body.
 *
 * Web only. Nothing here is imported by the phone app — the tab bar in
 * `app/(app)/(tabs)/_layout.tsx` stays the only navigation on native.
 */

const ACTIVE = '#FFFFFF';
const IDLE = 'rgba(255,255,255,0.55)';

function NavIcon({ d, color }: { d: string; color: string }) {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      {d.split('|').map((seg) => (
        <Path key={seg} d={seg} />
      ))}
    </Svg>
  );
}

const SETTINGS_D =
  'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z|M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.65 1.65 0 0 0 15 19.4a1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9v.09a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z';

/** `|` separates sub-paths, so each nav item stays one string. */
const NAV = [
  { href: '/(dash)', label: 'Home', d: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z' },
  { href: '/(dash)/leads', label: 'Leads', d: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2|M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0' },
  { href: '/(dash)/events', label: 'Events', d: 'M5 4h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z|M16 2v4|M8 2v4|M3 10h18' },
  { href: '/(dash)/follow-ups', label: 'Follow-ups', d: 'M22 11.1V12a10 10 0 1 1-5.9-9.1|M9 11l3 3L22 4' },
  { href: '/(dash)/team', label: 'Team', d: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2|M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0|M23 21v-2a4 4 0 0 0-3-3.87' },
  { href: '/(dash)/templates', label: 'Templates', d: 'M4 4h16v12H8l-4 4z' },
  { href: '/(dash)/export', label: 'Export', d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4|M7 10l5 5 5-5|M12 15V3' },
  { href: '/(dash)/settings', label: 'Settings', d: SETTINGS_D },
] as const;

function initialsOf(name: string | undefined) {
  if (!name) return '—';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '—';
}

/** True when `href` is the screen currently showing. */
function isActive(pathname: string, href: string) {
  const path = href.replace('/(dash)', '') || '/';
  if (path === '/') return pathname === '/' || pathname === '/(dash)';
  return pathname.startsWith(path);
}

export function DashShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const user = useSessionStore((s) => s.user);

  return (
    <View className="flex-1 flex-row bg-section">
      <View className="w-[240px] bg-navy py-6 shrink-0">
        <View className="flex-row items-center gap-[10px] px-[22px] pb-[26px]">
          <View className="w-7 h-7 rounded-lg bg-gold items-center justify-center">
            <Typography className="text-[15px] font-extrabold text-navy">Y</Typography>
          </View>
          <Typography className="text-[17px] font-extrabold text-white tracking-tight">Yieldd</Typography>
        </View>

        <View className="gap-[2px]">
          {NAV.map((item) => {
            const on = isActive(pathname, item.href);
            return (
              <Link key={item.href} href={item.href as never} asChild>
                <Pressable
                  className={`flex-row items-center gap-[11px] px-[22px] py-[9px] ${
                    on ? 'bg-navy-elevated' : 'bg-transparent'
                  }`}
                >
                  {on ? <View className="absolute left-0 top-0 bottom-0 w-[3px] bg-gold" /> : null}
                  <NavIcon d={item.d} color={on ? ACTIVE : IDLE} />
                  <Typography
                    className={`text-[13.5px] ${on ? 'text-white font-semibold' : 'text-white/55 font-medium'}`}
                  >
                    {item.label}
                  </Typography>
                </Pressable>
              </Link>
            );
          })}

          {/* Sits with the nav rather than on the profile block, so leaving is
              always one click from wherever you are. */}
          <Pressable
            onPress={() => void useSessionStore.getState().signOut()}
            className="flex-row items-center gap-[11px] px-[22px] py-[9px] bg-transparent"
          >
            <NavIcon d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4|M16 17l5-5-5-5|M21 12H9" color={IDLE} />
            <Typography className="text-[13.5px] font-medium text-white/55">Log out</Typography>
          </Pressable>
        </View>

        <View className="mt-auto px-[22px] pt-4 border-t border-white/10 flex-row items-center gap-[10px]">
          <View className="w-8 h-8 rounded-full bg-blue items-center justify-center">
            <Typography className="text-[12.5px] font-bold text-white">{initialsOf(user?.name)}</Typography>
          </View>
          <View className="flex-1 min-w-0">
            <Typography className="text-[13px] font-semibold text-white" numberOfLines={1}>
              {user?.name ?? 'Signed in'}
            </Typography>
            <Typography className="text-[11px] font-medium text-white/45">
              {user?.role === 'admin' ? 'Admin' : 'Rep'}
            </Typography>
          </View>
        </View>
      </View>

      <View className="flex-1 min-w-0">
        <View className="bg-white border-b border-hairline px-8 py-5 flex-row items-center justify-between">
          <View className="min-w-0">
            <Typography className="text-[26px] font-extrabold text-navy tracking-tight">{title}</Typography>
            {subtitle ? <Typography className="text-[13px] text-slate mt-[3px]">{subtitle}</Typography> : null}
          </View>
          <View className="flex-row items-center gap-[10px]">{actions}</View>
        </View>

        <ScrollView contentContainerClassName="px-8 py-6">{children}</ScrollView>
      </View>
    </View>
  );
}
