import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from 'react';
import { AppState } from 'react-native';
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
import {markStartup} from '../services/startupTiming';

const POLL_INTERVAL_MS = 3000;
const PAIRING_RETRY_MS = 30_000;
const PAIRING_RETRY_MAX_MS = 300_000;
const PAIRING_REQUEST_TIMEOUT_MS = 15_000;

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
  const [pairingFailures, setPairingFailures] = useState(0);
  const [foreground, setForeground] = useState(AppState.currentState !== 'background' && AppState.currentState !== 'inactive');
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const requesting = useRef(false);
  const requestController = useRef<AbortController | null>(null);
  const mounted = useRef(true);

  const stopPolling = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  }, []);

  // Restore a persisted session (or learn there isn't one)
  useEffect(() => {
    markStartup('auth-listener');
    return onAuthStateChanged(auth, (u) => {
      markStartup('auth-ready');
      setUser(u);
      setInitializing(false);
    });
  }, []);

  const startPairing = useCallback(async () => {
    if (requesting.current || !mounted.current || auth.currentUser) return;
    requesting.current = true;
    const controller = new AbortController();
    requestController.current = controller;
    const canceled = new Promise<never>((_resolve, reject) => {
      controller.signal.addEventListener('abort', () => reject(new Error('Pairing request canceled')), {once: true});
    });
    const timeout = setTimeout(() => controller.abort(), PAIRING_REQUEST_TIMEOUT_MS);
    stopPolling();
    setPairingError(null);
    try {
      const p = await Promise.race([requestDevicePairing(controller.signal), canceled]);
      if (!mounted.current || auth.currentUser) return;
      setPairingFailures(0);
      setPairing(p);

      timer.current = setInterval(async () => {
        try {
          const result = await pollDevicePairing(p);
          if (!mounted.current) return;
          if (result.status === 'authorized' && result.customToken) {
            stopPolling();
            await signInWithCustomToken(auth, result.customToken);
            if (mounted.current) setPairing(null);
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
    } catch {
      if (!mounted.current) return;
      setPairing(null);
      setPairingFailures(count => count + 1);
      setPairingError('Could not get a pairing code. Check the network connection.');
    } finally {
      clearTimeout(timeout);
      if (requestController.current === controller) requestController.current = null;
      requesting.current = false;
    }
  }, [stopPolling]);

  // Signed out and no active code: get one
  useEffect(() => {
    if (!initializing && !user && !pairing && !pairingError) startPairing();
  }, [initializing, user, pairing, pairingError, startPairing]);

  useEffect(() => {
    if (initializing || user || pairing || !pairingError || !foreground) return;
    const delay = Math.min(PAIRING_RETRY_MS * 2 ** Math.min(Math.max(0, pairingFailures - 1), 4), PAIRING_RETRY_MAX_MS);
    const retry = setTimeout(() => {void startPairing();}, delay);
    return () => clearTimeout(retry);
  }, [initializing, user, pairing, pairingError, pairingFailures, foreground, startPairing]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => setForeground(state === 'active'));
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    mounted.current = true;
    return () => {mounted.current = false; requestController.current?.abort(); stopPolling();};
  }, [stopPolling]);

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
