import { useState, type ReactNode } from 'react';
import { Pressable, TextInput, View, type GestureResponderEvent } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { Typography } from '../ui/Typography';

/**
 * The controls the dashboard grew when it stopped being four screens.
 *
 * `primitives.tsx` holds the pieces that match the phone app's vocabulary —
 * Panel, Stat, Pill, Row, the chips. These are the desktop-only ones: a
 * dropdown, a donut, a search field, a checkbox. Nothing here is imported by
 * native.
 *
 * Every shadow below is on a component that mounts with it already in the
 * class list. A className that GAINS its first `shadow-*` later makes
 * NativeWind try to upgrade the component mid-life and throws an unrelated
 * navigation error — see AGENTS.md.
 */

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

/** `|` separates sub-paths so each icon stays one string. */
export const ICON = {
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z|m21 21-4.35-4.35',
  chevronDown: 'm6 9 6 6 6-6',
  chevronRight: 'm9 18 6-6-6-6',
  chevronLeft: 'm15 18-6-6 6-6',
  check: 'M20 6 9 17l-5-5',
  mail: 'M4 4h16v16H4z|m4 6 8 6 8-6',
  phone: 'M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.2 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.1 9.9a16 16 0 0 0 6 6l1.26-1.26a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z',
  whatsapp: 'M21 11.5a8.5 8.5 0 0 1-12.6 7.4L3 20.5l1.7-5.2A8.5 8.5 0 1 1 21 11.5z',
  calendar: 'M5 4h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z|M16 2v4|M8 2v4|M3 10h18',
  note: 'M4 4h16v12H8l-4 4z',
  sparkle: 'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z',
  copy: 'M9 9h10v12H9z|M5 15H3V3h12v2',
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4|M7 10l5 5 5-5|M12 15V3',
  external: 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6|M15 3h6v6|M10 14 21 3',
  columns: 'M3 4h18v16H3z|M9 4v16|M15 4v16',
  filter: 'M22 3H2l8 9.5V19l4 2v-8.5z',
  user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2|M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  building: 'M4 21V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v16|M15 9h3a2 2 0 0 1 2 2v10|M8 7h3|M8 11h3|M8 15h3',
  refresh: 'M21 12a9 9 0 1 1-3-6.7|M21 3v6h-6',
  close: 'M18 6 6 18|M6 6l12 12',
  qr: 'M3 3h7v7H3z|M14 3h7v7h-7z|M3 14h7v7H3z|M14 14h3v3h-3z|M18 18h3v3h-3z',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z|M12 7v5l3 2',
  camera: 'M4 7h3l2-2h6l2 2h3v13H4z|M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  keyboard: 'M3 6h18v12H3z|M7 10h.01|M11 10h.01|M15 10h.01|M8 14h8',
  arrowUpRight: 'M7 17 17 7|M8 7h9v9',
  arrowUp: 'M12 19V5|M5 12l7-7 7 7',
  trendUp: 'M23 6l-9.5 9.5-5-5L1 18|M17 6h6v6',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z|M12 16v-4|M12 8h.01',
  award: 'M12 15a7 7 0 1 0 0-14 7 7 0 0 0 0 14z|M8.2 13.9 7 22l5-3 5 3-1.2-8.1',
} as const;

export function Icon({
  d,
  size = 15,
  color = '#5A6B87',
  width = 1.7,
}: {
  d: string;
  size?: number;
  color?: string;
  width?: number;
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {d.split('|').map((seg) => (
        <Path key={seg} d={seg} />
      ))}
    </Svg>
  );
}

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------

const TONES = {
  navy: { bg: '#0B132B', fg: '#FFFFFF' },
  blue: { bg: '#1D3F8A', fg: '#FFFFFF' },
  gold: { bg: '#F4B000', fg: '#0B132B' },
  surface: { bg: '#EEF1F7', fg: '#3C4C68' },
} as const;

export function initialsOf(name: string | null | undefined): string {
  if (!name?.trim()) return '-';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '-';
}

