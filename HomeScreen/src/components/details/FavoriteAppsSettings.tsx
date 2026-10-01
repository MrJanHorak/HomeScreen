import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFavoriteApps } from '../../hooks/useFavoriteApps';
import { useTheme } from '../../theme/ThemeContext';

export default function FavoriteAppsSettings() {
  const { availableApps, favoriteApps, visible, status, setVisible,
    toggleFavorite, moveFavorite, refresh } = useFavoriteApps();
  const theme = useTheme();
  const [focused, setFocused] = useState<string | null>(null);
  const favorites = new Set(favoriteApps.map((app) => app.packageName));

  const focusProps = (id: string) => ({
    onFocus: () => setFocused(id),
    onBlur: () => setFocused((current: string | null) => current === id ? null : current),
  });
  const focusedStyle = (id: string) => focused === id
    ? { borderColor: theme.colors.focusRing, backgroundColor: theme.colors.glassSurfaceFocused }
    : null;

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Favorite Apps</Text>
      <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
        Choose installed TV apps to launch from a row below the dashboard cards. These favorites are saved on this TV.
      </Text>

      <View style={styles.toolbar}>
        <Pressable accessibilityRole="switch" accessibilityState={{ checked: visible }}
          accessibilityLabel="Show Favorite Apps on dashboard"
          onPress={() => setVisible(!visible)} {...focusProps('visibility')}
          style={[styles.control, { borderColor: theme.colors.glassBorder }, focusedStyle('visibility')]}>
          <MaterialCommunityIcons name={visible ? 'checkbox-marked' : 'checkbox-blank-outline'}
            size={22} color={theme.colors.focusRing} />
          <Text style={[styles.controlText, { color: theme.colors.textPrimary }]}>
            Show row on dashboard
          </Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Refresh installed apps"
          onPress={() => void refresh()} {...focusProps('refresh')}
          style={[styles.control, { borderColor: theme.colors.glassBorder }, focusedStyle('refresh')]}>
          <MaterialCommunityIcons name="refresh" size={21} color={theme.colors.focusRing} />
          <Text style={[styles.controlText, { color: theme.colors.textPrimary }]}>Refresh apps</Text>
        </Pressable>
      </View>

      <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
        Selected ({favoriteApps.length})
      </Text>
      {favoriteApps.length === 0 ? (
        <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
          Select apps below to add them to the carousel.
        </Text>
      ) : favoriteApps.map((app, index) => (
        <View key={app.packageName} style={[styles.selectedRow, { borderColor: theme.colors.glassBorder }]}>
          {app.imageUri && <Image source={{ uri: app.imageUri }} resizeMode="contain" style={styles.selectedImage} />}
          <Text numberOfLines={1} style={[styles.selectedName, { color: theme.colors.textPrimary }]}>
            {app.label}
          </Text>
          {([
            { id: 'left', icon: 'arrow-left', label: 'Move left', direction: -1 },
            { id: 'right', icon: 'arrow-right', label: 'Move right', direction: 1 },
          ] as const).map((action) => (
            <Pressable key={action.id} accessibilityRole="button"
              accessibilityLabel={`${action.label} ${app.label}`}
              disabled={action.direction === -1 ? index === 0 : index === favoriteApps.length - 1}
              onPress={() => moveFavorite(app.packageName, action.direction)}
              {...focusProps(`${app.packageName}-${action.id}`)}
              style={[styles.smallButton, { borderColor: theme.colors.glassBorder },
                focusedStyle(`${app.packageName}-${action.id}`),
                (action.direction === -1 ? index === 0 : index === favoriteApps.length - 1) && styles.disabled]}>
              <MaterialCommunityIcons name={action.icon} size={20} color={theme.colors.textPrimary} />
            </Pressable>
          ))}
          <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${app.label} from favorites`}
            onPress={() => toggleFavorite(app.packageName)} {...focusProps(`${app.packageName}-remove`)}
            style={[styles.smallButton, { borderColor: theme.colors.glassBorder },
              focusedStyle(`${app.packageName}-remove`)]}>
            <MaterialCommunityIcons name="close" size={20} color={theme.colors.textPrimary} />
          </Pressable>
        </View>
      ))}

      <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Installed apps</Text>
      {status !== 'ready' && (
        <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
          {status === 'loading' ? 'Loading installed apps…'
            : status === 'unavailable' ? 'Rebuild and reinstall the Android app to enable app shortcuts.'
              : 'Could not read installed apps. Try Refresh apps.'}
        </Text>
      )}
      {status === 'ready' && availableApps.length === 0 && (
        <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
          No launchable apps were found on this TV.
        </Text>
      )}
      <View style={styles.appGrid}>
        {availableApps.map((app) => {
          const selected = favorites.has(app.packageName);
          return (
            <Pressable key={app.packageName} accessibilityRole="button"
              accessibilityLabel={`${selected ? 'Remove' : 'Add'} ${app.label} ${selected ? 'from' : 'to'} favorites`}
              onPress={() => toggleFavorite(app.packageName)} {...focusProps(app.packageName)}
              style={[styles.appTile, { borderColor: selected ? theme.colors.focusRing : theme.colors.glassBorder },
                focusedStyle(app.packageName)]}>
              {app.imageUri ? <Image source={{ uri: app.imageUri }} resizeMode="contain" style={styles.appImage} />
                : <MaterialCommunityIcons name="application" size={30} color={theme.colors.focusRing} />}
              <Text numberOfLines={1} style={[styles.appLabel, { color: theme.colors.textPrimary }]}>
                {app.label}
              </Text>
              {selected && <MaterialCommunityIcons name="check-circle" size={16}
                color={theme.colors.focusRing} style={styles.check} />}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingBottom: 24 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 5 },
  description: { fontSize: 14, lineHeight: 21, marginBottom: 15 },
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 15 },
  control: {
    minHeight: 48, borderWidth: 2, borderRadius: 12, paddingHorizontal: 15,
    flexDirection: 'row', alignItems: 'center', gap: 9,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  controlText: { fontSize: 15, fontWeight: '700' },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginTop: 14, marginBottom: 9 },
  selectedRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 58,
    borderWidth: 1, borderRadius: 11, paddingHorizontal: 10, marginBottom: 7,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  selectedImage: { width: 70, height: 42 },
  selectedName: { flex: 1, fontSize: 15, fontWeight: '700' },
  smallButton: {
    width: 43, height: 43, borderWidth: 2, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  disabled: { opacity: 0.35 },
  appGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  appTile: {
    width: 143, height: 105, borderWidth: 2, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  appImage: { width: 119, height: 62 },
  appLabel: { fontSize: 12, fontWeight: '700', marginTop: 4 },
  check: { position: 'absolute', top: 5, right: 5 },
});
