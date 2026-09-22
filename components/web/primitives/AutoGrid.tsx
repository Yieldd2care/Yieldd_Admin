import { Children, type ReactNode, useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';

import { Reveal } from './Reveal';

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
  /**
   * Cap the column count regardless of available width. Defaults to the
   * number of children, which is almost always what you want - more tracks
   * than items just leaves a hole at the end of the row.
   */
  max?: number;
  /**
   * Let a short last row stretch to fill, as CSS Grid's 1fr does. Off by
   * default — with it on, a single trailing card goes full width, which
   * usually looks worse than leaving it at its track size.
   */
  stretch?: boolean;
  /**
   * Reveal the cells in sequence as the grid scrolls into view.
   *
   * It lives here rather than in a <Deck> wrapped around the children because
   * AutoGrid counts and measures its own children - a wrapper between them
   * would leave it sizing one child instead of six.
   */
  reveal?: boolean;
  /** Milliseconds between each cell. */
  revealStep?: number;
  className?: string;
  children: ReactNode;
}

export function AutoGrid({
  min,
  gap = 16,
  max,
  stretch = false,
  reveal = false,
  revealStep = 70,
  className = '',
  children,
}: Props) {
  const [width, setWidth] = useState(0);
  const count = Children.count(children);

  // Before measurement, render a single column. Any other guess flashes a
  // wrong layout on first paint.
  //
  // The column count is capped at the number of children as well as at `max`.
  // Without that cap a container wide enough for five tracks lays four cards
  // out in five, and the row stops short with an empty fifth cell's worth of
  // space on the right - which is exactly what happened to the four stat
  // cards under the hero.
  const columns = width
    ? Math.min(max ?? count, count, Math.max(1, Math.floor((width + gap) / (min + gap))))
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
          {reveal ? (
            <Reveal fill delay={i * revealStep}>
              {child}
            </Reveal>
          ) : (
            <View className="flex-1">{child}</View>
          )}
        </View>
      ))}
    </View>
  );
}
