import React from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';

export default function PairingScreen() {
  const { pairing, pairingError } = useAuth();
  const theme = useTheme();
  const { height } = useWindowDimensions();
  const compact = height < 700;
  const qrSize = Math.min(compact ? 150 : 200, Math.floor(height * 0.27));
  const pairingLink = pairing ? new URL(pairing.verificationUrl) : null;
  if (pairingLink && pairing) pairingLink.searchParams.set('code', pairing.code);
  const shortAddress = pairing ? new URL(pairing.verificationUrl).host : '';

  return (
    <View style={styles.container}>
      <Text style={[styles.title, compact && styles.compactTitle, { color: theme.colors.textPrimary }]}>
        Connect this TV
      </Text>
      <Text style={[styles.description, compact && styles.compactDescription, { color: theme.colors.textSecondary }]}>
        {pairing ? 'Scan with your phone, or visit the address below.' : 'Getting a pairing code...'}
      </Text>
      {pairing && (
        <View style={styles.pairingContent}>
          {pairingLink && (
            <View style={[styles.qrBox, compact && styles.compactQrBox]}>
              <QRCode value={pairingLink.toString()} size={qrSize} quietZone={6} />
            </View>
          )}
          <Text numberOfLines={1} adjustsFontSizeToFit
            style={[styles.address, compact && styles.compactAddress, { color: theme.colors.textSecondary }]}>
            {shortAddress}
          </Text>
          <Text numberOfLines={1} adjustsFontSizeToFit
            style={[styles.code, compact && styles.compactCode, { color: theme.colors.accent }]}>
            {pairing.code}
          </Text>
        </View>
      )}
      <Text style={[styles.instructions, { color: theme.colors.textSecondary }]}>
        Confirm the code on your phone, then approve Google access.
      </Text>
      {pairingError && <Text style={[styles.error, { color: theme.colors.accent }]}>{pairingError}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 12 },
  title: { fontSize: 42, fontWeight: '700', textAlign: 'center' },
  description: { fontSize: 24, textAlign: 'center', marginTop: 12, marginBottom: 18 },
  pairingContent: { alignItems: 'center', width: '100%' },
  qrBox: { padding: 12, backgroundColor: '#FFFFFF', borderRadius: 16 },
  address: { fontSize: 24, fontWeight: '600', textAlign: 'center', marginTop: 14, maxWidth: '100%' },
  code: { fontSize: 64, fontWeight: '800', letterSpacing: 8, textAlign: 'center', maxWidth: '100%' },
  instructions: { fontSize: 16, textAlign: 'center', marginTop: 16 },
  error: { fontSize: 16, textAlign: 'center', marginTop: 10 },
  compactTitle: { fontSize: 28 },
  compactDescription: { fontSize: 17, marginTop: 6, marginBottom: 10 },
  compactQrBox: { padding: 7, borderRadius: 12 },
  compactAddress: { fontSize: 16, marginTop: 9 },
  compactCode: { fontSize: 43, letterSpacing: 5 },
});
