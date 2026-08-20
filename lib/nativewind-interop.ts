import { cssInterop } from 'nativewind';
import { MotiView, MotiText, MotiImage } from 'moti';
import { SafeAreaView } from 'react-native-safe-area-context';

/**
 * NativeWind only auto-supports className on core React Native primitives.
 * Third-party components (Moti, react-native-safe-area-context) need
 * explicit registration or their className is silently ignored — the
 * component renders with no styling from it at all, not just "wrong" styling.
 */
cssInterop(MotiView, { className: 'style' });
cssInterop(MotiText, { className: 'style' });
cssInterop(MotiImage, { className: 'style' });
cssInterop(SafeAreaView, { className: 'style' });