/** A square View, so `borderRadius: size / 2` is a true circle rather than a stadium. */
export function Avatar({
  name,
  size = 34,
  tone = 'navy',
}: {
  name: string | null | undefined;
  size?: number;
  tone?: keyof typeof TONES;
}) {
  const { bg, fg } = TONES[tone];
  return (
    <View
      className="items-center justify-center shrink-0"
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg }}
    >
      <Typography className="font-bold" style={{ fontSize: Math.round(size * 0.36), color: fg }}>
        {initialsOf(name)}
      </Typography>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Bars and charts
// ---------------------------------------------------------------------------

export function ProgressBar({
  pct,
  color = '#F4B000',
  track = '#EEF1F7',
  height = 8,
}: {
  pct: number;
  color?: string;
  track?: string;
  height?: number;
}) {
  const clamped = Math.max(0, Math.min(100, Number.isFinite(pct) ? pct : 0));
  return (
    <View style={{ height, backgroundColor: track, borderRadius: height / 2, overflow: 'hidden' }}>
      <View style={{ width: `${clamped}%`, height: '100%', backgroundColor: color }} />
    </View>
  );
}

export type Slice = { key: string; label: string; value: number; color: string };

/**
 * Where the pointer is, in the coordinates of the thing it is over.
 *
 * Web-only by nature. React Native has no hover, and these props are not on
 * RN's View type — hence the `object` return, which spreads cleanly without
 * claiming to be something React Native would recognise. React Native Web does
 * forward the mouse group to the DOM node, so they fire in a browser; on a
 * phone nothing calls them and the charts render exactly as they did before.
 */
export type PointerAt = { x: number; y: number };

export function mouseProps(handlers: {
  onMove: (at: PointerAt) => void;
  onLeave: () => void;
}): object {
  return {
    /**
     * Measured against `currentTarget`, never `offsetX`.
     *
     * `offsetX` is relative to whatever element the pointer is actually over,
     * which inside a chart is a bar or a label rather than the row holding the
     * handler — so it resets to near zero every time the pointer crosses onto a
     * different bar, and the tooltip jumps back to the left edge. The bounding
     * rect of the element that owns the handler is the stable frame.
     */
    onMouseMove: (e: {
      clientX: number;
      clientY: number;
      currentTarget: { getBoundingClientRect: () => { left: number; top: number } };
    }) => {
      const box = e.currentTarget.getBoundingClientRect();
      handlers.onMove({ x: e.clientX - box.left, y: e.clientY - box.top });
    },
    onMouseLeave: () => handlers.onLeave(),
  };
}

/**
 * A donut with a number in the middle.
 *
 * Drawn as one stroked circle per slice with a dash pattern rather than as
 * wedge paths — no arc maths, and the grey track shows through when
 * everything is zero instead of collapsing to a dot.
 */
