import type { ReactNode } from 'react';
import { View, type PressableProps } from 'react-native';

import { Button } from '../../ui/Button';

/**
 * A call to action with the reference's rotating sheen around its edge.
 *
 * Wraps components/ui/Button rather than reimplementing it — that component is
 * shared with (auth), (app) and (dash) and must not drift.
 *
 * The ring clips ITSELF, in its own absolutely-positioned overflow-hidden
 * layer, instead of the button sitting inside a clipping wrapper. That detail
 * matters: Button's primary variant carries
 * `shadow-[0_10px_26px_rgba(244,176,0,0.34)]`, and an ancestor with
 * overflow-hidden would clip that shadow away along with the spinning
 * gradient, flattening the button.
 *
 * The ring layer is painted behind via explicit z-index. On the web an
 * absolutely-positioned sibling paints above a static one regardless of
 * document order, so leaving this to source order would put the gradient over
 * the label.
 *
 * `.tg-ring` is never toggled — AGENTS.md's rule is that gradient-backed
 * classes must exist from the first render. `spin={false}` omits the element
 * entirely instead, which is a different tree, not a mid-life class upgrade.
 */

type Variant = 'gold' | 'outline' | 'ink';

interface Props extends Omit<PressableProps, 'children'> {
  label: string;
  variant?: Variant;
  /** Draw the rotating sheen. */
  spin?: boolean;
  icon?: ReactNode;
  /**
   * Applied to the OUTER wrapper, which is what a caller almost always means:
   * margins and alignment have to sit outside the ring, or the ring is offset
   * from the button it is meant to trace.
   */
  className?: string;
  /**
   * How the button sits in its parent. Explicit, because a hardcoded
   * `self-start` quietly left-aligns the button inside any centred column -
   * and `self-center` passed through className would be the same specificity,
   * so which one won would come down to stylesheet order.
   */
  align?: 'start' | 'center' | 'stretch';
  /** Rare: extra classes for the Pressable itself. */
  buttonClassName?: string;
}

const ALIGN = {
  start: 'self-start',
  center: 'self-center',
  stretch: 'self-stretch',
} as const;

const BUTTON_VARIANT = {
  gold: 'primary',
  outline: 'secondary',
  ink: 'ghost',
} as const;

/** Extra classes layered onto Button for the variants it has no preset for. */
const EXTRA: Record<Variant, string> = {
  gold: '',
  outline: '',
  ink: 'bg-navy hover:bg-navy-elevated',
};

/** The sheen reads gold on dark surfaces, navy on light ones. */
const RING: Record<Variant, string> = {
  gold: 'tg-ring',
  outline: 'tg-ring',
  ink: 'tg-ring-ink',
};

export function CTAButton({
  label,
  variant = 'gold',
  spin = true,
  icon,
  align = 'start',
  className = '',
  buttonClassName = '',
  ...rest
}: Props) {
  return (
    <View className={`relative ${ALIGN[align]} ${className}`}>
      {spin ? (
        <View
          pointerEvents="none"
          className="absolute -inset-[2px] rounded-full overflow-hidden z-0"
        >
          {/* Sized far past the button so the conic arc never reveals a corner
              as it turns. */}
          <View className={`absolute -inset-[140%] ${RING[variant]}`} />
        </View>
      ) : null}

      <Button
        label={label}
        variant={BUTTON_VARIANT[variant]}
        shape="pill"
        icon={icon}
        className={`relative z-10 h-[52px] px-[26px] ${EXTRA[variant]} ${buttonClassName}`}
        {...rest}
      />
    </View>
  );
}
