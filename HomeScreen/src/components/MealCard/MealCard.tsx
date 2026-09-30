import {View, StyleSheet, Text} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {useTheme} from '../../theme/ThemeContext';
import {useDashboard} from '../../context/DashboardContext';
import useCompactTVLayout from '../../hooks/useCompactTVLayout';

function localDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${
    String(now.getDate()).padStart(2, '0')}`;
}

export default function MealCard() {
  const theme = useTheme();
  const compact = useCompactTVLayout();
  const {meals} = useDashboard();
  const today = localDate();
  const upcoming = meals.items.filter((item) => item.date >= today);
  const meal = upcoming[0];
  const isToday = meal?.date === today;
  const following = upcoming.slice(1, 3);
  const message = meals.status === 'not_connected'
    ? 'Connect a meal Sheet from the pairing page on your phone.'
    : meals.status === 'unavailable'
      ? meals.message || 'Meal plan is unavailable.'
      : 'No upcoming dinners in your Sheet.';

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.titleWithIcon}>
          <MaterialCommunityIcons name="silverware-fork-knife"
            size={compact ? 17 : 22} color={theme.colors.accent} />
          <Text numberOfLines={1} style={[styles.headerTitle,
            compact && styles.compactTitle, {color: theme.colors.textPrimary}]}>
            {isToday ? "TONIGHT'S DINNER" : 'NEXT DINNER'}
          </Text>
        </View>
        {meal?.servings ? <Text style={[styles.servings, {color: theme.colors.focusRing}]}>
          Serves {meal.servings}
        </Text> : null}
      </View>

      {meal ? <>
        {!isToday && <Text style={styles.dateLabel}>{meal.date}</Text>}
        <Text numberOfLines={compact ? 2 : 3} style={[styles.mealTitle,
          compact && styles.compactMealTitle, {color: theme.colors.textPrimary}]}>
          {meal.title}
        </Text>
        {meal.side ? <Text numberOfLines={1} style={styles.detail}>With {meal.side}</Text> : null}
        {meal.cook ? <Text numberOfLines={1} style={styles.detail}>Cook: {meal.cook}</Text> : null}
        {meal.note ? <Text numberOfLines={1} style={styles.detail}>{meal.note}</Text> : null}
        {following.length > 0 && <View style={styles.nextMeals}>
          {following.map((item) => <Text key={`${item.date}-${item.title}`}
            numberOfLines={1} style={styles.nextMeal}>
            {item.date.slice(5)}  {item.title}
          </Text>)}
        </View>}
      </> : <Text style={styles.emptyText}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {paddingHorizontal: 4, justifyContent: 'flex-start', height: '100%'},
  headerRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    gap: 8, marginBottom: 10},
  titleWithIcon: {flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1},
  headerTitle: {fontSize: 18, fontWeight: '700', letterSpacing: 1, flexShrink: 1},
  compactTitle: {fontSize: 14, letterSpacing: 0.3},
  servings: {fontSize: 12, fontWeight: '700'},
  dateLabel: {color: '#A7B6C0', fontSize: 12, marginBottom: 3},
  mealTitle: {fontSize: 21, fontWeight: '700', lineHeight: 27},
  compactMealTitle: {fontSize: 16, lineHeight: 20},
  detail: {color: '#B9C7CF', fontSize: 13, marginTop: 4},
  nextMeals: {borderTopWidth: 1, borderTopColor: '#ffffff20', marginTop: 11, paddingTop: 6},
  nextMeal: {color: '#A7B6C0', fontSize: 12, marginTop: 3},
  emptyText: {color: '#A7B6C0', fontSize: 14, lineHeight: 20},
});