export function Donut({
  data,
  size = 164,
  thickness = 20,
  centerValue,
  centerLabel,
  onSelect,
}: {
  data: Slice[];
  size?: number;
  thickness?: number;
  centerValue: string;
  centerLabel?: string;
  /** Clicking a slice, with that slice's key. Opens the leads behind it. */
  onSelect?: (key: string) => void;
}) {
  const [hover, setHover] = useState<{ at: PointerAt; key: string } | null>(null);

  const total = data.reduce((sum, d) => sum + d.value, 0);
  const r = (size - thickness) / 2;
  const circumference = 2 * Math.PI * r;

  let cursor = 0;
  const arcs = data
    .filter((d) => d.value > 0)
    .map((d) => {
      const length = (d.value / total) * circumference;
      const arc = { ...d, length, offset: cursor };
      cursor += length;
      return arc;
    });

  /**
   * Which slice the pointer is over, from the geometry rather than from the SVG.
   *
   * The slices are one stroked circle each with a dash pattern, so every slice
   * is the same full-circle element and they all overlap everywhere — the
   * browser cannot tell them apart, and hanging hover handlers off them would
   * report whichever was drawn last. Measuring the angle can tell them apart.
   *
   * It also makes the hole in the middle and the space outside the ring hit
   * nothing, so a click inside the donut but nowhere near a slice does nothing
   * rather than opening whichever stage happened to be drawn last.
   */
  const sliceAt = (at: PointerAt): string | null => {
    const dx = at.x - size / 2;
    const dy = at.y - size / 2;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < r - thickness / 2 || dist > r + thickness / 2) return null;
    // atan2 measures from 3 o'clock going anticlockwise; the arcs start at 12
    // and run clockwise. The +90 rotates the origin, and atan2's y already
    // points down in screen coordinates, which supplies the direction flip.
    let deg = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
    if (deg < 0) deg += 360;
    const along = (deg / 360) * circumference;
    return arcs.find((a) => along >= a.offset && along < a.offset + a.length)?.key ?? null;
  };

  /**
   * Hover fades the slices you are NOT about to open.
   *
   * Not decoration, and not a tooltip either — it is the only way to tell what
   * a click will do. The arcs are invisible as targets: there is no cursor
   * change and no outline, so without this you would be aiming at a coloured
   * band and hoping. Fading the others names the target without putting a box
   * of text on top of the chart.
   */
  const strokeFor = (key: string) => (!hover || key === hover.key ? 1 : 0.22);

  return (
    <View
      className="items-center justify-center"
      style={{ width: size, height: size }}
      {...mouseProps({
        onMove: (at) => {
          const key = sliceAt(at);
          setHover(key ? { at, key } : null);
        },
        onLeave: () => setHover(null),
      })}
    >
      <View style={{ position: 'absolute' }}>
        <Svg width={size} height={size}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke="#EEF1F7" strokeWidth={thickness} fill="none" />
          {arcs.map((a) => (
            <Circle
              key={a.key}
              cx={size / 2}
              cy={size / 2}
              r={r}
              stroke={a.color}
              strokeWidth={thickness}
              strokeOpacity={strokeFor(a.key)}
              fill="none"
              strokeDasharray={`${a.length} ${circumference - a.length}`}
              strokeDashoffset={-a.offset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          ))}
        </Svg>
      </View>

      {/*
        One press target over the whole donut, for the same reason sliceAt
        exists: the arcs cannot be hit individually.

        Which slice was clicked is worked out from the CLICK's own coordinates,
        not from the hovered slice. Reading it off hover state looks equivalent
        and is not: hover is empty until a mouse has moved inside the ring, so a
        click that arrives without one — a tap, a keyboard press, a click landing
        in the same tick the pointer enters — would silently do nothing at all.
        A chart button that sometimes ignores you is worse than one that never
        worked, because nobody reports it.
      */}
      {onSelect ? (
        <Pressable
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          onPress={(e) => {
            const native = e.nativeEvent as unknown as {
              locationX?: number;
              locationY?: number;
            };
            const at =
              typeof native.locationX === 'number' && typeof native.locationY === 'number'
                ? { x: native.locationX, y: native.locationY }
                : hover?.at;
            const key = at ? sliceAt(at) : hover?.key ?? null;
            if (key) onSelect(key);
          }}
        />
      ) : null}

      <View className="items-center" pointerEvents="none">
        <Typography className="text-[26px] font-extrabold text-navy tracking-tight">{centerValue}</Typography>
        {centerLabel ? (
          <Typography className="text-[11px] font-semibold text-label mt-[1px]">{centerLabel}</Typography>
        ) : null}
      </View>

    </View>
  );
}

