import { View } from 'react-native';

/**
 * The ornament the reference sets between sections: a rule that fades in from
 * nothing, three diamonds, a rule that fades back out.
 *
 * The diamonds are squares turned 45 degrees. `rotate-45` is one of the
 * variable-backed Tailwind families AGENTS.md warns about, but it is static
 * here — present from the first render, never toggled — which is exactly the
 * condition that makes it safe.
 */

interface Props {
  tone?: 'onLight' | 'onDark';
  className?: string;
}

export function Divider({ tone = 'onLight', className = '' }: Props) {
  const onDark = tone === 'onDark';

  const ruleLeft = onDark
    ? '[background-image:linear-gradient(90deg,transparent,rgba(255,255,255,0.18))]'
    : '[background-image:linear-gradient(90deg,transparent,#E3E7EF)]';
  const ruleRight = onDark
    ? '[background-image:linear-gradient(90deg,rgba(255,255,255,0.18),transparent)]'
    : '[background-image:linear-gradient(90deg,#E3E7EF,transparent)]';

  const small = onDark ? 'bg-white/[0.30]' : 'bg-hairline';
  const large = 'bg-gold';

  return (
    <View className={`w-full items-center px-5 md:px-8 ${className}`}>
      <View className="max-w-[1340px] w-full flex-row items-center gap-3">
        <View className={`flex-1 h-px ${ruleLeft}`} />
        <View className={`w-[5px] h-[5px] rotate-45 ${small}`} />
        <View className={`w-[9px] h-[9px] rotate-45 ${large}`} />
        <View className={`w-[5px] h-[5px] rotate-45 ${small}`} />
        <View className={`flex-1 h-px ${ruleRight}`} />
      </View>
    </View>
  );
}
