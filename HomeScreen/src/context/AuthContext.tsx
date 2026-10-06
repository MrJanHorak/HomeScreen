import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from 'react';
import {
  onAuthStateChanged,
  signInWithCustomToken,
  signOut as fbSignOut,
  User,
} from 'firebase/auth';
import type { DevicePairingResponse } from '../../../shared/src/types';
import { auth } from '../services/firebase';
import {
  requestDevicePairing,
  pollDevicePairing,
  disconnectCurrentDevice,
} from '../services/api';
import { clearLocalUserData } from '../services/localUserData';

const POLL_INTERVAL_MS = 3000;

interface AuthContextValue {
  user: User | null;
  initializing: boolean;
  pairing: DevicePairingResponse | null;
  pairingError: string | null;
  startPairing: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [pairing, setPairing] = useState<DevicePairingResponse | null>(null);
  const [pairingError, setPairingError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  }, []);

  // Restore a persisted session (or learn there isn't one)
  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setInitializing(false);
    });
  }, []);

  const startPairing = useCallback(async () => {
    stopPolling();
    setPairingError(null);
    try {
      const p = await requestDevicePairing();
      setPairing(p);

      timer.current = setInterval(async () => {
        try {
          const result = await pollDevicePairing(p);
          if (result.status === 'authorized' && result.customToken) {
            stopPolling();
            await signInWithCustomToken(auth, result.customToken);
            setPairing(null);
          } else if (result.status === 'expired') {
            stopPolling();
            setPairing(null);
            setPairingError('Code expired. Requesting a new one...');
            startPairing();
          }
        } catch {
          // Transient network error: keep polling
        }
      }, POLL_INTERVAL_MS);
    } catch (err) {
      setPairing(null);
      setPairingError(
        err instanceof Error ? err.message : 'Could not reach the server',
      );
    }
  }, [stopPolling]);

  // Signed out and no active code: get one
  useEffect(() => {
    if (!initializing && !user && !pairing && !pairingError) startPairing();
  }, [initializing, user, pairing, pairingError, startPairing]);

  useEffect(() => stopPolling, [stopPolling]);

  const signOut = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    if (uid) await disconnectCurrentDevice().catch(() => undefined);
    await fbSignOut(auth);
    if (uid) await clearLocalUserData(uid).catch(() => undefined);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        initializing,
        pairing,
        pairingError,
        startPairing,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
