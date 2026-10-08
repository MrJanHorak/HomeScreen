import {createContext, useContext, useEffect, useState} from 'react';
import type {ReactNode} from 'react';
import {AppState} from 'react-native';
import {fetchPollFeed} from '../services/api';
import {useAppearance} from '../theme/ThemeContext';
import type {PollView} from '../../../server/functions/src/utils/polls';

interface PollStore {rounds: Record<string, PollView>; stale: boolean; loading: boolean; offsetMs: number; updatedAtMs: number}
const PollsContext = createContext<PollStore>({rounds: {}, stale: false, loading: true, offsetMs: 0, updatedAtMs: 0});
const PollVisibilityContext = createContext<(visible: boolean) => void>(() => undefined);
export const usePolls = () => useContext(PollsContext);
export const usePollVisibility = () => useContext(PollVisibilityContext);
export function PollsProvider({children}: {children: ReactNode}) {
  const {appearance} = useAppearance();
  const [visible, setVisible] = useState(true);
  const [store, setStore] = useState<PollStore>({rounds: {}, stale: false, loading: true, offsetMs: 0, updatedAtMs: 0});
  const roundIds = (appearance.widgetLayout?.widgets || []).filter((w) => w.visible && w.kind === 'poll').map((w) => w.roundId).sort().join(',');
  useEffect(() => {
    let active = true; let pending = false; let failures = 0; let timer: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | undefined;
    if (!visible) return;
    async function refresh() {
      if (!active || pending || AppState.currentState === 'background') return;
      pending = true; controller = new AbortController(); const started = Date.now();
      const timeout = setTimeout(() => controller?.abort(), 10000);
      let open = false;
      try {
        const result = await fetchPollFeed(controller.signal);
        if (!active) return;
        const rounds = Object.fromEntries(result.rounds.map((r) => [r.id, r]));
        const offsetMs = result.serverNowMs - (started + Date.now()) / 2;
        open = result.rounds.some((r) => r.state === 'open'); failures = 0;
        setStore((previous) => ({rounds: JSON.stringify(previous.rounds) === JSON.stringify(rounds) ? previous.rounds : rounds,
          stale: false, loading: false, offsetMs, updatedAtMs: Date.now()}));
      } catch {
        if (active) {failures++; setStore((previous) => ({...previous, loading: false, stale: true}));}
      } finally {
        clearTimeout(timeout); pending = false;
        if (active) timer = setTimeout(() => void refresh(), failures ? Math.min(30000, 3000 * 2 ** failures) : open ? 3000 : 30000);
      }
    }
    void refresh();
    const sub = AppState.addEventListener('change', (state) => {clearTimeout(timer); if (state === 'active') void refresh();});
    return () => {active = false; clearTimeout(timer); controller?.abort(); sub.remove();};
  }, [roundIds, visible]);
  return <PollVisibilityContext.Provider value={setVisible}><PollsContext.Provider value={store}>{children}</PollsContext.Provider></PollVisibilityContext.Provider>;
}
