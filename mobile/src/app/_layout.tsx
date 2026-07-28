import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LayoutDashboard, Activity, HeartPulse, Trophy, Target, MessageCircleHeart } from 'lucide-react-native';
import { Colors } from '@/constants/theme';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Tabs
        screenOptions={{
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.foreground,
          headerShadowVisible: false,
          sceneStyle: { backgroundColor: Colors.background },
          tabBarStyle: {
            backgroundColor: Colors.surface,
            borderTopColor: Colors.border,
          },
          tabBarActiveTintColor: Colors.accent,
          tabBarInactiveTintColor: Colors.muted,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{ title: 'Dashboard', tabBarIcon: ({ color, size }) => <LayoutDashboard color={color} size={size} /> }}
        />
        <Tabs.Screen
          name="training"
          options={{ title: 'Training', tabBarIcon: ({ color, size }) => <Activity color={color} size={size} /> }}
        />
        <Tabs.Screen
          name="health"
          options={{ title: 'Gesundheit', tabBarIcon: ({ color, size }) => <HeartPulse color={color} size={size} /> }}
        />
        <Tabs.Screen
          name="competitions"
          options={{ title: 'Wettkämpfe', tabBarIcon: ({ color, size }) => <Trophy color={color} size={size} /> }}
        />
        <Tabs.Screen
          name="goals"
          options={{ title: 'Ziele', tabBarIcon: ({ color, size }) => <Target color={color} size={size} /> }}
        />
        <Tabs.Screen
          name="coach"
          options={{ title: 'KI-Coach', tabBarIcon: ({ color, size }) => <MessageCircleHeart color={color} size={size} /> }}
        />
      </Tabs>
    </>
  );
}
