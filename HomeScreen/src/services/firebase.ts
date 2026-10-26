import { getApp, getApps, initializeApp } from 'firebase/app';
import * as FirebaseAuth from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import {markStartup} from './startupTiming';

// Web-app config from Firebase console > Project settings > Your apps.
// These values are identifiers, not secrets; security comes from Auth + rules.
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Firebase stores a refresh token in its persistence record. Migrate an existing
// AsyncStorage session once, then remove the unencrypted copy.
let restoredUserReads = 0;
const secureAuthStorage = {
  async getItem(key: string): Promise<string | null> {
    // Firebase reads the saved user while selecting persistence, then again
    // before validating the session. Identify the operation, never log its key.
    const read = key.startsWith('firebase:authUser:') ? ++restoredUserReads : 0;
    if (read === 1 || read === 2) markStartup(read === 1 ? 'auth-user-read-1' : 'auth-user-read-2');
    try {
      const secureKey = `auth_${key.replace(/[^A-Za-z0-9._-]/g, '_')}`;
      const saved = await SecureStore.getItemAsync(secureKey);
      if (saved !== null) return saved;
      const legacy = await AsyncStorage.getItem(key);
      if (legacy !== null) {
        await SecureStore.setItemAsync(secureKey, legacy);
        await AsyncStorage.removeItem(key);
      }
      return legacy;
    } finally {
      if (read === 1 || read === 2) markStartup(read === 1 ? 'auth-user-ready-1' : 'auth-user-ready-2');
    }
  },
  async setItem(key: string, value: string): Promise<void> {
    const userWrite = key.startsWith('firebase:authUser:');
    if (userWrite) markStartup('auth-user-write');
    const secureKey = `auth_${key.replace(/[^A-Za-z0-9._-]/g, '_')}`;
    await SecureStore.setItemAsync(secureKey, value);
    await AsyncStorage.removeItem(key);
    if (userWrite) markStartup('auth-user-written');
  },
  async removeItem(key: string): Promise<void> {
    const secureKey = `auth_${key.replace(/[^A-Za-z0-9._-]/g, '_')}`;
    await Promise.all([
      SecureStore.deleteItemAsync(secureKey),
      AsyncStorage.removeItem(key),
    ]);
  },
};

let _auth: FirebaseAuth.Auth;
markStartup('auth-init');
try {
  // Persists the session across TV app restarts
  if (Platform.OS === 'web') {
    _auth = FirebaseAuth.getAuth(app);
  } else {
    // The Firebase RN runtime exports this, although its web type entry omits it.
    const nativeAuth = FirebaseAuth as typeof FirebaseAuth & {
      getReactNativePersistence: (
        storage: typeof secureAuthStorage,
      ) => FirebaseAuth.Persistence;
    };
    _auth = FirebaseAuth.initializeAuth(app, {
      persistence: nativeAuth.getReactNativePersistence(secureAuthStorage),
    });
  }
} catch (error) {
  // Fast Refresh re-runs this module; auth is already initialized
  if ((error as { code?: string }).code !== 'auth/already-initialized')
    throw error;
  _auth = FirebaseAuth.getAuth(app);
}

export const auth = _auth;
