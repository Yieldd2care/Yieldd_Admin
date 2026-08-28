import { Tabs } from 'expo-router';

import { TabBar } from '../../../components/app/TabBar';

export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="leads" options={{ href: null }} />
      <Tabs.Screen name="events" />
      <Tabs.Screen name="qr" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