/** The donut's key, as tiles rather than a legend list — Habsy's one genuinely good chart idea. */
export function LegendTile({
  slice,
  onPress,
  active = false,
}: {
  slice: Slice;
  onPress?: () => void;
  active?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      className={`flex-1 flex-row items-center justify-between rounded-md border px-[13px] py-[10px] ${
        active ? 'border-navy bg-section' : 'border-hairline bg-white'
      }`}
    >
      <View className="flex-row items-center gap-[8px] min-w-0">
        <View className="w-[8px] h-[8px] rounded-full shrink-0" style={{ backgroundColor: slice.color }} />
        <Typography className="text-[12.5px] font-semibold text-ink-muted" numberOfLines={1}>
          {slice.label}
        </Typography>
      </View>
      <Typography className="text-[13px] font-extrabold text-navy">{slice.value}</Typography>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

export function SearchField({
  value,
  onChange,
  placeholder = 'Search',
  width,
  autoFocus = false,
}: {
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
  width?: number;
  autoFocus?: boolean;
}) {
  return (
    <View
      className="flex-row items-center bg-white border border-hairline rounded-md px-[11px]"
      style={width ? { width } : undefined}
    >
      <Icon d={ICON.search} size={14} color="#97A3B8" />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#97A3B8"
        autoFocus={autoFocus}
        className="flex-1 h-[38px] px-[9px] text-[13px] text-navy"
        // react-native-web leaves the browser focus ring on; the border is the focus signal here.
        style={{ outlineStyle: 'none' } as never}
      />
      {value ? (
        <Pressable onPress={() => onChange('')} className="p-1">
          <Icon d={ICON.close} size={13} color="#97A3B8" />
        </Pressable>
      ) : null}
    </View>
  );
}

export function Checkbox({
  checked,
  indeterminate = false,
  onPress,
}: {
  checked: boolean;
  indeterminate?: boolean;
  /**
   * The event is handed on so a caller inside a pressable row can stop the
   * click reaching it — ticking a box must not also open what the row opens.
   */
  onPress: (e: GestureResponderEvent) => void;
}) {
  const on = checked || indeterminate;
  return (
    <Pressable
      onPress={onPress}
      className={`w-[17px] h-[17px] rounded-sm border items-center justify-center ${
        on ? 'bg-blue border-blue' : 'bg-white border-hairline'
      }`}
    >
      {indeterminate ? (
        <View className="w-[9px] h-[2px] bg-white" />
      ) : checked ? (
        <Icon d={ICON.check} size={11} color="#FFFFFF" width={3} />
      ) : null}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Menu
// ---------------------------------------------------------------------------

/**
 * A dropdown.
 *
 * The backdrop is `position: fixed`, which react-native-web passes straight
 * through to CSS. It only ever has to work in a browser — `(dash)` redirects
 * native away before any of this renders.
 *
 * Keep the trigger out of any `overflow-hidden` Panel, or the open list is
 * clipped by the card it sits in.
 */
export function Menu({
  label,
  icon,
  width = 210,
  align = 'right',
  children,
}: {
  label: string;
  icon?: string;
  width?: number;
  align?: 'left' | 'right';
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <View style={{ zIndex: open ? 60 : 1 }}>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        className={`flex-row items-center gap-[7px] rounded-md border px-[13px] py-[9px] ${
          open ? 'bg-section border-navy' : 'bg-white border-hairline'
        }`}
      >
        {icon ? <Icon d={icon} size={14} color="#5A6B87" /> : null}
        <Typography className="text-[12.5px] font-semibold text-navy">{label}</Typography>
        <Icon d={ICON.chevronDown} size={13} color="#8A98B0" />
      </Pressable>

      {open ? (
        <>
          <Pressable
            onPress={close}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 } as never}
          />
          <View
            className="absolute bg-white border border-hairline rounded-md py-[6px] shadow-[0_18px_44px_rgba(11,19,43,0.18)]"
            style={{ top: 42, width, ...(align === 'right' ? { right: 0 } : { left: 0 }) }}
          >
            {children(close)}
          </View>
        </>
      ) : null}
    </View>
  );
}

export function MenuItem({
  label,
  hint,
  active = false,
  onPress,
}: {
  label: string;
  hint?: string;
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} className="flex-row items-center justify-between px-[13px] py-[8px]">
      <View className="min-w-0">
        <Typography className={`text-[12.5px] ${active ? 'font-bold text-navy' : 'font-medium text-ink-muted'}`}>
          {label}
        </Typography>
        {hint ? <Typography className="text-[11px] text-label mt-[1px]">{hint}</Typography> : null}
      </View>
      {active ? <Icon d={ICON.check} size={13} color="#1D3F8A" width={2.4} /> : null}
    </Pressable>
  );
}

export function MenuToggle({
  label,
  on,
  onPress,
  locked = false,
}: {
  label: string;
  on: boolean;
  onPress: () => void;
  locked?: boolean;
}) {
  return (
    <Pressable
      onPress={locked ? undefined : onPress}
      className={`flex-row items-center gap-[9px] px-[13px] py-[7px] ${locked ? 'opacity-45' : ''}`}
    >
      <Checkbox checked={on} onPress={locked ? () => {} : onPress} />
      <Typography className="text-[12.5px] font-medium text-ink-muted">{label}</Typography>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Toggles and actions
// ---------------------------------------------------------------------------

export function Segmented({
  options,
  value,
  onChange,
}: {
  options: { key: string; label: string }[];
  value: string;
  onChange: (key: string) => void;
}) {
  return (
    <View className="flex-row bg-surface rounded-md p-[3px] self-start">
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            className={`px-[13px] py-[6px] rounded-sm ${on ? 'bg-white' : 'bg-transparent'}`}
          >
            <Typography className={`text-[12px] font-bold ${on ? 'text-navy' : 'text-slate'}`}>{o.label}</Typography>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * One button in the quick-actions strip, carrying how many times it has
 * already been used. The count is the point: "WhatsApp 2" says this lead has
 * been messaged twice, without opening a history panel to find out.
 */
export function QuickAction({
  label,
  icon,
  count,
  href,
  onPress,
  disabled = false,
  tone = 'plain',
}: {
  label: string;
  icon: string;
  count?: number | null;
  href?: string;
  onPress?: () => void;
  disabled?: boolean;
  tone?: 'plain' | 'gold';
}) {
  const body = (
    <View
      className={`flex-row items-center gap-[7px] rounded-md border px-[13px] py-[9px] ${
        tone === 'gold' ? 'bg-gold border-gold' : 'bg-white border-hairline'
      } ${disabled ? 'opacity-40' : ''}`}
    >
      <Icon d={icon} size={14} color={tone === 'gold' ? '#0B132B' : '#5A6B87'} />
      <Typography className="text-[12.5px] font-semibold text-navy">{label}</Typography>
      {count ? (
        <View className="rounded-full bg-surface px-[6px] py-[1px] min-w-[18px] items-center">
          <Typography className="text-[10.5px] font-extrabold text-ink-muted">{count}</Typography>
        </View>
      ) : null}
    </View>
  );

  if (href && !disabled) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }} onClick={onPress}>
        {body}
      </a>
    );
  }
  return (
    <Pressable onPress={disabled ? undefined : onPress} disabled={disabled}>
      {body}
    </Pressable>
  );
}

export function IconButton({
  icon,
  onPress,
  label,
  disabled = false,
}: {
  icon: string;
  onPress?: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      accessibilityLabel={label}
      className={`w-[34px] h-[34px] rounded-md border border-hairline bg-white items-center justify-center ${
        disabled ? 'opacity-40' : ''
      }`}
    >
      <Icon d={icon} size={15} color="#5A6B87" />
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

/**
 * "1–10 of 1,264", then the two arrows.
 *
 * Shown even on page one of one. Knowing the list is complete is worth a line;
 * a count that only appears once there is a second page is a count you cannot
 * trust to be there.
 */
export function Pagination({
  page,
  pageSize,
  total,
  onPage,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const first = total === 0 ? 0 : page * pageSize + 1;
  const last = Math.min(total, (page + 1) * pageSize);

  return (
    <View className="flex-row items-center justify-between px-5 py-[13px] border-t border-hairline">
      <Typography className="text-[12px] text-slate font-medium">
        {total === 0 ? 'Nothing to show' : `${first}–${last} of ${total.toLocaleString('en-IN')}`}
        {pages > 1 ? `  ·  Page ${page + 1} of ${pages}` : ''}
      </Typography>
      <View className="flex-row items-center gap-2">
        <Pressable
          onPress={page > 0 ? () => onPage(page - 1) : undefined}
          disabled={page === 0}
          className={`flex-row items-center gap-[6px] rounded-md border border-hairline bg-white px-[12px] py-[7px] ${
            page === 0 ? 'opacity-35' : ''
          }`}
        >
          <Icon d={ICON.chevronLeft} size={13} color="#5A6B87" />
          <Typography className="text-[12.5px] font-semibold text-navy">Previous</Typography>
        </Pressable>
        <Pressable
          onPress={page + 1 < pages ? () => onPage(page + 1) : undefined}
          disabled={page + 1 >= pages}
          className={`flex-row items-center gap-[6px] rounded-md border border-hairline bg-white px-[12px] py-[7px] ${
            page + 1 >= pages ? 'opacity-35' : ''
          }`}
        >
          <Typography className="text-[12.5px] font-semibold text-navy">Next</Typography>
          <Icon d={ICON.chevronRight} size={13} color="#5A6B87" />
        </Pressable>
      </View>
    </View>
  );
}
