import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { Typography } from '../ui/Typography';

/**
 * The warm corner on the navy panel.
 *
 * Not `RadialGlow`: its three flat circles have visible edges, and at the
 * opacities it defaults to the outermost one reads as a dirty brown disc sitting
 * behind whatever metric happens to be on the right. This stacks more rings at
 * lower opacity and keeps the dense core off-canvas, so what lands on the panel
 * is a wash rather than a shape. React Native has no radial-gradient primitive;
 * this is the honest approximation.
 */
function SoftGlow() {
  // Ten rings at a low, equal opacity: enough steps that the falloff reads as
  // smooth rather than as a stack of discs. Five was still visibly banded.
  const rings = Array.from({ length: 10 }, (_, i) => ({
    size: 460 - i * 44,
    opacity: 0.028,
  }));
  return (
    <View pointerEvents="none" className="absolute" style={{ top: -250, right: -170 }}>
      {rings.map((r) => (
        <View
          key={r.size}
          className="absolute rounded-full"
          style={{
            width: r.size,
            height: r.size,
            // Concentric: each ring centred on the same point as the largest.
            top: (460 - r.size) / 2,
            left: (460 - r.size) / 2,
            backgroundColor: '#F4B000',
            opacity: r.opacity,
          }}
        />
      ))}
      <View style={{ width: 460, height: 460 }} />
    </View>
  );
}

/**
 * The inverted band at the top of a dashboard screen.
 *
 * One per page at most, and only where the page has a headline to make — a
 * number someone would screenshot, or the identity of the thing being looked
 * at. A page that is just a list does not get one; the band is what says "this
 * is the point", and if every page claims that, none of them do.
 *
 * The gradient is a background FILL, not the layout box. `LinearGradient` has
 * no `cssInterop` registration (see `lib/nativewind-interop.ts`), so every
 * className handed to it is dropped silently — padding, radius and
 * `overflow-hidden` included. The shape belongs to a plain View, which
 * NativeWind does style.
 */
export function Hero({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <View className={`rounded-[20px] overflow-hidden px-7 py-[26px] shadow-[0_22px_46px_rgba(11,19,43,0.30)] ${className}`}>
      <LinearGradient
        colors={['#101C3E', '#0B132B']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <SoftGlow />
      {children}
    </View>
  );
}

/** The greeting / identity side of a hero. Wrap it in the column you want. */
export function HeroTitle({ title, sub, live = false }: { title: string; sub?: ReactNode; live?: boolean }) {
  return (
    <View>
      <Typography className="text-[28px] font-extrabold text-white tracking-tight" numberOfLines={1}>
        {title}
      </Typography>
      {sub ? (
        <View className="flex-row items-center gap-[7px] mt-[7px]">
          {live ? <View className="w-[7px] h-[7px] rounded-full bg-success" /> : null}
          <Typography className="text-[13px] font-medium text-white/65 flex-1 min-w-0" numberOfLines={1}>
            {sub}
          </Typography>
        </View>
      ) : null}
    </View>
  );
}

/**
 * One readout inside a hero.
 *
 * Deliberately not a `Stat`: these sit on the navy panel, share its baseline and
 * carry no card of their own. A tile here would put a box inside a box.
 */
export function HeroMetric({
  label,
  value,
  note,
  onPress,
  large = false,
  valueClassName = 'text-white',
}: {
  label: string;
  value: string;
  note?: string;
  /** Opens whatever this number is a summary of. */
  onPress?: () => void;
  /** For the one figure a page exists to show. At most one per hero. */
  large?: boolean;
  valueClassName?: string;
}) {
  const body = (
    <>
      <Typography
        className="text-[10.5px] font-bold tracking-[0.12em] text-white/60"
        style={{ textTransform: 'uppercase' }}
      >
        {label}
      </Typography>
      <Typography
        className={`font-extrabold tracking-tight mt-[12px] ${large ? 'text-[44px]' : 'text-[34px]'} ${valueClassName}`}
      >
        {value}
      </Typography>
      {note ? <Typography className="text-[11.5px] font-medium text-white/60 mt-[9px]">{note}</Typography> : null}
    </>
  );

  // Separate elements rather than one conditional className: NativeWind can only
  // set a component up as a variable provider on its first render.
  if (!onPress) return <View className="shrink-0">{body}</View>;
  return (
    <Pressable onPress={onPress} className="shrink-0 hover:opacity-80 active:opacity-70">
      {body}
    </Pressable>
  );
}

/** The row a hero's metrics sit in, right-aligned against the title. */
export function HeroMetrics({ children }: { children: ReactNode }) {
  return <View className="flex-row gap-11 shrink-0">{children}</View>;
}

/** A colour key under a hero bar, matching a segment to what it means. */
export function HeroKey({ color, label, rule = false }: { color: string; label: string; rule?: boolean }) {
  return (
    <View className="flex-row items-center gap-[6px]">
      <View
        className={rule ? 'rounded-sm' : 'rounded-full'}
        style={rule ? { width: 2, height: 11, backgroundColor: color } : { width: 8, height: 8, backgroundColor: color }}
      />
      <Typography className="text-[11.5px] font-semibold text-white/70">{label}</Typography>
    </View>
  );
}
