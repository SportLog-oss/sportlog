import * as SecureStore from 'expo-secure-store';

const KEY = 'sportlog_app_password';

export async function getStoredPassword(): Promise<string | null> {
  return SecureStore.getItemAsync(KEY);
}

export async function setStoredPassword(password: string): Promise<void> {
  await SecureStore.setItemAsync(KEY, password);
}

export async function clearStoredPassword(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY);
}
