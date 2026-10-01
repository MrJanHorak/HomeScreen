import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppearance, useTheme } from '../../theme/ThemeContext';
import type { AmbientPreference } from '../../theme/appearance';

function Choice({ label, selected, disabled, onPress }: {
  label: string; selected?: boolean; disabled?: boolean; onPress: () => void;
}) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label}
      accessibilityState={{ selected: !!selected, disabled: !!disabled }}
      disabled={disabled} onPress={onPress} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      style={[styles.choice, {
        borderColor: focused || selected ? theme.colors.focusRing : theme.colors.glassBorder,
        backgroundColor: selected ? theme.colors.glassSurfaceFocused : theme.colors.glassSurface,
        opacity: disabled ? 0.45 : 1,
      }, focused && styles.focused]}>
      <Text style={[styles.choiceLabel, { color: theme.colors.textPrimary }]}>{label}</Text>
    </Pressable>
  );
}

export default function AmbientSettings({ onPreview }: { onPreview: () => void }) {
  const theme = useTheme();
  const { appearance, ready, photoDataUrl, setAmbientPreference } = useAppearance();
  const ambient = appearance.ambient;
  const set = (changes: Partial<AmbientPreference>) => setAmbientPreference(changes);

  return (
    <View style={[styles.panel, { borderColor: theme.colors.glassBorder, backgroundColor: theme.colors.glassSurface }]}>
      <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Ambient mode</Text>
      <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
        After the remote is idle, show a dim photo and the essentials. The information moves between screen areas every 90 seconds. Press a navigation button to return.
      </Text>
      <View style={styles.row}>
        <Choice label="On" selected={ambient.enabled} disabled={!ready} onPress={() => set({ enabled: true })} />
        <Choice label="Off" selected={!ambient.enabled} disabled={!ready} onPress={() => set({ enabled: false })} />
      </View>
      <Text style={[styles.heading, { color: theme.colors.textPrimary }]}>Start after</Text>
      <View style={styles.row}>
        {([5, 10, 20] as const).map((minutes) => (
          <Choice key={minutes} label={`${minutes} minutes`}
            selected={ambient.idleMinutes === minutes} disabled={!ready || !ambient.enabled}
            onPress={() => set({ idleMinutes: minutes })} />
        ))}
      </View>
      <Text style={[styles.heading, { color: theme.colors.textPrimary }]}>Backdrop</Text>
      <View style={styles.row}>
        <Choice label="Rotating gallery" selected={ambient.photoSource === 'gallery'}
          disabled={!ready || !ambient.enabled} onPress={() => set({ photoSource: 'gallery' })} />
        <Choice label="Selected Google photo" selected={ambient.photoSource === 'selected'}
          disabled={!ready || !ambient.enabled || !photoDataUrl}
          onPress={() => set({ photoSource: 'selected' })} />
        <Choice label="Dark" selected={ambient.photoSource === 'none'}
          disabled={!ready || !ambient.enabled} onPress={() => set({ photoSource: 'none' })} />
      </View>
      {!photoDataUrl && <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
        To use your own photo, choose one in Background settings first.
      </Text>}
      <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
        For OLED TVs, keep the TV’s panel protection enabled and turn the TV off when the room is empty for long periods.
      </Text>
      <View style={styles.preview}>
        <Choice label="Preview ambient mode" disabled={!ready} onPress={onPreview} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { padding: 20, borderWidth: 1, borderRadius: 18, gap: 12 },
  title: { fontSize: 23, fontWeight: '700' },
  description: { fontSize: 15, lineHeight: 22 },
  heading: { fontSize: 17, fontWeight: '700', marginTop: 12 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  choice: { minHeight: 52, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, justifyContent: 'center' },
  focused: { transform: [{ scale: 1.04 }] },
  choiceLabel: { fontSize: 16, fontWeight: '600' },
  preview: { marginTop: 12, alignSelf: 'flex-start' },
});
