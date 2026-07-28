import { useEffect, useState, useCallback } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LayoutDashboard, Activity, HeartPulse, Trophy, Target, MessageCircleHeart } from 'lucide-react-native';
import { Colors } from '@/constants/theme';
import { registerPushNotifications } from '@/lib/registerPushNotifications';
import { api, setApiPassword } from '@/lib/api';
import { getStoredPassword } from '@/lib/authStore';
import { LoginScreen } from '@/components/auth/LoginScreen';

export default function RootLayout() {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      const stored = await getStoredPassword();
      if (!stored) {
        setAuthed(false);
        return;
      }
      setApiPassword(stored);
      try {
        await api.auth.verify();
        setAuthed(true);
      } catch {
        setApiPassword(null);
        setAuthed(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!authed) return;
    registerPushNotifications().catch(() => {
      // best-effort — a failed registration just means no push notifications, not a crash
    });
  }, [authed]);

  const handleLoginSuccess = useCallback(() => setAuthed(true), []);

  if (authed === null) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <StatusBar style="light" />
        <ActivityIndicator color={Colors.accent} />
      </View>
    );
  }

  if (!authed) {
    return (
      <>
        <StatusBar style="light" />
        <LoginScreen onSuccess={handleLoginSuccess} />
      </>
    );
  }

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
