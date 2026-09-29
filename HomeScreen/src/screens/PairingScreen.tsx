import React from 'react';
import { View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import TVText from '../components/tv/TVText';
import { TVTheme } from '../theme/tvTheme';
import { useAuth } from '../context/AuthContext';

export default function PairingScreen() {
  const { pairing, pairingError } = useAuth();
  const pairingLink = pairing ? new URL(pairing.verificationUrl) : null;
  if (pairingLink && pairing) pairingLink.searchParams.set('code', pairing.code);
  const shortAddress = pairing ? new URL(pairing.verificationUrl).host : '';

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: TVTheme.spacing.xxl }}>
      <TVText text="Connect this TV" typography="headerLg" marginBottom="lg" />
      <TVText
        text={pairing ? 'Scan with your phone, or visit the address below.' : 'Getting a pairing code...'}
        typography="headerMd"
        color="textSecondary"
        marginBottom="lg"
      />
      {pairing && (
        <View style={{ alignItems: 'center' }}>
          {pairingLink && (
            <View style={{ padding: 12, backgroundColor: '#FFFFFF', borderRadius: 16, marginBottom: 20 }}>
              <QRCode value={pairingLink.toString()} size={200} quietZone={8} />
            </View>
          )}
          <TVText text={shortAddress} typography="headerMd" color="textSecondary" marginBottom="md" />
          <TVText text={pairing.code} typography="headerLg" color="accent" style={{ fontSize: 80, letterSpacing: 12 }} />
        </View>
      )}
      <TVText text="Confirm the code on your phone, then approve Google access." marginTop="lg" color="textSecondary" />
      {pairingError && <TVText text={pairingError} marginTop="md" color="accent" />}
    </View>
  );
}
