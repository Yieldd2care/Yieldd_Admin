import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Link, useRouter, usePathname } from 'expo-router';
import Svg, { Path } from 'react-native-svg';

import { Typography } from '../ui/Typography';
import { Avatar, Icon, ICON, SearchField } from './controls';
import { useSessionStore } from '../../stores/useSessionStore';
import { useLeadsStore } from '../../stores/useLeadsStore';

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

/**
 * Nine destinations in one flat column is a wall of words — by the eighth
 * label you are reading rather than aiming. Three headed groups of three
 * turns it back into three short lists.
 *
 * `|` separates sub-paths, so each nav item stays one string.
 */
const NAV: { heading: string | null; items: { href: string; label: string; d: string }[] }[] = [
  {
    heading: null,
    items: [{ href: '/(dash)', label: 'Home', d: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z' }],
  },
  {
    heading: 'Workspace',
    items: [
      { href: '/(dash)/leads', label: 'Leads', d: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2|M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0' },
      { href: '/(dash)/events', label: 'Events', d: 'M5 4h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z|M16 2v4|M8 2v4|M3 10h18' },
    ],
  },
  {
    heading: 'Outreach',
    items: [
      { href: '/(dash)/follow-ups', label: 'Follow-ups', d: 'M22 11.1V12a10 10 0 1 1-5.9-9.1|M9 11l3 3L22 4' },
      { href: '/(dash)/templates', label: 'Templates', d: 'M4 4h16v12H8l-4 4z' },
      { href: '/(dash)/card', label: 'Digital card', d: ICON.qr },
    ],
  },
  {
    heading: 'Organisation',
    items: [
      { href: '/(dash)/team', label: 'Team', d: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2|M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0|M23 21v-2a4 4 0 0 0-3-3.87' },
      { href: '/(dash)/export', label: 'Export', d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4|M7 10l5 5 5-5|M12 15V3' },
      { href: '/(dash)/settings', label: 'Settings', d: SETTINGS_D },
    ],
  },
];

/** True when `href` is the screen currently showing. */
function isActive(pathname: string, href: string) {
  const path = href.replace('/(dash)', '') || '/';
  if (path === '/') return pathname === '/' || pathname === '/(dash)';
  return pathname.startsWith(path);
}

/**
 * Find a lead from anywhere in the dashboard.
 *
 * A rep works one show and has a few hundred rows; an admin sees the whole
 * organisation's and can have thousands. Paging to a name you already know is
 * the wrong shape of work, so this matches name, company and phone at once
 * and jumps straight to the lead.
 *
 * The store hands over the array and every derivation happens here. Filtering
 * inside the selector would allocate a new array on every call and re-render
 * without end.
 */
function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const leads = useLeadsStore((s) => s.leads);

  const hits = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    const digits = q.replace(/\D/g, '');
    return leads
      .filter((l) => {
        if (l.name?.toLowerCase().includes(q)) return true;
        if (l.company?.toLowerCase().includes(q)) return true;
        if (digits.length >= 4 && l.phone?.replace(/\D/g, '').includes(digits)) return true;
        return false;
      })
      .slice(0, 7);
  }, [leads, query]);

  const open = query.trim().length >= 2;

  return (
    <View style={{ zIndex: open ? 60 : 1 }}>
      <SearchField value={query} onChange={setQuery} placeholder="Search leads" width={264} />

      {open ? (
        <>
          <Pressable
            onPress={() => setQuery('')}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 } as never}
          />
          <View
            className="absolute bg-white border border-hairline rounded-md py-[6px] shadow-[0_18px_44px_rgba(11,19,43,0.18)]"
            style={{ top: 44, right: 0, width: 320 }}
          >
            {hits.length ? (
              hits.map((l) => (
                <Pressable
                  key={l.id}
                  onPress={() => {
                    setQuery('');
                    router.push(`/(dash)/leads/${l.id}`);
                  }}
                  className="flex-row items-center gap-[10px] px-[13px] py-[8px]"
                >
                  <Avatar name={l.name} size={28} tone="surface" />
                  <View className="flex-1 min-w-0">
                    <Typography className="text-[12.5px] font-semibold text-navy" numberOfLines={1}>
                      {l.name || 'Unnamed'}
                    </Typography>
                    <Typography className="text-[11px] text-label" numberOfLines={1}>
                      {[l.company, l.phone].filter(Boolean).join(' · ') || 'No company'}
                    </Typography>
                  </View>
                </Pressable>
              ))
            ) : (
              <Typography className="text-[12.5px] text-slate px-[13px] py-[10px]">
                Nothing matches “{query.trim()}”.
              </Typography>
            )}
          </View>
        </>
      ) : null}
    </View>
  );
}

