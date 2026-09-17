import { memo, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  TextInput as RNTextInput,
  Text,
  View,
  type TextInputProps,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

/**
 * A field whose label starts inside the box and rises onto the border.
 *
 * The lead forms used to label a field one of two ways: a caption above it, or
 * nothing at all and a placeholder that vanishes the moment anyone types. The
 * second is how six consecutive boxes ended up unlabelled on the manual entry
 * screen - "Designation", "Email", "Landline (optional)" are placeholders, and
 * after the rep fills the form there is nothing left on screen saying which box
 * is which.
 *
 * Here the label is always present. At rest it sits where a placeholder sits
 * and reads as one; on focus, or as soon as the field holds anything, it moves
 * up onto the top border and shrinks.
 *
 * Three things about the implementation are load-bearing. Each of them is a bug
 * that was avoided rather than a preference.
 *
 * 1. THE ANIMATED NODE CARRIES NO `className`.
 *
 *    `lib/nativewind-interop.ts` registers cssInterop for Moti and for
 *    SafeAreaView, and says why: NativeWind only auto-supports className on core
 *    React Native primitives, and an unregistered component's className is
 *    SILENTLY IGNORED - it renders with no styling from that string at all.
 *    Reanimated's Animated.View is not registered. So everything on it is a
 *    plain style object, and the label's `fontFamily` is named explicitly
 *    because `font-medium` would never reach it.
 *
 *    This also happens to walk around the trap in AGENTS.md: a plain style
 *    carries no `--tw-*` variables, so there is no component for NativeWind to
 *    try to upgrade mid-life and no bogus "Couldn't find a navigation context".
 *
 * 2. THE TRANSFORM MOVES THE LABEL, NOT `fontSize`.
 *
 *    Animating fontSize re-measures text on every frame and drags the whole row
 *    through layout. A translate and a scale about the left edge produce the
 *    same picture and never touch layout. The animation therefore runs entirely
 *    on the UI thread and does not re-render the form, which is the same reason
 *    AGENTS.md keeps the 10Hz recorder hook off a screen full of TextInputs.
 *
 * 3. HYDRATION DOES NOT ANIMATE.
 *
 *    `app/(app)/leads/edit.tsx` fills its fields from the stored lead in an
 *    effect, AFTER the first render. Driving the animation straight off
 *    `floated` would mean every label on that screen slides up in unison a
 *    frame after it opens, every time it opens. `touched` below keeps the
 *    motion for changes the person actually caused and snaps for everything
 *    else.
 */

const BOX_HEIGHT = 56;
/** The label rests centred in a zone this tall, so -half of it puts its centre
 *  exactly on the top border. Kept equal to BOX_HEIGHT for a single-line field
 *  and held at that value for a multiline one, where the box is taller but the
 *  first line - and so the resting label - is still up here. */
const LABEL_ZONE = BOX_HEIGHT;
const FLOAT_SCALE = 0.72;
const REST_FONT = 16;
const DURATION = 150;

const LABEL_REST = '#97A3B8'; // placeholder
const LABEL_FLOAT = '#1D3F8A'; // blue

interface Props extends Omit<TextInputProps, 'value' | 'onChangeText' | 'multiline' | 'style'> {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  /**
   * A real placeholder, shown only once the label has moved out of the way.
   * An example of the format rather than a second name for the field.
   */
  hint?: string;
  multiline?: boolean;
  /** How tall a multiline box starts. An address needs two lines, a note
   *  needs room to think in; 112 for both made every address a crater. */
  minHeight?: number;
  /** Drawn over the right of the box - the row's delete and add controls. */
  trailing?: ReactNode;
  /**
   * The colour of the SURFACE this field sits on.
   *
   * The floated label paints a small rectangle behind itself so it reads as a
   * notch in the border rather than text laid over a line. That rectangle has
   * to match whatever is behind the field. It was hard-coded white, which was
   * invisible while the label sat INSIDE the white box and became a white
   * smear over the field above and the section heading the moment it rose out
   * of it. Pass the container colour whenever it is not white.
   */
  notchColor?: string;
}

export const FloatingLabelInput = memo(function FloatingLabelInput({
  label,
  value,
  onChangeText,
  hint,
  multiline = false,
  minHeight = 112,
  trailing,
  notchColor = '#FFFFFF',
  onFocus,
  onBlur,
  ...rest
}: Props) {
  const [focused, setFocused] = useState(false);
  const floated = focused || value.trim().length > 0;

  const progress = useSharedValue(floated ? 1 : 0);
  const touched = useRef(false);

  useEffect(() => {
    const target = floated ? 1 : 0;
    progress.value = touched.current ? withTiming(target, { duration: DURATION }) : target;
  }, [floated, progress]);

  const labelMotion = useAnimatedStyle(() => ({
    transform: [
      { translateY: -(LABEL_ZONE / 2) * progress.value },
      { scale: 1 - (1 - FLOAT_SCALE) * progress.value },
    ],
  }));

  const handleFocus: NonNullable<TextInputProps['onFocus']> = (e) => {
    // Before setFocused, so the effect that this re-render schedules already
    // sees a touched field and animates. Setting it afterwards would swallow
    // the very first rise.
    touched.current = true;
    setFocused(true);
    onFocus?.(e);
  };

  const handleBlur: NonNullable<TextInputProps['onBlur']> = (e) => {
    setFocused(false);
    onBlur?.(e);
  };

  return (
    <View className="relative">
      <RNTextInput
        // The focus colour is swapped INSIDE this string rather than appended
        // by a caller: two border-* classes of equal specificity are settled by
        // the order Tailwind emits them, not the order they appear here. The
        // border WIDTH never changes, so the box cannot reflow on focus.
        className={`rounded-[12px] border-[1.5px] bg-white px-[14px] text-[16px] font-medium text-navy ${
          focused ? 'border-blue' : 'border-hairline'
        } ${trailing ? 'pr-[78px]' : ''}`}
        style={
          multiline
            ? { minHeight, paddingTop: 19, paddingBottom: 14, textAlignVertical: 'top' }
            : { height: BOX_HEIGHT }
        }
        value={value}
        onChangeText={onChangeText}
        onFocus={handleFocus}
        onBlur={handleBlur}
        multiline={multiline}
        // Only once the label is out of the way, or the two would sit on top of
        // each other. An empty, unfocused field shows the label alone.
        placeholder={focused ? hint : undefined}
        placeholderTextColor={LABEL_REST}
        // The visible label is decoration as far as the accessibility tree is
        // concerned - it is pointerEvents="none" and carries no association.
        accessibilityLabel={label}
        {...rest}
      />

      <Animated.View
        // So a tap anywhere on the resting label reaches the field underneath.
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            left: 9,
            top: 0,
            height: LABEL_ZONE,
            justifyContent: 'center',
            // The notch. Invisible at rest - white on a white field - and the
            // gap the label sits in once it reaches the border.
            paddingHorizontal: 5,
            backgroundColor: notchColor,
            // Keeps the left edge and the vertical centre still while it
            // shrinks, so the label scales in place instead of drifting.
            transformOrigin: 'left center',
          },
          labelMotion,
        ]}
      >
        <Text
          style={{
            fontFamily: 'Inter_500Medium',
            fontSize: REST_FONT,
            lineHeight: REST_FONT * 1.25,
            color: floated ? LABEL_FLOAT : LABEL_REST,
          }}
        >
          {label}
        </Text>
      </Animated.View>

      {trailing ? (
        <View
          className="absolute right-[8px] flex-row items-center gap-[2px]"
          // Pinned to the first line rather than centred, so a multiline box
          // does not float its controls halfway down an empty note.
          style={{ top: 0, height: BOX_HEIGHT }}
        >
          {trailing}
        </View>
      ) : null}
    </View>
  );
});
