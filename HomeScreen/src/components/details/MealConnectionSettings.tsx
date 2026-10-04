import {useState} from 'react';
import {Linking, Pressable, StyleSheet, Text, View} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import {useDashboard} from '../../context/DashboardContext';
import {useTheme} from '../../theme/ThemeContext';
import {companionSiteUrl} from '../../services/companionSite';

const mealSetupUrl = companionSiteUrl('/meals');

export default function MealConnectionSettings() {
  const theme = useTheme();
  const {meals, refresh} = useDashboard();
  const [focused, setFocused] = useState<string | null>(null);
  const focusProps = (id: string) => ({
    onFocus: () => setFocused(id),
    onBlur: () => setFocused((current: string | null) => current === id ? null : current),
  });
  const status = meals.status === 'ok' ? 'Connected' :
    meals.status === 'unavailable' ? 'Connection needs attention' : 'Not connected';

  return (
    <View style={styles.panel}>
      <View style={styles.heading}>
        <MaterialCommunityIcons name="silverware-fork-knife" size={25} color={theme.colors.focusRing} />
        <Text style={[styles.title, {color: theme.colors.textPrimary}]}>Meal plan Sheet</Text>
      </View>
      <Text style={[styles.status, {color: meals.status === 'ok' ? '#34D399' : theme.colors.textSecondary}]}>
        {status}
      </Text>
      <Text style={[styles.description, {color: theme.colors.textSecondary}]}>
        Scan this code with your phone. Sign in with the Google account paired to this TV,
        allow Sheets access, and paste your meal plan Sheet link. Future updates to the same Sheet
        will appear here automatically.
      </Text>
      {mealSetupUrl ? <View style={styles.qrRow}>
        <View style={styles.qrBox}><QRCode value={mealSetupUrl} size={176} quietZone={7} /></View>
        <View style={styles.qrInstructions}>
          <Text selectable style={[styles.url, {color: theme.colors.textPrimary}]}>{mealSetupUrl}</Text>
          <Pressable accessibilityRole="link" accessibilityLabel="Open meal plan setup page"
            {...focusProps('open-meals')} onPress={() => void Linking.openURL(mealSetupUrl)}
            style={[styles.button, {borderColor: theme.colors.focusRing},
              focused === 'open-meals' && styles.focused]}>
            <Text style={[styles.buttonText, {color: theme.colors.focusRing}]}>Open setup page</Text>
          </Pressable>
        </View>
      </View> : <Text style={[styles.description, {color: theme.colors.textSecondary}]}>
        The setup link is unavailable. Contact the dashboard administrator.
      </Text>}
      <Pressable accessibilityRole="button" accessibilityLabel="Refresh meal plan"
        {...focusProps('refresh-meals')} onPress={() => void refresh()}
        style={[styles.button, {borderColor: theme.colors.glassBorder},
          focused === 'refresh-meals' && styles.focused]}>
        <Text style={[styles.buttonText, {color: theme.colors.textPrimary}]}>Refresh meal plan</Text>
      </Pressable>
      {meals.status === 'unavailable' && meals.message ?
        <Text style={styles.error}>{meals.message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {padding: 22, borderWidth: 1, borderColor: '#ffffff20', borderRadius: 18,
    backgroundColor: '#ffffff0b'},
  heading: {flexDirection: 'row', alignItems: 'center', gap: 10},
  title: {fontSize: 21, fontWeight: '700'},
  status: {fontSize: 14, fontWeight: '700', marginTop: 10},
  description: {fontSize: 15, lineHeight: 22, marginTop: 14, maxWidth: 700},
  qrRow: {flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 22,
    marginTop: 20, marginBottom: 16},
  qrBox: {padding: 4, borderRadius: 12, backgroundColor: '#fff'},
  qrInstructions: {flexShrink: 1, gap: 16},
  url: {fontSize: 15, maxWidth: 460},
  button: {alignSelf: 'flex-start', minHeight: 48, justifyContent: 'center',
    paddingHorizontal: 17, paddingVertical: 10, borderWidth: 1.5, borderRadius: 10, marginTop: 6},
  focused: {borderWidth: 3, transform: [{scale: 1.03}]},
  buttonText: {fontSize: 15, fontWeight: '700'},
  error: {fontSize: 14, color: '#FCA5A5', marginTop: 14},
});
