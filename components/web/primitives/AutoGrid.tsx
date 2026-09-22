import { Children, type ReactNode, useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';

/**
 * The substitute for `repeat(auto-fit, minmax(<min>px, 1fr))`, which the
 * reference uses for every card grid. React Native has no CSS grid.
 *
 * Measured rather than driven by breakpoint classes, because auto-fit responds
 * to the CONTAINER's width — a `md:w-1/2` cannot know it is inside a narrow
 * column. One setState on mount and one per resize; nothing per frame.
 *
 * Cells get flexBasis AND maxWidth at the same percentage. Without maxWidth,
 * React Native lets a short final row grow its items past their track.
 *
 * Each child is wrapped in a flex-1 view so cards in a row end up the same
 * height: flex-wrap lines stretch their items to the line's height, and the
 * card then fills the cell. That is what lets a card push its data-preview
 * panel to the bottom with `mt-auto`.
 */

interface Props {
  /** The minmax() floor: the narrowest a column may get before one is dropped. */
  min: number;
  gap?: number;
  /** Cap the column count regardless of available width. */
  max?: number;
  /**
   * Let a short last row stretch to fill, as CSS Grid's 1fr does. Off by
   * default — with it on, a single trailing card goes full width, which
   * usually looks worse than leaving it at its track size.
   */
  stretch?: boolean;
  className?: string;
  children: ReactNode;
}

export function AutoGrid({
  min,
  gap = 16,
  max,
  stretch = false,
  className = '',
  children,
}: Props) {
  const [width, setWidth] = useState(0);

  // Before measurement, render a single column. Any other guess flashes a
  // wrong layout on first paint.
  const columns = width
    ? Math.min(max ?? 99, Math.max(1, Math.floor((width + gap) / (min + gap))))
    : 1;
  // Typed as a percentage literal so it satisfies DimensionValue; a plain
  // string is rejected by ViewStyle.
  const basis = `${100 / columns}%` as `${number}%`;

  const onLayout = (e: LayoutChangeEvent) => {
    const next = e.nativeEvent.layout.width;
    // Guarded: an unguarded setState here re-renders, which fires onLayout,
    // which setStates again.
    if (next !== width) setWidth(next);
  };

  return (
    <View
      onLayout={onLayout}
      className={`flex-row flex-wrap items-stretch ${className}`}
      // Half-gap padding on each cell plus a negative outer margin keeps the
      // first and last columns flush with the container edge.
      style={{ marginHorizontal: -gap / 2, marginBottom: -gap }}
    >
      {Children.map(children, (child, i) => (
        <View
          key={i}
          style={{
            flexBasis: basis,
            maxWidth: basis,
            flexGrow: stretch ? 1 : 0,
            paddingHorizontal: gap / 2,
            marginBottom: gap,
          }}
        >
          <View className="flex-1">{child}</View>
        </View>
      ))}
    </View>
  );
}
