import {useCallback, useEffect, useRef, useState} from 'react';
import {AppState, Platform, StyleSheet, View} from 'react-native';
import {requireOptionalNativeModule} from 'expo';
import Text from '../../shared/ReadingText';
import Option from '../appearance/AppearanceOption';
import SettingsPanel from '../shared/SettingsPanel';

interface TvStatus {
  network: string;
  inputs: Array<{id: string; label: string; state: string}>;
}
interface TvSystemModule {
  getTvSystemStatus?(): Promise<TvStatus>;
  openTvSettings?(section: 'device' | 'network'): Promise<boolean>;
  openTvInput?(id: string): Promise<boolean>;
}
const native = Platform.OS === 'android' ? requireOptionalNativeModule<TvSystemModule>('TvWatchNext') : null;

export default function TvSystemControls() {
  const [status, setStatus] = useState<TvStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const mounted = useRef(false);
  const refresh = useCallback(async () => {
    if (!native?.getTvSystemStatus) return;
    try {
      const result = await native.getTvSystemStatus();
      if (mounted.current) {setStatus(result); setError(null);}
    } catch {
      if (mounted.current) setError('TV status is unavailable. Try refreshing.');
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    void refresh();
    const sub = AppState.addEventListener('change', (state) => {if (state === 'active') void refresh();});
    return () => {mounted.current = false; sub.remove();};
  }, [refresh]);
  const open = async (action: () => Promise<boolean> | undefined) => {
    setBusy(true);
    setError(null);
    try {
      if (!(await action()) && mounted.current) setError('This control is unavailable on this TV. Use the TV remote’s settings or input button.');
    } catch {
      if (mounted.current) setError('The TV could not open this control.');
    } finally {
      if (mounted.current) setBusy(false);
    }
  };
  if (Platform.OS !== 'android') return null;
  return <SettingsPanel>
    <Text style={styles.title}>TV controls</Text>
    {!native?.getTvSystemStatus ? <Text style={styles.description}>TV controls require an updated HomeScreen app.</Text> : <>
      <Text style={styles.description}>Network: {status?.network || 'Checking…'}</Text>
      <View style={styles.actions}>
        <Option compact label='Network settings' disabled={busy} onPress={() => void open(() => native.openTvSettings?.('network'))}/>
        <Option compact label='Android settings' disabled={busy} onPress={() => void open(() => native.openTvSettings?.('device'))}/>
        <Option compact label='Refresh TV status' disabled={busy} onPress={() => void refresh()}/>
      </View>
      {!!status?.inputs.length && <>
        <Text style={styles.title}>Inputs</Text>
        <View style={styles.actions}>{status.inputs.map((input) => <Option compact key={input.id}
          label={input.label} subtitle={input.state} disabled={busy}
          onPress={() => void open(() => native.openTvInput?.(input.id))}/>)}</View>
      </>}
    </>}
    {error && <Text style={styles.description} accessibilityRole='alert'>{error}</Text>}
  </SettingsPanel>;
}

const styles = StyleSheet.create({
  title: {fontSize: 20, fontWeight: '700'}, description: {fontSize: 15, lineHeight: 21},
  actions: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
});
