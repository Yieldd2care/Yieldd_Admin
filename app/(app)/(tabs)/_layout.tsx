import { Tabs } from 'expo-router';

import { TabBar } from '../../../components/app/TabBar';

export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="leads" />
      <Tabs.Screen name="events" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
