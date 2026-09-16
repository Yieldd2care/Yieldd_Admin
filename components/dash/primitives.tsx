import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { Icon, ICON } from './controls';
import { Typography } from '../ui/Typography';

/**
 * The pieces every dashboard screen is built from. Values match the phone app's
 * vocabulary (`components/ui/Card.tsx`, `Button.tsx`, the leads screen's pills)
 * so the two surfaces read as one product.
 */

export function Panel({ className = '', children }: { className?: string; children: ReactNode }) {
  return <View className={`bg-white border border-hairline rounded-lg ${className}`}>{children}</View>;
}

/** 9.5px uppercase micro-label, as used above every number in the app. */
export function Cap({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <Typography
      className={`text-[9.5px] font-bold tracking-[0.08em] text-label ${className}`}
      style={{ textTransform: 'uppercase' }}
    >
      {children}
    </Typography>
  );
}

/**
 * A headline number.
 *
 * Pass `onPress` and the whole tile becomes the way into the rows behind it — a
 * count is not something you can act on, the records it counts are. A pressable
 * tile says so with a chevron and a border that answers on hover; a plain one
 * stays a plain card.
 *
 * The two branches are separate elements with static class lists rather than one
 * element with a conditional className. NativeWind can only set a component up
 * as a variable provider on its first render, so a class list that gains a
 * `hover:` or `shadow-*` later triggers a mid-life upgrade whose warning printer
 * throws the bogus "Couldn't find a navigation context" red screen — see
 * AGENTS.md.
 */
export function Stat({
  label,
  value,
  sub,
  valueClassName = 'text-navy',
  icon,
  onPress,
}: {
  label: string;
  value: string;
  sub?: string;
  valueClassName?: string;
  /** Sits opposite the label. A quiet marker for what the number is about. */
  icon?: ReactNode;
  /** Opens the records this number counts. */
  onPress?: () => void;
}) {
  const body = (
    <>
      <View className="flex-row items-start justify-between gap-3">
        <Cap>{label}</Cap>
        {icon ? (
          <View className="w-[34px] h-[34px] rounded-md bg-surface items-center justify-center shrink-0 -mt-[6px] -mr-[2px]">
            {icon}
          </View>
        ) : null}
      </View>
      <Typography className={`text-[30px] font-extrabold mt-[6px] tracking-tight ${valueClassName}`}>
        {value}
      </Typography>
      <View className="flex-row items-center justify-between gap-2 mt-[2px]">
        {sub ? (
          <Typography className="text-[12px] text-slate font-medium flex-1 min-w-0" numberOfLines={1}>
            {sub}
          </Typography>
        ) : (
          <View className="flex-1" />
        )}
        {onPress ? <Icon d={ICON.chevronRight} size={14} color="#8A98B0" width={2.2} /> : null}
      </View>
    </>
  );

  if (!onPress) {
    return <Panel className="flex-1 px-5 py-[18px]">{body}</Panel>;
  }

  return (
    <Pressable
      onPress={onPress}
      className="flex-1 bg-white border border-hairline rounded-lg px-5 py-[18px] hover:border-blue active:opacity-80"
    >
      {body}
    </Pressable>
  );
}

/**
 * A panel heading, with room for a quiet note or control opposite it.
 *
 * `onPress` makes the heading itself the way into the thing it names — used
 * where the panel is about one record, so its title is that record's front door.
 */
export function SectionTitle({
  title,
  right,
  onPress,
}: {
  title: string;
  right?: ReactNode;
  onPress?: () => void;
}) {
  return (
    <View className="flex-row items-center justify-between gap-3">
      {onPress ? (
        <Pressable onPress={onPress} className="flex-row items-center gap-[6px] shrink min-w-0 active:opacity-70">
          <Typography className="text-[16.5px] font-bold text-navy tracking-tight shrink min-w-0" numberOfLines={1}>
            {title}
          </Typography>
          <Icon d={ICON.chevronRight} size={15} color="#5A6B87" width={2.2} />
        </Pressable>
      ) : (
        <Typography className="text-[16.5px] font-bold text-navy tracking-tight shrink-0">{title}</Typography>
      )}
      {right}
    </View>
  );
}

/** A text link with the chevron the rest of the dashboard uses. */
export function LinkRow({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className="flex-row items-center gap-[5px] self-start">
      <Typography className="text-[12.5px] font-semibold text-blue">{label}</Typography>
      <Icon d={ICON.chevronRight} size={13} color="#1D3F8A" width={2.2} />
    </Pressable>
  );
}

/**
 * One outstanding job, with the number of records waiting behind it.
 *
 * A count of leads captured without a note is not a measurement, it is a job —
 * so the row is a button that opens exactly those records.
 */
