import {createContext, useContext, useEffect, useState} from 'react';
import type {ReactNode} from 'react';
import {AppState} from 'react-native';
import type {PeopleActivityFeed} from '../../../shared/src/people';
import {fetchPeopleActivity} from '../services/api';
import {useAuth} from './AuthContext';

const EMPTY: PeopleActivityFeed['people'] = [];
const PeopleContext = createContext<{people: PeopleActivityFeed['people']; error: string | null}>({people: EMPTY, error: null});

/** Shared health is kept only in memory, expires during outages, and clears on account/app changes. */
export function PeopleProvider({children}: {children: ReactNode}) {
  const {user} = useAuth();
  const [people, setPeople] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true; let busy = false; let request: AbortController | null = null;
    let expiry: ReturnType<typeof setTimeout> | undefined;
    let foreground = AppState.currentState !== 'background' && AppState.currentState !== 'inactive';
    setPeople(EMPTY); setError(null);
    const refresh = async () => {
      if (!active || !foreground || busy || !user) return;
      busy = true; const controller = new AbortController(); request = controller;
      const timeout = setTimeout(() => controller.abort(), 15000);
      try {
        const result = await fetchPeopleActivity(controller.signal);
        if (!active || !foreground || controller.signal.aborted) return;
        setPeople(result.people); setError(null); clearTimeout(expiry);
        expiry = setTimeout(() => setPeople(EMPTY), 45000);
      } catch {
        if (active) {setPeople(EMPTY); setError('Shared activity could not refresh.');}
      } finally {clearTimeout(timeout); busy = false;}
    };
    void refresh();
    const timer = setInterval(() => void refresh(), 30000);
    const subscription = AppState.addEventListener('change', (state) => {
      foreground = state === 'active';
      if (!foreground) {request?.abort(); setPeople(EMPTY); clearTimeout(expiry);}
      else void refresh();
    });
    return () => {active = false; request?.abort(); clearInterval(timer); clearTimeout(expiry); subscription.remove();};
  }, [user?.uid]);
  return <PeopleContext.Provider value={{people, error}}>{children}</PeopleContext.Provider>;
}
export function usePeople() {return useContext(PeopleContext);}
