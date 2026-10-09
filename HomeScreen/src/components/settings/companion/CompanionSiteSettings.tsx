import Text from '../../shared/ReadingText';
import { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../theme/ThemeContext';
import { companionSiteUrl } from '../../../services/companionSite';
import { getDeviceConnectionInfo } from '../../../services/api';

export default function CompanionSiteSettings() {
  const theme = useTheme();
  const { user } = useAuth();
  const [focused, setFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState(() => companionSiteUrl('/dashboard'));
  useEffect(() => {
    let cancelled = false;
    void getDeviceConnectionInfo()
      .then((info) => {
        if (!cancelled && info.companionUrl) {
          const canonical = companionSiteUrl('/dashboard', info.companionUrl);
          if (canonical) setUrl(canonical);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);
  return (
    <View
      style={[
        styles.panel,
        {
          borderColor: theme.colors.glassBorder,
          backgroundColor: theme.colors.glassSurface,
        },
      ]}
    >
      <View style={styles.heading}>
        <MaterialCommunityIcons
          name='cellphone-link'
          size={28}
          color={theme.colors.focusRing}
        />
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
          Your dashboard, from your phone
        </Text>
      </View>
      <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
        Scan to open Dashboard Studio. Arrange cards, choose colors, connect
        your meal Sheet, and manage linked TVs. You can return here whenever you
        need the site.
      </Text>
      <Text style={[styles.account, { color: theme.colors.textPrimary }]}>
        Sign in with {user?.email || 'the Google account linked to this TV'}.
      </Text>
      {url ? (
        <View style={styles.qrRow}>
          <View style={styles.qrBox}>
            <QRCode value={url} size={190} quietZone={10} />
          </View>
          <View style={styles.instructions}>
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
              Or type this address on a phone or computer
            </Text>
            <Text
              selectable
              style={[styles.url, { color: theme.colors.textPrimary }]}
            >
              {url}
            </Text>
            <Pressable
              accessibilityRole='link'
              accessibilityLabel='Open HomeScreen companion site'
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onPress={() => {
                setError(null);
                void Linking.openURL(url).catch(() =>
                  setError(
                    'Could not open a browser. Scan the QR code or type the address on another device.',
                  ),
                );
              }}
              style={[
                styles.button,
                { borderColor: theme.colors.focusRing },
                focused && styles.focused,
              ]}
            >
              <MaterialCommunityIcons
                name='open-in-new'
                size={20}
                color={theme.colors.focusRing}
              />
              <Text
                style={[styles.buttonText, { color: theme.colors.focusRing }]}
              >
                Open companion site
              </Text>
            </Pressable>
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
              Saved changes appear on the TV within about a minute.
            </Text>
          </View>
        </View>
      ) : (
        <Text
          style={[styles.description, { color: theme.colors.textSecondary }]}
        >
          The companion address has not been configured for this build.
        </Text>
      )}
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { padding: 22, borderWidth: 1, borderRadius: 18 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { fontSize: 23, fontWeight: '700', flexShrink: 1 },
  description: { fontSize: 16, lineHeight: 23, marginTop: 15, maxWidth: 780 },
  account: { fontSize: 16, fontWeight: '600', marginTop: 12 },
  qrRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 26,
    marginTop: 22,
  },
  qrBox: { padding: 6, borderRadius: 12, backgroundColor: '#FFFFFF' },
  instructions: { flexShrink: 1, gap: 14, maxWidth: 540 },
  label: { fontSize: 14, lineHeight: 20 },
  url: { fontSize: 18, fontWeight: '600' },
  button: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    alignSelf: 'flex-start',
    minHeight: 48,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderWidth: 2,
    borderRadius: 10,
  },
  buttonText: { fontSize: 16, fontWeight: '700' },
  focused: { borderWidth: 3, transform: [{ scale: 1.03 }] },
  error: { fontSize: 14, lineHeight: 21, color: '#FCA5A5', marginTop: 14 },
});
