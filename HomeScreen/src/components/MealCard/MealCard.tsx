import { View, StyleSheet, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';

export default function MealCard() {
  const theme = useTheme();

  const menuItems = [
    { name: 'Chicken Gnocchi Soup', icon: 'food-hot-dog', type: 'Main' },
    { name: 'Chocolate Pudding', icon: 'cupcake', type: 'Dessert' },
    { name: 'Fresh Garden Salad', icon: 'leaf', type: 'Side' },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.titleWithIcon}>
          <MaterialCommunityIcons
            name="silverware-fork-knife"
            size={22}
            color={theme.colors.accent}
          />
          <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
            DINNER
          </Text>
        </View>
        <View style={styles.cookBadge}>
          <Text style={[styles.cookBadgeText, { color: theme.colors.focusRing }]}>
            👨‍🍳 Dad
          </Text>
        </View>
      </View>

      {/* Menu items */}
      <View style={styles.menuList}>
        {menuItems.map((item, idx) => (
          <View key={idx} style={styles.menuItem}>
            <View style={styles.bulletDot} />
            <Text
              numberOfLines={1}
              style={[styles.itemName, { color: theme.colors.textPrimary }]}
            >
              {item.name}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    justifyContent: 'center',
    height: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
  },
  cookBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
  },
  cookBadgeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  menuList: {
    gap: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F59E0B',
    marginRight: 10,
  },
  itemName: {
    fontSize: 17,
    fontWeight: '500',
    flex: 1,
  },
});

