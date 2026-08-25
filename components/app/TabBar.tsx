import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

import { Typography } from '../ui/Typography';
import { CameraIcon, CalendarIcon, HomeIcon, ProfileIcon, UsersIcon } from '../ui/icons';

const TAB_ICONS: Record<string, (active: boolean) => ReactNode> = {
  index: (active) => <HomeIcon color={active ? '#0B132B' : '#5A6B87'} strokeWidth={active ? 2 : 1.75} />,
  leads: (active) => <UsersIcon color={active ? '#0B132B' : '#5A6B87'} strokeWidth={active ? 2 : 1.75} />,
  events: (active) => <CalendarIcon color={active ? '#0B132B' : '#5A6B87'} strokeWidth={active ? 2 : 1.75} />,
  profile: (active) => <ProfileIcon color={active ? '#0B132B' : '#5A6B87'} strokeWidth={active ? 2 : 1.75} />,
};

const TAB_LABELS: Record<string, string> = {
  index: 'Home',
  leads: 'Leads',
  events: 'Events',
  profile: 'Profile',
};

export function TabBar({ state, navigation, insets }: BottomTabBarProps) {
  const isHome = state.routes[state.index].name === 'index';
  const leftTabs = state.routes.filter((r) => r.name === 'index' || r.name === 'leads');
  const rightTabs = state.routes.filter((r) => r.name === 'events' || r.name === 'profile');

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
      <Pressable key={route.key} onPress={onPress} className="flex-1 items-center justify-center gap-[3px]">
        {TAB_ICONS[route.name]?.(active)}
        <Typography
          className={`text-[10.5px] font-bold ${active ? 'text-navy' : 'text-slate'}`}
        >
          {TAB_LABELS[route.name] ?? route.name}
        </Typography>
      </Pressable>
    );
  };

  return (
    <View style={{ paddingBottom: insets.bottom }}>
      {isHome ? (
        <View className="absolute left-0 right-0 -top-[52px] items-center gap-2 z-10">
          <Pressable
            onPress={() => router.push('/(app)/capture/camera')}
            className="w-[68px] h-[68px] rounded-full bg-gold items-center justify-center shadow-[0_14px_30px_rgba(244,176,0,0.42)] active:scale-95"
          >
            <CameraIcon size={27} strokeWidth={2} />
          </Pressable>
          <Pressable onPress={() => router.push('/(app)/capture/manual')}>
            <Typography className="text-[11.5px] font-bold text-slate">Type it in instead</Typography>
          </Pressable>
        </View>
      ) : null}
      <View className="flex-row bg-white border-t border-hairline h-16">
        {leftTabs.map(renderTab)}
        <View className="flex-1" />
        {rightTabs.map(renderTab)}
      </View>
    </View>
  );
}
