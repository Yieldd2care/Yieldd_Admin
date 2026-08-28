import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

import { CameraIcon, CalendarIcon, HomeIcon, QrCodeIcon, SettingsIcon } from '../ui/icons';

const TAB_ICON_SIZE = 24;

const TAB_ICONS: Record<string, (active: boolean) => ReactNode> = {
  index: (active) => (
    <HomeIcon size={TAB_ICON_SIZE} color={active ? '#F4B000' : 'rgba(255,255,255,0.55)'} strokeWidth={active ? 2 : 1.75} />
  ),
  events: (active) => (
    <CalendarIcon size={TAB_ICON_SIZE} color={active ? '#F4B000' : 'rgba(255,255,255,0.55)'} strokeWidth={active ? 2 : 1.75} />
  ),
  qr: (active) => (
    <QrCodeIcon size={TAB_ICON_SIZE} color={active ? '#F4B000' : 'rgba(255,255,255,0.55)'} strokeWidth={active ? 2 : 1.75} />
  ),
  profile: (active) => (
    <SettingsIcon size={TAB_ICON_SIZE} color={active ? '#F4B000' : 'rgba(255,255,255,0.55)'} strokeWidth={active ? 2 : 1.75} />
  ),
};

const TAB_ORDER = ['index', 'events', 'qr', 'profile'];

export function TabBar({ state, navigation, insets }: BottomTabBarProps) {
  const visibleTabs = TAB_ORDER.map((name) => state.routes.find((r) => r.name === name)).filter(
    (r): r is (typeof state.routes)[number] => Boolean(r)
  );

  const renderTab = (route: (typeof state.routes)[number]) => {
    const index = state.routes.findIndex((r) => r.key === route.key);
    const active = state.index === index;

    const onPress = () => {
      const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (!active && !event.defaultPrevented) {
        navigation.navigate(route.name);
      }
    };

    return (
      <Pressable key={route.key} onPress={onPress} className="flex-1 items-center justify-center">
        {TAB_ICONS[route.name]?.(active)}
      </Pressable>
    );
  };

  const leftTabs = visibleTabs.slice(0, 2);
  const rightTabs = visibleTabs.slice(2);

  return (
    <View
      className="absolute left-0 right-0 bottom-0 bg-navy rounded-t-[22px] flex-row items-center shadow-[0_-8px_24px_rgba(11,19,43,0.18)]"
      style={{ height: 68 + insets.bottom, paddingBottom: insets.bottom }}
    >
      {leftTabs.map(renderTab)}
      <Pressable
        onPress={() => router.push('/(app)/capture/camera')}
        className="w-[70px] h-[70px] -mt-[26px] rounded-full bg-gold border-[5px] border-section items-center justify-center shadow-[0_10px_22px_rgba(244,176,0,0.4)] active:scale-95"
      >
        <CameraIcon size={38} strokeWidth={2} />
      </Pressable>
      {rightTabs.map(renderTab)}
    </View>
  );
}
