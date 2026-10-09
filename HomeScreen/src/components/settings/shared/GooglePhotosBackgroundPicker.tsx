import Pressable from '../../shared/NarratedPressable';
import Text from '../../shared/ReadingText';
import React, { useCallback, useEffect, useState } from 'react';
import {Image, Linking, StyleSheet, View} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useAppearance, useTheme } from '../../../theme/ThemeContext';
import { auth } from '../../../services/firebase';
import {
  beginGooglePhotosConnection,
  createGooglePhotosSession,
  getGooglePhotosStatus,
  pollGooglePhotosSession,
} from '../../../services/api';

type Phase = 'idle' | 'connecting' | 'consent' | 'picking';

export default function GooglePhotosBackgroundPicker({
  purpose = 'background',
}: {
  purpose?: 'background' | 'ambient';
}) {
  const theme = useTheme();
  const {
    ready,
    appearance,
    photoDataUrl,
    ambientPhotos,
    setBackground,
    setGooglePhotos,
  } = useAppearance();
  const [phase, setPhase] = useState<Phase>('idle');
  const [link, setLink] = useState<string | null>(null);
  const [pollIntervalMs, setPollIntervalMs] = useState(3000);
  const [error, setError] = useState<string | null>(null);
  const [focusedAction, setFocusedAction] = useState<string | null>(null);
  const connectedAccount =
    auth.currentUser?.providerData.find(
      (provider) => provider.providerId === 'google.com',
    )?.email ?? auth.currentUser?.email;
  const focusStyle = (action: string) =>
    focusedAction === action
      ? { borderColor: theme.colors.focusRing, borderWidth: 3 }
      : null;
  const focusProps = (action: string) => ({
    onFocus: () => setFocusedAction(action),
    onBlur: () =>
      setFocusedAction((current) => (current === action ? null : current)),
  });

  const createSession = useCallback(async () => {
    const session = await createGooglePhotosSession(purpose);
    setLink(session.pickerUri);
    setPollIntervalMs(session.pollIntervalMs);
    setPhase('picking');
  }, [purpose]);

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
      setError(
        cause instanceof Error
          ? cause.message
          : 'Google Photos is unavailable.',
      );
      setPhase('idle');
    }
  };

  const refreshSession = async () => {
    setError(null);
    setLink(null);
    setPhase('connecting');
    try {
      await createSession();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Could not create a new photo code.',
      );
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
              setError(
                cause instanceof Error
                  ? cause.message
                  : 'Could not open Google Photos.',
              );
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
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [phase, createSession]);

  useEffect(() => {
    if (phase !== 'picking') return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const result = await pollGooglePhotosSession();
        if (cancelled) return;
        if (result.status === 'selected' && result.photos?.length) {
          setGooglePhotos(result.photos, purpose === 'background');
          setLink(null);
          setPhase('idle');
          return;
        }
        timer = setTimeout(poll, result.pollIntervalMs || pollIntervalMs);
      } catch (cause) {
        if (cancelled) return;
        setError(
          cause instanceof Error
            ? cause.message
            : 'Could not retrieve the selected photo.',
        );
        setLink(null);
        setPhase('idle');
      }
    };
    timer = setTimeout(poll, pollIntervalMs);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [phase, pollIntervalMs, purpose, setGooglePhotos]);

  return (
    <View style={[styles.panel, { borderColor: theme.colors.glassBorder }]}>
      <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
        Google Photos
      </Text>
      <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
        Choose up to eight photos on your phone. Your new selection replaces the
        current ambient photo set.
        {purpose === 'background'
          ? ' The first photo also becomes the dashboard background.'
          : ''}
      </Text>
      <View style={styles.actions}>
        <Pressable
          accessibilityRole='button'
          {...focusProps('choose')}
          disabled={!ready || phase !== 'idle'}
          onPress={() => void begin()}
          style={[
            styles.button,
            {
              borderColor: theme.colors.focusRing,
              opacity: !ready || phase !== 'idle' ? 0.5 : 1,
            },
            focusStyle('choose'),
          ]}
        >
          <Text
            style={[styles.buttonText, { color: theme.colors.textPrimary }]}
          >
            {phase === 'connecting'
              ? 'Connecting…'
              : 'Choose photos from Google Photos'}
          </Text>
        </Pressable>
        {purpose === 'background' && photoDataUrl && (
          <Pressable
            accessibilityRole='button'
            {...focusProps('use-photo')}
            onPress={() => setBackground('google-photo')}
            style={[
              styles.button,
              {
                borderColor:
                  appearance.background === 'google-photo'
                    ? theme.colors.focusRing
                    : theme.colors.glassBorder,
              },
              focusStyle('use-photo'),
            ]}
          >
            <Text
              style={[styles.buttonText, { color: theme.colors.textPrimary }]}
            >
              Use selected photo
            </Text>
          </Pressable>
        )}
      </View>
      {ambientPhotos.length > 0 && (
        <>
          <Text
            style={[styles.description, { color: theme.colors.textSecondary }]}
          >
            {ambientPhotos.length} selected{' '}
            {ambientPhotos.length === 1 ? 'photo' : 'photos'} for Ambient Mode
          </Text>
          <View style={styles.thumbnails}>
            {ambientPhotos.map((photo, index) => (
              <Image
                key={photo.id}
                source={{ uri: photo.dataUrl }}
                style={styles.thumbnail}
                accessibilityLabel={`Ambient photo ${index + 1}`}
              />
            ))}
          </View>
        </>
      )}
      {link && (phase === 'consent' || phase === 'picking') && (
        <View style={styles.qrRow}>
          <View style={styles.qrBox}>
            <QRCode value={link} size={180} quietZone={7} />
          </View>
          <View style={styles.qrText}>
            <Text
              style={[styles.description, { color: theme.colors.textPrimary }]}
            >
              {phase === 'consent'
                ? 'Scan with your phone to grant Google Photos access.'
                : `Scan with a phone signed into ${connectedAccount || 'the connected Google account'}. Select up to eight photos, then tap Done. The TV will update shortly.`}
            </Text>
            {phase === 'picking' && (
              <Text
                style={[
                  styles.description,
                  { color: theme.colors.textSecondary },
                ]}
              >
                If Google Photos cannot open this link, open it in Chrome with
                the same account, or generate a new QR code.
              </Text>
            )}
            <Pressable
              accessibilityRole='link'
              {...focusProps('open-link')}
              onPress={() => void Linking.openURL(link)}
              style={[
                styles.button,
                { borderColor: theme.colors.glassBorder },
                focusStyle('open-link'),
              ]}
            >
              <Text
                style={[styles.buttonText, { color: theme.colors.focusRing }]}
              >
                Open link on this device
              </Text>
            </Pressable>
            {phase === 'picking' && (
              <Pressable
                accessibilityRole='button'
                {...focusProps('refresh')}
                onPress={() => void refreshSession()}
                style={[
                  styles.button,
                  { borderColor: theme.colors.glassBorder },
                  focusStyle('refresh'),
                ]}
              >
                <Text
                  style={[
                    styles.buttonText,
                    { color: theme.colors.textPrimary },
                  ]}
                >
                  New QR code
                </Text>
              </Pressable>
            )}
            <Pressable
              accessibilityRole='button'
              {...focusProps('cancel')}
              onPress={() => {
                setPhase('idle');
                setLink(null);
              }}
              style={[
                styles.button,
                { borderColor: theme.colors.glassBorder },
                focusStyle('cancel'),
              ]}
            >
              <Text
                style={[styles.cancel, { color: theme.colors.textSecondary }]}
              >
                Cancel
              </Text>
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
  thumbnails: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  thumbnail: { width: 96, height: 60, borderRadius: 7 },
  button: {
    minHeight: 50,
    justifyContent: 'center',
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 15,
    alignSelf: 'flex-start',
  },
  buttonText: { fontSize: 16, fontWeight: '700' },
  qrRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 16,
    alignItems: 'center',
  },
  qrBox: { padding: 8, borderRadius: 10, backgroundColor: '#FFFFFF' },
  qrText: { flex: 1, minWidth: 180, gap: 12 },
  cancel: { marginTop: 7, fontSize: 13 },
  error: { color: '#FCA5A5', marginTop: 10, fontSize: 13 },
});