export function TaskRow({
  icon,
  label,
  body,
  count,
  onPress,
  last = false,
}: {
  icon: string;
  label: string;
  body: string;
  count: number;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center gap-3 py-[13px] ${last ? '' : 'border-b border-section'}`}
    >
      <View className="w-[34px] h-[34px] rounded-md bg-surface items-center justify-center shrink-0">
        <Icon d={icon} size={16} color="#0B132B" />
      </View>
      <View className="flex-1 min-w-0">
        <Typography className="text-[13.5px] font-semibold text-navy" numberOfLines={1}>
          {label}
        </Typography>
        <Typography className="text-[11.5px] text-slate mt-[2px]" numberOfLines={1}>
          {body}
        </Typography>
      </View>
      <View className="min-w-[32px] h-6 rounded-full bg-surface px-[9px] items-center justify-center shrink-0">
        <Typography className="text-[12px] font-bold text-navy">{count}</Typography>
      </View>
      <Icon d={ICON.chevronRight} size={14} color="#97A3B8" width={2.2} />
    </Pressable>
  );
}

export function Pill({
  label,
  active = false,
  dot,
  onPress,
}: {
  label: string;
  active?: boolean;
  dot?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center rounded-full px-[14px] py-2 ${active ? 'bg-navy' : 'bg-surface'}`}
    >
      {dot ? <View className="w-[6px] h-[6px] rounded-full mr-[7px]" style={{ backgroundColor: dot }} /> : null}
      <Typography className={`text-[12.5px] font-bold ${active ? 'text-white' : 'text-navy'}`}>{label}</Typography>
    </Pressable>
  );
}

const TEMP_STYLES: Record<string, { bg: string; fg: string }> = {
  hot: { bg: '#FDECEC', fg: '#C4392E' },
  warm: { bg: '#FFF6E0', fg: '#8A6100' },
  cold: { bg: '#EEF1F7', fg: '#5A6B87' },
};

const STATUS_STYLES: Record<string, { bg: string; fg: string }> = {
  new: { bg: '#EEF1F7', fg: '#3C4C68' },
  contacted: { bg: '#E7EEFB', fg: '#1D3F8A' },
  qualified: { bg: '#FFF6E0', fg: '#8A6100' },
  won: { bg: '#E4F7EC', fg: '#1E7A45' },
  lost: { bg: '#F2F4F8', fg: '#8A98B0' },
  live: { bg: '#E4F7EC', fg: '#1E7A45' },
  upcoming: { bg: '#E7EEFB', fg: '#1D3F8A' },
  closed: { bg: '#EEF1F7', fg: '#5A6B87' },
  active: { bg: '#E4F7EC', fg: '#1E7A45' },
  invited: { bg: '#E7EEFB', fg: '#1D3F8A' },
  deactivated: { bg: '#F2F4F8', fg: '#8A98B0' },
  admin: { bg: '#FFF6E0', fg: '#8A6100' },
  rep: { bg: '#EEF1F7', fg: '#5A6B87' },
};

function chip(map: Record<string, { bg: string; fg: string }>, value: string | null | undefined) {
  if (!value) return null;
  const key = value.toLowerCase();
  const s = map[key];
  if (!s) return null;
  const label = value.charAt(0).toUpperCase() + value.slice(1);
  return (
    <View className="rounded-full px-[10px] py-[4px] self-start" style={{ backgroundColor: s.bg }}>
      <Typography className="text-[11px] font-bold" style={{ color: s.fg }}>
        {label}
      </Typography>
    </View>
  );
}

export const TempChip = ({ value }: { value: string | null | undefined }) => chip(TEMP_STYLES, value);
export const StatusChip = ({ value }: { value: string | null | undefined }) => chip(STATUS_STYLES, value);

/** A table row. `cols` are flex weights so header and body always line up. */
export function Row({
  cols,
  cells,
  header = false,
  last = false,
}: {
  cols: number[];
  cells: ReactNode[];
  header?: boolean;
  last?: boolean;
}) {
  return (
    <View
      className={`flex-row items-center px-5 ${header ? 'bg-section py-[11px]' : 'py-[14px]'} ${
        last ? '' : 'border-b border-hairline'
      }`}
    >
      {cells.map((cell, i) => (
        <View key={i} style={{ flex: cols[i] ?? 1 }} className="pr-3">
          {typeof cell === 'string' ? (
            header ? (
              <Cap>{cell}</Cap>
            ) : (
              <Typography className="text-[13px] text-ink-muted">{cell}</Typography>
            )
          ) : (
            cell
          )}
        </View>
      ))}
    </View>
  );
}

export function Empty({ title, body }: { title: string; body: string }) {
  return (
    <View className="items-center justify-center py-20 px-6">
      <Typography className="text-[15px] font-bold text-navy text-center">{title}</Typography>
      <Typography className="text-[13px] text-slate text-center mt-2 leading-[1.5] max-w-[320px]">{body}</Typography>
    </View>
  );
}

export function GoldButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      // The shadow class is identical in both states and only `opacity` moves.
      // A className that gains its first shadow-* after the first render makes
      // NativeWind try to upgrade the component mid-life, and the warning it
      // prints throws "Couldn't find a navigation context" — see AGENTS.md.
      className={`bg-gold rounded-md px-5 py-[11px] shadow-[0_10px_26px_rgba(244,176,0,0.34)] ${
        disabled ? 'opacity-40' : ''
      }`}
    >
      <Typography className="text-[13.5px] font-bold text-navy">{label}</Typography>
    </Pressable>
  );
}

export function GhostButton({ label, onPress }: { label: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} className="bg-white border border-hairline rounded-md px-[18px] py-[11px]">
      <Typography className="text-[13.5px] font-semibold text-navy">{label}</Typography>
    </Pressable>
  );
}
