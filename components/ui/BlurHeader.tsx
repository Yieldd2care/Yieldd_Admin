import { BlurView } from 'expo-blur';
import { Platform, View, type ViewProps } from 'react-native';

interface Props extends ViewProps {
  className?: string;
}

/**
 * expo-blur's BlurView is unreliable on web, so web uses a real CSS
 * backdrop-filter instead (react-native-web passes it through as a style).
 */
export function BlurHeader({ className = '', style, children, ...rest }: Props) {
  if (Platform.OS === 'web') {
    return (
      <View
        className={className}
        style={[
          { backgroundColor: 'rgba(11,19,43,0.92)', backdropFilter: 'blur(14px)' } as never,
          style,
        ]}
        {...rest}
      >
        {children}
      </View>
    );
  }
  return (
    <BlurView intensity={40} tint="dark" className={className} style={style} {...rest}>
      {children}
    </BlurView>
  );
}
