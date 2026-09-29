import React from 'react';
import { View, StyleSheet, Text, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';

const WEEK_MEALS = [
  { day: 'Monday', meal: 'Spaghetti Bolognese', cook: 'Mom', type: 'Italian' },
  { day: 'Tuesday', meal: 'Chicken Gnocchi Soup & Salad', cook: 'Dad', type: 'Comfort', active: true },
  { day: 'Wednesday', meal: 'Grilled Salmon & Asparagus', cook: 'Jan', type: 'Seafood' },
  { day: 'Thursday', meal: 'Taco Night Fiesta', cook: 'Dad', type: 'Mexican' },
  { day: 'Friday', meal: 'Homemade Pizza & Movie Night', cook: 'Family', type: 'Pizza' },
  { day: 'Saturday', meal: 'Steak & Roasted Potatoes', cook: 'Dad', type: 'BBQ' },
  { day: 'Sunday', meal: 'Slow-Cooker Pot Roast', cook: 'Mom', type: 'Roast' },
];

export default function MealDetailView() {
  const theme = useTheme();

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Tonight's Dinner Deep Dive */}
      <View style={styles.heroRow}>
        <View style={styles.tonightCard}>
          <View style={styles.tonightHeader}>
            <View style={styles.titleBadge}>
              <MaterialCommunityIcons name="silverware-fork-knife" size={20} color="#F59E0B" />
              <Text style={styles.titleBadgeText}>TONIGHT'S MENU</Text>
            </View>
            <View style={styles.cookChip}>
              <Text style={styles.cookChipText}>👨‍🍳 Chef: Dad</Text>
            </View>
          </View>

          <Text style={[styles.mainCourseTitle, { color: theme.colors.textPrimary }]}>
            Creamy Chicken Gnocchi Soup
          </Text>
          <Text style={[styles.mainCourseDesc, { color: theme.colors.textSecondary }]}>
            Rich savory broth with tender shredded chicken, pillow-soft potato gnocchi, fresh spinach, and garlic cream.
          </Text>

          {/* Courses List */}
          <View style={styles.coursesGrid}>
            <View style={styles.courseItem}>
              <Text style={styles.courseType}>STARTER / SIDE</Text>
              <Text style={[styles.courseName, { color: theme.colors.textPrimary }]}>Fresh Garden Salad</Text>
              <Text style={[styles.courseNote, { color: theme.colors.textSecondary }]}>Balsamic vinaigrette & croutons</Text>
            </View>

            <View style={styles.courseItem}>
              <Text style={styles.courseType}>DESSERT</Text>
              <Text style={[styles.courseName, { color: theme.colors.textPrimary }]}>Warm Chocolate Pudding</Text>
              <Text style={[styles.courseNote, { color: theme.colors.textSecondary }]}>With whipped cream topping</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Full Weekly Meal Plan */}
      <View style={styles.weeklySection}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
          Weekly Family Meal Plan
        </Text>
        <View style={styles.mealTable}>
          {WEEK_MEALS.map((item, idx) => (
            <View
              key={idx}
              style={[
                styles.mealRow,
                item.active && [
                  styles.activeMealRow,
                  { borderColor: theme.colors.focusRing },
                ],
              ]}
            >
              <View style={styles.dayCol}>
                <Text style={[styles.dayText, { color: item.active ? theme.colors.focusRing : theme.colors.textPrimary }]}>
                  {item.day}
                </Text>
                {item.active && (
                  <View style={styles.todayIndicator}>
                    <Text style={styles.todayIndicatorText}>TODAY</Text>
                  </View>
                )}
              </View>

              <View style={styles.mealCol}>
                <Text style={[styles.mealText, { color: theme.colors.textPrimary }]}>
                  {item.meal}
                </Text>
              </View>

              <View style={styles.cookCol}>
                <Text style={[styles.cookText, { color: theme.colors.textSecondary }]}>
                  Chef: {item.cook}
                </Text>
              </View>

              <View style={styles.cuisineCol}>
                <View style={styles.cuisineBadge}>
                  <Text style={styles.cuisineText}>{item.type}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heroRow: {
    marginBottom: 24,
  },
  tonightCard: {
    padding: 24,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  tonightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  titleBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F59E0B',
    letterSpacing: 1,
  },
  cookChip: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  cookChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#38BDF8',
  },
  mainCourseTitle: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 6,
  },
  mainCourseDesc: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 18,
    maxWidth: 800,
  },
  coursesGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  courseItem: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  courseType: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  courseName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  courseNote: {
    fontSize: 13,
  },
  weeklySection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 14,
  },
  mealTable: {
    gap: 8,
  },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  activeMealRow: {
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderWidth: 1.5,
  },
  dayCol: {
    width: 140,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dayText: {
    fontSize: 15,
    fontWeight: '700',
  },
  todayIndicator: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#38BDF8',
  },
  todayIndicatorText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0F172A',
  },
  mealCol: {
    flex: 1,
  },
  mealText: {
    fontSize: 15,
    fontWeight: '600',
  },
  cookCol: {
    width: 130,
  },
  cookText: {
    fontSize: 14,
  },
  cuisineCol: {
    width: 110,
    alignItems: 'flex-end',
  },
  cuisineBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  cuisineText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#E2E8F0',
  },
});
