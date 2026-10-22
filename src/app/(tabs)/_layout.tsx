import { Tabs } from 'expo-router';
import { Gauge, Store, Wallet } from 'lucide-react-native';

import { colors } from '../../theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        headerStyle: { backgroundColor: colors.surface },
        headerTitleStyle: { fontWeight: '800' },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Kasadayım',
          headerTitle: 'Şu An Kasadayım',
          tabBarIcon: ({ color, size }) => <Store color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="sayaclarim"
        options={{
          title: 'Sayaçlarım',
          tabBarIcon: ({ color, size }) => <Gauge color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="cuzdan"
        options={{
          title: 'Cüzdan & Kampanyalar',
          tabBarLabel: 'Cüzdan',
          tabBarIcon: ({ color, size }) => <Wallet color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
