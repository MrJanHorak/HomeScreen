import { useRef, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFavoriteApps } from '../hooks/useFavoriteApps';
import { useTheme } from '../theme/ThemeContext';
import useCompactTVLayout from '../hooks/useCompactTVLayout';

export default function FavoriteAppsCarousel() {
  const { favoriteApps, visible, status, launchApp } = useFavoriteApps();
  const theme = useTheme();
  const compact = useCompactTVLayout();
  const scrollRef = useRef<ScrollView>(null);
  const [focused, setFocused] = useState<string | null>(null);
  const [failedApp, setFailedApp] = useState<string | null>(null);
  const viewportWidth = useRef(0);
  const contentWidth = useRef(0);
  const scrollOffset = useRef(0);

  if (!visible) return null;

  const tileWidth = compact ? 108 : 138;
  const edgeInset = (compact ? 30 : theme.spacing.safeHorizontal) + 4;
  const emptyMessage = status === 'unavailable'
    ? 'Rebuild the Android app to browse installed apps.'
    : status === 'error'
      ? 'Could not load installed apps.'
      : status === 'loading'
        ? 'Loading TV apps…'
        : 'Choose favorites in Settings → Apps.';

  return (
    <View style={[styles.container, compact && styles.compactContainer]}>
      <View style={styles.headingRow}>
        <MaterialCommunityIcons name="apps" size={compact ? 16 : 19} color={theme.colors.focusRing} />
        <Text style={[styles.heading, compact && styles.compactHeading, { color: theme.colors.textPrimary }]}>
          FAVORITE APPS
        </Text>
        {failedApp && (
          <Text style={[styles.message, { color: theme.colors.textSecondary }]}>
            Could not open {failedApp}
          </Text>
        )}
      </View>
      {favoriteApps.length === 0 ? (
        <Text style={[styles.empty, { color: theme.colors.textSecondary }]}>{emptyMessage}</Text>
      ) : (
        <ScrollView ref={scrollRef} horizontal showsHorizontalScrollIndicator={false}
          style={{marginHorizontal: -edgeInset}}
          onLayout={({nativeEvent: {layout}}) => { viewportWidth.current = layout.width; }}
          onContentSizeChange={(width) => { contentWidth.current = width; }}
          onScroll={({nativeEvent}) => { scrollOffset.current = nativeEvent.contentOffset.x; }} scrollEventThrottle={16}
          contentContainerStyle={[styles.tiles, {paddingHorizontal: edgeInset}]}>
          {favoriteApps.map((app, index) => (
            <Pressable
              key={app.packageName}
              accessibilityRole="button"
              accessibilityLabel={`Open ${app.label}`}
              onFocus={() => {
                setFocused(app.packageName);
                const left = edgeInset + index * (tileWidth + 10) - 6;
                const right = left + tileWidth + 12;
                let target = scrollOffset.current;
                if (left < target) target = left;
                else if (right > target + viewportWidth.current) target = right - viewportWidth.current;
                target = Math.max(0, Math.min(target, contentWidth.current - viewportWidth.current));
                scrollRef.current?.scrollTo({ x: target, animated: true });
              }}
              onBlur={() => setFocused(null)}
              onPress={async () => {
                setFailedApp(null);
                if (!(await launchApp(app.packageName))) setFailedApp(app.label);
              }}
              style={[
                styles.tile,
                compact && styles.compactTile,
                { width: tileWidth, borderColor: focused === app.packageName
                  ? theme.colors.focusRing : theme.colors.glassBorder },
                focused === app.packageName && styles.focusedTile,
              ]}
            >
              {app.imageUri ? (
                <Image source={{ uri: app.imageUri }} resizeMode="contain" style={styles.image} />
              ) : (
                <Text numberOfLines={2} style={[styles.fallback, { color: theme.colors.textPrimary }]}>
                  {app.label}
                </Text>
              )}
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 4, paddingBottom: 4, gap: 8 },
  compactContainer: { gap: 5, paddingBottom: 0 },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  heading: { fontSize: 15, fontWeight: '700', letterSpacing: 0.8 },
  compactHeading: { fontSize: 12 },
  message: { fontSize: 12, marginLeft: 12 },
  empty: { fontSize: 13, paddingVertical: 14 },
  tiles: { gap: 10, paddingHorizontal: 2, paddingVertical: 3 },
  tile: {
    height: 78,
    borderRadius: 12,
    borderWidth: 2,
    backgroundColor: 'rgba(10, 18, 32, 0.76)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  compactTile: { height: 58, borderRadius: 9 },
  focusedTile: { backgroundColor: 'rgba(56, 189, 248, 0.2)', transform: [{ scale: 1.04 }] },
  image: { width: '94%', height: '90%' },
  fallback: { fontSize: 15, fontWeight: '700', textAlign: 'center', paddingHorizontal: 6 },
});
