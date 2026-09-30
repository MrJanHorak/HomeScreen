import React, { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useAppearance, useTheme } from '../../theme/ThemeContext';
import {
  beginGooglePhotosConnection, createGooglePhotosSession,
  getGooglePhotosStatus, pollGooglePhotosSession,
} from '../../services/api';

type Phase = 'idle' | 'connecting' | 'consent' | 'picking';

export default function GooglePhotosBackgroundPicker() {
  const theme = useTheme();
  const { ready, appearance, photoDataUrl, setBackground, setGooglePhoto } = useAppearance();
  const [phase, setPhase] = useState<Phase>('idle');
  const [link, setLink] = useState<string | null>(null);
  const [pollIntervalMs, setPollIntervalMs] = useState(3000);
  const [error, setError] = useState<string | null>(null);
  const [focusedAction, setFocusedAction] = useState<string | null>(null);
  const focusStyle = (action: string) => focusedAction === action
    ? { borderColor: theme.colors.focusRing, borderWidth: 3 } : null;
  const focusProps = (action: string) => ({
    onFocus: () => setFocusedAction(action),
    onBlur: () => setFocusedAction((current) => current === action ? null : current),
  });

  const createSession = useCallback(async () => {
    const session = await createGooglePhotosSession();
    setLink(session.pickerUri);
    setPollIntervalMs(session.pollIntervalMs);
    setPhase('picking');
  }, []);

  const begin = async () => {
    setError(null);
    setPhase('connecting');
    try {
      if (await getGooglePhotosStatus()) {
        await createSession();
      } else {
        setLink(await beginGooglePhotosConnection());
        setPhase('consent');
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Google Photos is unavailable.');
      setPhase('idle');
    }
  };

  useEffect(() => {
    if (phase !== 'consent') return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        if (await getGooglePhotosStatus()) {
          if (!cancelled) {
            try {
              await createSession();
            } catch (cause) {
              setError(cause instanceof Error ? cause.message : 'Could not open Google Photos.');
              setLink(null);
              setPhase('idle');
            }
          }
          return;
        }
      } catch (cause) {
        console.warn('Photos connection check failed:', cause);
      }
      if (!cancelled) timer = setTimeout(poll, 3000);
    };
    timer = setTimeout(poll, 3000);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [phase, createSession]);

  useEffect(() => {
    if (phase !== 'picking') return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const result = await pollGooglePhotosSession();
        if (cancelled) return;
        if (result.status === 'selected' && result.dataUrl) {
          setGooglePhoto(result.dataUrl);
          setLink(null);
          setPhase('idle');
          return;
        }
        timer = setTimeout(poll, result.pollIntervalMs || pollIntervalMs);
      } catch (cause) {
        if (cancelled) return;
        setError(cause instanceof Error ? cause.message : 'Could not retrieve the selected photo.');
        setLink(null);
        setPhase('idle');
      }
    };
    timer = setTimeout(poll, pollIntervalMs);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [phase, pollIntervalMs, setGooglePhoto]);

  return (
    <View style={[styles.panel, { borderColor: theme.colors.glassBorder }]}>
      <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Google Photos</Text>
      <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
        Choose one photo from your library. A display-sized copy is saved for this dashboard.
      </Text>
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          {...focusProps('choose')}
          disabled={!ready || phase !== 'idle'}
          onPress={() => void begin()}
          style={[styles.button, { borderColor: theme.colors.focusRing, opacity: !ready || phase !== 'idle' ? 0.5 : 1 }, focusStyle('choose')]}
        >
          <Text style={[styles.buttonText, { color: theme.colors.textPrimary }]}>
            {phase === 'connecting' ? 'Connecting…' : 'Choose from Google Photos'}
          </Text>
        </Pressable>
        {photoDataUrl && (
          <Pressable accessibilityRole="button" {...focusProps('use-photo')} onPress={() => setBackground('google-photo')}
            style={[styles.button, { borderColor: appearance.background === 'google-photo' ? theme.colors.focusRing : theme.colors.glassBorder }, focusStyle('use-photo')]}>
            <Text style={[styles.buttonText, { color: theme.colors.textPrimary }]}>Use selected photo</Text>
          </Pressable>
        )}
      </View>
      {link && (phase === 'consent' || phase === 'picking') && (
        <View style={styles.qrRow}>
          <View style={styles.qrBox}><QRCode value={link} size={180} quietZone={7} /></View>
          <View style={styles.qrText}>
            <Text style={[styles.description, { color: theme.colors.textPrimary }]}>
              {phase === 'consent'
                ? 'Scan with your phone to grant Google Photos access.'
                : 'Scan with your phone and select a photo. The TV will update automatically.'}
            </Text>
            <Pressable accessibilityRole="link" {...focusProps('open-link')} onPress={() => void Linking.openURL(link)}
              style={[styles.button, { borderColor: theme.colors.glassBorder }, focusStyle('open-link')]}>
              <Text style={[styles.buttonText, { color: theme.colors.focusRing }]}>Open link on this device</Text>
            </Pressable>
            <Pressable accessibilityRole="button" {...focusProps('cancel')} onPress={() => { setPhase('idle'); setLink(null); }}
              style={[styles.button, { borderColor: theme.colors.glassBorder }, focusStyle('cancel')]}>
              <Text style={[styles.cancel, { color: theme.colors.textSecondary }]}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      )}
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { marginTop: 14, padding: 14, borderWidth: 1, borderRadius: 14 },
  title: { fontSize: 16, fontWeight: '700' },
  description: { fontSize: 13, lineHeight: 19, marginTop: 4 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
  button: { minHeight: 50, justifyContent: 'center', borderWidth: 1.5, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 15, alignSelf: 'flex-start' },
  buttonText: { fontSize: 16, fontWeight: '700' },
  qrRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 16, alignItems: 'center' },
  qrBox: { padding: 8, borderRadius: 10, backgroundColor: '#FFFFFF' },
  qrText: { flex: 1, minWidth: 180, gap: 12 },
  cancel: { marginTop: 7, fontSize: 13 },
  error: { color: '#FCA5A5', marginTop: 10, fontSize: 13 },
});