export function DashShell({
  title,
  subtitle,
  actions,
  scope,
  breadcrumb,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  /**
   * The control that says what the whole page is showing — on most screens
   * the event switcher. It sits in the title bar rather than in the body
   * because everything below it is scoped by it, and a scope control buried
   * among the panels reads as just another filter.
   */
  scope?: ReactNode;
  /**
   * The trail back out of a detail page — `[{ label: 'Events', href: '/(dash)/events' }]`.
   * The dashboard's list screens are all top level, so until now there was
   * nowhere to go back to; ROI, the event dashboard and Edit need one.
   */
  breadcrumb?: { label: string; href: string }[];
  children: ReactNode;
}) {
  const pathname = usePathname();
  const user = useSessionStore((s) => s.user);

  return (
    <View className="flex-1 flex-row bg-section">
      <View className="w-[240px] bg-navy py-6 shrink-0">
        <View className="flex-row items-center gap-[10px] px-[22px] pb-[22px]">
          <View className="w-7 h-7 rounded-lg bg-gold items-center justify-center">
            <Typography className="text-[15px] font-extrabold text-navy">Y</Typography>
          </View>
          <Typography className="text-[17px] font-extrabold text-white tracking-tight">Yieldd</Typography>
        </View>

        {NAV.map((group) => (
          <View key={group.heading ?? 'top'} className={group.heading ? 'mt-[18px]' : ''}>
            {group.heading ? (
              <Typography
                className="text-[9.5px] font-bold tracking-[0.09em] text-white/35 px-[22px] pb-[7px]"
                style={{ textTransform: 'uppercase' }}
              >
                {group.heading}
              </Typography>
            ) : null}

            <View className="gap-[2px]">
              {group.items.map((item) => {
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
            </View>
          </View>
        ))}

        {/* Sits with the nav rather than on the profile block, so leaving is
            always one click from wherever you are. */}
        <Pressable
          onPress={() => void useSessionStore.getState().signOut()}
          className="flex-row items-center gap-[11px] px-[22px] py-[9px] mt-[18px] bg-transparent"
        >
          <NavIcon d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4|M16 17l5-5-5-5|M21 12H9" color={IDLE} />
          <Typography className="text-[13.5px] font-medium text-white/55">Log out</Typography>
        </Pressable>

        <View className="mt-auto px-[22px] pt-4 border-t border-white/10 flex-row items-center gap-[10px]">
          <Avatar name={user?.name} size={32} tone="blue" />
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
        {/*
          The z-indexes on this row and the scroller below it are load-bearing,
          not decoration.

          The header and the content are siblings, and the content comes second
          in the tree. Without an explicit order the browser paints it last, so
          anything the header opens downwards — the event menu, a date range —
          came out UNDERNEATH the panels it was overlapping. Raising the inner
          menu on its own could not fix that: it only reorders it within the
          header. The two have to be ranked against each other here.
        */}
        <View
          className="bg-white border-b border-hairline px-8 py-5 flex-row items-center justify-between"
          style={{ zIndex: 30 }}
        >
          <View className="min-w-0">
            {breadcrumb?.length ? (
              <View className="flex-row items-center gap-[6px] mb-[6px]">
                {breadcrumb.map((crumb) => (
                  <View key={crumb.href} className="flex-row items-center gap-[6px]">
                    <Link href={crumb.href as never} asChild>
                      <Pressable>
                        <Typography className="text-[12.5px] font-semibold text-blue">{crumb.label}</Typography>
                      </Pressable>
                    </Link>
                    <Icon d={ICON.chevronRight} size={13} color="#97A3B8" width={2} />
                  </View>
                ))}
              </View>
            ) : null}
            <Typography className="text-[26px] font-extrabold text-navy tracking-tight">{title}</Typography>
            {subtitle ? <Typography className="text-[13px] text-slate mt-[3px]">{subtitle}</Typography> : null}
          </View>

          <View className="flex-row items-center gap-[10px] shrink-0">
            <GlobalSearch />
            {scope}
            {actions}
          </View>
        </View>

        <ScrollView contentContainerClassName="px-8 py-6" style={{ zIndex: 0 }}>
          {children}
        </ScrollView>
      </View>
    </View>
  );
}
