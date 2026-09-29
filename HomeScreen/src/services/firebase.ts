import { getApp, getApps, initializeApp } from 'firebase/app';
import * as FirebaseAuth from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Web-app config from Firebase console > Project settings > Your apps.
// These values are identifiers, not secrets; security comes from Auth + rules.
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

let _auth: FirebaseAuth.Auth;
try {
  // Persists the session across TV app restarts
  if (Platform.OS === 'web') {
    _auth = FirebaseAuth.getAuth(app);
  } else {
    // The Firebase RN runtime exports this, although its web type entry omits it.
    const nativeAuth = FirebaseAuth as typeof FirebaseAuth & {
      getReactNativePersistence: (storage: typeof AsyncStorage) => FirebaseAuth.Persistence;
    };
    _auth = FirebaseAuth.initializeAuth(app, {
      persistence: nativeAuth.getReactNativePersistence(AsyncStorage),
    });
  }
} catch {
  // Fast Refresh re-runs this module; auth is already initialized
  _auth = FirebaseAuth.getAuth(app);
}

export const auth = _auth;
