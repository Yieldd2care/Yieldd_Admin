import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

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

export function Stat({
  label,
  value,
  sub,
  valueClassName = 'text-navy',
}: {
  label: string;
  value: string;
  sub?: string;
  valueClassName?: string;
}) {
  return (
    <Panel className="flex-1 px-5 py-[18px]">
      <Cap>{label}</Cap>
      <Typography className={`text-[30px] font-extrabold mt-[6px] tracking-tight ${valueClassName}`}>
        {value}
      </Typography>
      {sub ? <Typography className="text-[12px] text-slate font-medium mt-[2px]">{sub}</Typography> : null}
    </Panel>
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

export function GoldButton({ label, onPress }: { label: string; onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="bg-gold rounded-md px-5 py-[11px] shadow-[0_10px_26px_rgba(244,176,0,0.34)]"
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
