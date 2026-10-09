import Text from '../../shared/ReadingText';
import {ScrollView, StyleSheet, View} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {useTheme} from '../../../theme/ThemeContext';
import {useDashboard} from '../../../context/DashboardContext';
import {useDetailLayout} from '../../shared/DetailLayout';

function localDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${
    String(now.getDate()).padStart(2, '0')}`;
}

function friendlyDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}

export default function MealDetailView() {
  const theme = useTheme();
  const {twoColumns, compact} = useDetailLayout();
  const {meals} = useDashboard();
  const today = localDate();
  const upcoming = meals.items.filter((item) => item.date >= today).slice(0, 14);
  const next = upcoming[0];
  const message = meals.status === 'not_connected'
    ? 'Connect a Google Sheet in Settings → Meals to show your family menu.'
    : meals.status === 'unavailable'
      ? meals.message || 'The meal Sheet is unavailable.'
      : 'No upcoming dinners are listed in your Sheet.';

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, twoColumns && styles.columns]}
      showsVerticalScrollIndicator>
      {next ? <View style={[styles.hero, twoColumns && styles.dinnerColumn, compact && {padding: 14}]}>
        <View style={styles.heroLabel}>
          <MaterialCommunityIcons name="silverware-fork-knife" size={20} color="#F59E0B" />
          <Text style={styles.eyebrow}>{next.date === today ? "TONIGHT'S DINNER" : 'NEXT DINNER'}</Text>
        </View>
        <Text style={[styles.heroTitle, {color: theme.colors.textPrimary}]}>{next.title}</Text>
        <Text style={[styles.meta, {color: theme.colors.textSecondary}]}>
          {friendlyDate(next.date)}{next.servings ? `  ·  Serves ${next.servings}` : ''}
        </Text>
        {next.side ? <Text style={[styles.meta, {color: theme.colors.textSecondary}]}>
          Side: {next.side}
        </Text> : null}
        {next.cook ? <Text style={[styles.meta, {color: theme.colors.textSecondary}]}>
          Cook: {next.cook}
        </Text> : null}
        {next.note ? <Text style={[styles.note, {color: theme.colors.textSecondary}]}>
          {next.note}
        </Text> : null}
      </View> : <View style={styles.hero}>
        <Text style={[styles.empty, {color: theme.colors.textSecondary}]}>{message}</Text>
      </View>}

      {upcoming.length > 1 && <View style={twoColumns && styles.menuColumn}>
        <Text style={[styles.sectionTitle, {color: theme.colors.textPrimary}]}>Following dinners</Text>
        {upcoming.slice(1).map((item) => <View key={`${item.date}-${item.title}`} style={[
          styles.row, compact && {padding: 10, gap: 10}, item.date === today && {borderColor: theme.colors.focusRing},
        ]}>
          <Text style={[styles.day, {color: item.date === today ? theme.colors.focusRing :
            theme.colors.textSecondary}]}>{friendlyDate(item.date)}</Text>
          <View style={styles.rowContent}>
            <Text style={[styles.meal, {color: theme.colors.textPrimary}]}>{item.title}</Text>
            {item.note ? <Text numberOfLines={2} style={[styles.rowNote,
              {color: theme.colors.textSecondary}]}>{item.note}</Text> : null}
          </View>
          {item.servings ? <Text style={[styles.servings, {color: theme.colors.textSecondary}]}>
            Serves {item.servings}
          </Text> : null}
        </View>)}
      </View>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  content: {paddingBottom: 24},
  columns: {flexDirection: 'row', gap: 16, alignItems: 'flex-start'},
  dinnerColumn: {width: '37%', minWidth: 0, marginBottom: 0},
  menuColumn: {flex: 1, minWidth: 0},
  hero: {padding: 24, borderRadius: 20, borderWidth: 1, borderColor: '#ffffff20',
    backgroundColor: '#ffffff0b', marginBottom: 24},
  heroLabel: {flexDirection: 'row', alignItems: 'center', gap: 9},
  eyebrow: {color: '#F59E0B', fontSize: 13, fontWeight: '700', letterSpacing: 1},
  heroTitle: {fontSize: 30, fontWeight: '700', marginTop: 12},
  meta: {fontSize: 15, marginTop: 8},
  note: {fontSize: 15, marginTop: 16, lineHeight: 22},
  empty: {fontSize: 17, lineHeight: 24},
  sectionTitle: {fontSize: 21, fontWeight: '700', marginBottom: 12},
  row: {flexDirection: 'row', alignItems: 'center', gap: 18, padding: 15,
    borderWidth: 1, borderColor: '#ffffff18', borderRadius: 13, marginBottom: 8,
    backgroundColor: '#ffffff08'},
  day: {width: 118, fontSize: 15, fontWeight: '700'},
  rowContent: {flex: 1},
  meal: {fontSize: 16, fontWeight: '600'},
  rowNote: {fontSize: 13, marginTop: 4},
  servings: {fontSize: 13},
});
