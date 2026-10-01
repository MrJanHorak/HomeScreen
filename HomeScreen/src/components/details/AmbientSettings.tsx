import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppearance, useTheme } from '../../theme/ThemeContext';
import { AMBIENT_INFO_IDS, PLASMA_PRESETS } from '../../theme/appearance';
import type { AmbientPreference } from '../../theme/appearance';
import GooglePhotosBackgroundPicker from './GooglePhotosBackgroundPicker';

const INFO_LABELS: Record<keyof AmbientPreference['info'], string> = {
  weather: 'Weather', calendar: 'Calendar', activity: 'Activity',
  tasks: 'Tasks', meals: 'Meals',
};
const COLOR_CHOICES = [
  { label: 'Teal', value: '#16A085' }, { label: 'Blue', value: '#0477BF' },
  { label: 'Cyan', value: '#22D3EE' }, { label: 'Purple', value: '#A78BFA' },
  { label: 'Pink', value: '#D946A1' }, { label: 'Coral', value: '#E8795B' },
  { label: 'Amber', value: '#F59E0B' }, { label: 'Green', value: '#34D399' },
] as const;

function Choice({ label, selected, disabled, onPress, swatch }: {
  label: string; selected?: boolean; disabled?: boolean; onPress: () => void; swatch?: string;
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
      {swatch && <View style={[styles.swatch, { backgroundColor: swatch }]} />}
      <Text style={[styles.choiceLabel, { color: theme.colors.textPrimary }]}>{label}</Text>
    </Pressable>
  );
}

export default function AmbientSettings({ onPreview }: { onPreview: () => void }) {
  const theme = useTheme();
  const { appearance, ready, ambientPhotos, setAmbientPreference } = useAppearance();
  const [showColors, setShowColors] = useState(false);
  const ambient = appearance.ambient;
  const set = (changes: Partial<AmbientPreference>) => setAmbientPreference(changes);

  return (
    <View style={[styles.panel, { borderColor: theme.colors.glassBorder, backgroundColor: theme.colors.glassSurface }]}>
      <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Ambient mode</Text>
      <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
        After the remote is idle, show a calm backdrop and the essentials. The information moves between screen areas every 90 seconds. Press a navigation button to return.
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
        <Choice label="Built-in photos" selected={ambient.photoSource === 'gallery'}
          disabled={!ready || !ambient.enabled} onPress={() => set({ photoSource: 'gallery' })} />
        <Choice label={`My photos (${ambientPhotos.length})`} selected={ambient.photoSource === 'selected'}
          disabled={!ready || !ambient.enabled || !ambientPhotos.length}
          onPress={() => set({ photoSource: 'selected' })} />
        <Choice label="Plasma flow" selected={ambient.photoSource === 'plasma'}
          disabled={!ready || !ambient.enabled} onPress={() => set({ photoSource: 'plasma' })} />
        <Choice label="Dark" selected={ambient.photoSource === 'none'}
          disabled={!ready || !ambient.enabled} onPress={() => set({ photoSource: 'none' })} />
      </View>
      {(ambient.photoSource === 'gallery' || ambient.photoSource === 'selected') && <>
        <Text style={[styles.heading, { color: theme.colors.textPrimary }]}>Change photos every</Text>
        <View style={styles.row}>
          {([1, 3, 5] as const).map((minutes) => (
            <Choice key={minutes} label={`${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`}
              selected={ambient.photoMinutes === minutes} disabled={!ready || !ambient.enabled}
              onPress={() => set({ photoMinutes: minutes })} />
          ))}
        </View>
      </>}
      {ambient.photoSource === 'plasma' && <>
        <Text style={[styles.heading, { color: theme.colors.textPrimary }]}>Flow colors</Text>
        <View style={styles.row}>
          {Object.entries(PLASMA_PRESETS).map(([label, colors]) => (
            <Choice key={label} label={label} swatch={colors[0]}
              selected={colors.every((color, index) => color === ambient.plasmaColors[index])}
              disabled={!ready || !ambient.enabled} onPress={() => set({ plasmaColors: colors })} />
          ))}
          <Choice label={showColors ? 'Hide color choices' : 'Choose individual colors'}
            onPress={() => setShowColors((current) => !current)} />
        </View>
        {showColors && [0, 1, 2].map((position) => (
          <View key={position}>
            <Text style={[styles.subheading, { color: theme.colors.textSecondary }]}>
              Color {position + 1}
            </Text>
            <View style={styles.row}>
              {COLOR_CHOICES.map((choice) => (
                <Choice key={choice.value} label={choice.label} swatch={choice.value}
                  selected={ambient.plasmaColors[position] === choice.value}
                  disabled={!ready || !ambient.enabled}
                  onPress={() => {
                    const colors = [...ambient.plasmaColors] as AmbientPreference['plasmaColors'];
                    colors[position] = choice.value;
                    set({ plasmaColors: colors });
                  }} />
              ))}
            </View>
          </View>
        ))}
      </>}
      <Text style={[styles.heading, { color: theme.colors.textPrimary }]}>Information to rotate</Text>
      <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
        The clock and date stay visible. Choose the other details you want to see.
      </Text>
      <View style={styles.row}>
        {AMBIENT_INFO_IDS.map((id) => (
          <Choice key={id} label={INFO_LABELS[id]} selected={ambient.info[id]}
            disabled={!ready || !ambient.enabled}
            onPress={() => set({ info: { ...ambient.info, [id]: !ambient.info[id] } })} />
        ))}
      </View>
      <Text style={[styles.subheading, { color: theme.colors.textSecondary }]}>Change detail every</Text>
      <View style={styles.row}>
        {([30, 60, 120] as const).map((seconds) => (
          <Choice key={seconds} label={`${seconds} seconds`}
            selected={ambient.infoCycleSeconds === seconds} disabled={!ready || !ambient.enabled}
            onPress={() => set({ infoCycleSeconds: seconds })} />
        ))}
      </View>
      <GooglePhotosBackgroundPicker purpose="ambient" />
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
  subheading: { fontSize: 15, fontWeight: '600', marginTop: 9, marginBottom: 7 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  choice: { minHeight: 52, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, justifyContent: 'center', flexDirection: 'row', alignItems: 'center', gap: 9 },
  focused: { transform: [{ scale: 1.04 }] },
  swatch: { width: 18, height: 18, borderRadius: 9 },
  choiceLabel: { fontSize: 16, fontWeight: '600' },
  preview: { marginTop: 12, alignSelf: 'flex-start' },
});
