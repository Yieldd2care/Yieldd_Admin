import { Image, Text, View } from 'react-native';

/**
 * The Yieldd mark beside the wordmark, in a size and colour that suits the
 * surface it sits on.
 *
 * components/ui/BrandLockup cannot do this job. It renders
 * `transparenet secondary logo.png`, whose wordmark is WHITE — it disappears
 * on the light nav pill and on the auth card. The other bundled lockup,
 * yieldd-lockup-transparent.png, has a navy rectangle baked into it despite
 * the filename, so it would paint a dark box on a light surface.
 *
 * So the wordmark is set as text and only the mark comes from an image. That
 * is already the pattern AuthFormWeb used for its light-background logo; this
 * makes it reusable and gives it a dark tone as well.
 *
 * BrandLockup is untouched and still correct on navy — the footer keeps it.
 */

const MARK = require('../../../assets/brand/yieldd-mark-transparent.png');
const MARK_ASPECT = 570 / 508;

interface Props {
  tone: 'onLight' | 'onDark';
  /** Height of the mark in px. The wordmark scales with it. */
  size?: number;
  className?: string;
}

export function BrandRow({ tone, size = 30, className = '' }: Props) {
  return (
    <View className={`flex-row items-center gap-[9px] ${className}`}>
      <Image
        source={MARK}
        style={{ width: size * MARK_ASPECT, height: size }}
        resizeMode="contain"
      />
      <Text
        className={`[font-family:Urbanist,Figtree,system-ui,sans-serif] [font-weight:800] tracking-[0.02em] ${
          tone === 'onLight' ? 'text-navy' : 'text-white'
        }`}
        style={{ fontSize: size * 0.66, lineHeight: size * 0.78 }}
      >
        YIELDD
      </Text>
    </View>
  );
}
