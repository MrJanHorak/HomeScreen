import { View, StyleSheet, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import useCompactTVLayout from '../../hooks/useCompactTVLayout';

export default function MealCard() {
  const theme = useTheme();
  const compact = useCompactTVLayout();

  const menuItems = [
    { name: 'Chicken Gnocchi Soup', icon: 'food-hot-dog', type: 'Main' },
    { name: 'Chocolate Pudding', icon: 'cupcake', type: 'Dessert' },
    { name: 'Fresh Garden Salad', icon: 'leaf', type: 'Side' },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.headerRow, compact && styles.compactHeaderRow]}>
        <View style={styles.titleWithIcon}>
          <MaterialCommunityIcons
            name="silverware-fork-knife"
            size={compact ? 17 : 22}
            color={theme.colors.accent}
          />
          <Text numberOfLines={1} style={[styles.headerTitle, compact && styles.compactTitle, { color: theme.colors.textPrimary }]}>
            DINNER PREVIEW
          </Text>
        </View>
        <View style={[styles.cookBadge, compact && styles.compactCookBadge]}>
          <Text style={[styles.cookBadgeText, compact && styles.compactCookText, { color: theme.colors.focusRing }]}>
            👨‍🍳 Dad
          </Text>
        </View>
      </View>

      {/* Menu items */}
      <View style={[styles.menuList, compact && styles.compactMenuList]}>
        {menuItems.map((item, idx) => (
          <View key={idx} style={[styles.menuItem, compact && styles.compactMenuItem]}>
            <View style={styles.bulletDot} />
            <Text
              numberOfLines={1}
              style={[styles.itemName, compact && styles.compactItemName, { color: theme.colors.textPrimary }]}
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
  compactHeaderRow: { marginBottom: 6 },
  compactTitle: { fontSize: 14, letterSpacing: 0.3, flexShrink: 1 },
  compactCookBadge: { paddingHorizontal: 5, paddingVertical: 1 },
  compactCookText: { fontSize: 10 },
  compactMenuList: { gap: 5 },
  compactMenuItem: { paddingVertical: 4, paddingHorizontal: 7 },
  compactItemName: { fontSize: 13 },
});

