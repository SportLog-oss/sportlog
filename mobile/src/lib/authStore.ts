import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const KEY = 'sportlog_app_password';

// expo-secure-store has no web implementation (SecureStore maps to Keychain/Keystore, which
// don't exist in a browser) — it throws at runtime on web instead of no-oping. Since this app
// ships an Expo web target (app.json `web.output`), fall back to localStorage there. This is a
// convenience shim for previewing the app in a browser, not a hardened web storage strategy —
// native (iOS/Android) still uses the real secure enclave via SecureStore.
const isWeb = Platform.OS === 'web';

export async function getStoredPassword(): Promise<string | null> {
  if (isWeb) return typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null;
  return SecureStore.getItemAsync(KEY);
}

export async function setStoredPassword(password: string): Promise<void> {
  if (isWeb) {
    if (typeof localStorage !== 'undefined') localStorage.setItem(KEY, password);
    return;
  }
  await SecureStore.setItemAsync(KEY, password);
}

export async function clearStoredPassword(): Promise<void> {
  if (isWeb) {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(KEY);
    return;
  }
  await SecureStore.deleteItemAsync(KEY);
}
