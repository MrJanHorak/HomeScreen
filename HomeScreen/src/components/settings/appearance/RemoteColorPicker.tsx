import Pressable from '../../shared/NarratedPressable';
import Text from '../../shared/ReadingText';
import React, { useState } from 'react';
import {StyleSheet, View} from 'react-native';
import { useTheme } from '../../../theme/ThemeContext';
import {
  displayAccentColor,
  displayBackgroundColor,
} from '../../../theme/tvTheme';

type ColorKind = 'accent' | 'background';

interface ColorChoice {
  name: string;
  value: string;
}

const HUES = [
  { name: 'Red', angle: 0 },
  { name: 'Orange', angle: 28 },
  { name: 'Gold', angle: 48 },
  { name: 'Green', angle: 125 },
  { name: 'Teal', angle: 170 },
  { name: 'Blue', angle: 215 },
  { name: 'Purple', angle: 275 },
  { name: 'Pink', angle: 325 },
];

function hslToHex(hue: number, saturation: number, lightness: number): string {
  const s = saturation / 100;
  const l = lightness / 100;
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
  const offset = l - chroma / 2;
  const channels =
    hue < 60
      ? [chroma, x, 0]
      : hue < 120
        ? [x, chroma, 0]
        : hue < 180
          ? [0, chroma, x]
          : hue < 240
            ? [0, x, chroma]
            : hue < 300
              ? [x, 0, chroma]
              : [chroma, 0, x];
  return `#${channels
    .map((channel) =>
      Math.round((channel + offset) * 255)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`.toUpperCase();
}

const ACCENT_ROWS = [
  { name: 'Rich', saturation: 86, lightness: 44 },
  { name: 'Bright', saturation: 82, lightness: 58 },
  { name: 'Soft', saturation: 72, lightness: 72 },
];
const BACKGROUND_ROWS = [
  { name: 'Midnight', saturation: 70, lightness: 12 },
  { name: 'Deep', saturation: 65, lightness: 20 },
  { name: 'Muted', saturation: 58, lightness: 28 },
];

function colorRows(kind: ColorKind): ColorChoice[][] {
  const tones = kind === 'accent' ? ACCENT_ROWS : BACKGROUND_ROWS;
  const colored = tones.map((tone) =>
    HUES.map((hue) => ({
      name: `${tone.name} ${hue.name}`,
      value: hslToHex(hue.angle, tone.saturation, tone.lightness),
    })),
  );
  const neutrals =
    kind === 'accent'
      ? [
          { name: 'Warm White', value: '#FFF3D6' },
          { name: 'Silver', value: '#CBD5E1' },
          { name: 'Warm Gray', value: '#B8A99A' },
          { name: 'White', value: '#FFFFFF' },
        ]
      : [
          { name: 'Black', value: '#050505' },
          { name: 'Charcoal', value: '#1F2937' },
          { name: 'Slate', value: '#334155' },
          { name: 'Warm Charcoal', value: '#3B302C' },
        ];
  return [...colored, neutrals];
}

const ACCENT_COLORS = colorRows('accent');
const BACKGROUND_COLORS = colorRows('background');

interface Props {
  kind: ColorKind;
  selectedColor: string;
  selected: boolean;
  disabled?: boolean;
  onSelect: (color: string) => void;
}

export default function RemoteColorPicker({
  kind,
  selectedColor,
  selected,
  disabled,
  onSelect,
}: Props) {
  const theme = useTheme();
  const [focusedName, setFocusedName] = useState<string | null>(null);
  const rows = kind === 'accent' ? ACCENT_COLORS : BACKGROUND_COLORS;
  const title = kind === 'accent' ? 'Accent color' : 'Solid background color';
  const selectedChoice = rows
    .flat()
    .find((choice) => choice.value === selectedColor);

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
        {title}
      </Text>
      <Text style={[styles.help, { color: theme.colors.textSecondary }]}>
        Use the remote arrows to browse colors. Press Select to apply one.
      </Text>
      <View style={styles.grid}>
        {rows.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {row.map((choice) => (
              <ColorTile
                key={choice.name}
                choice={choice}
                kind={kind}
                selected={selected && selectedColor === choice.value}
                disabled={disabled}
                onFocus={() => setFocusedName(choice.name)}
                onBlur={() => setFocusedName(null)}
                onPress={() => onSelect(choice.value)}
              />
            ))}
          </View>
        ))}
      </View>
      <Text style={[styles.caption, { color: theme.colors.textSecondary }]}>
        {focusedName
          ? `${focusedName} · Press Select to use`
          : `Current: ${selectedChoice?.name || 'Custom color'}`}
      </Text>
    </View>
  );
}

function ColorTile({
  choice,
  kind,
  selected,
  disabled,
  onFocus,
  onBlur,
  onPress,
}: {
  choice: ColorChoice;
  kind: ColorKind;
  selected: boolean;
  disabled?: boolean;
  onFocus: () => void;
  onBlur: () => void;
  onPress: () => void;
}) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const fill =
    kind === 'background'
      ? displayBackgroundColor(choice.value)
      : displayAccentColor(choice.value);
  return (
    <Pressable
      accessibilityRole='button'
      accessibilityLabel={`${choice.name} ${kind} color`}
      accessibilityState={{ selected, disabled: Boolean(disabled) }}
      disabled={disabled}
      onFocus={() => {
        setFocused(true);
        onFocus();
      }}
      onBlur={() => {
        setFocused(false);
        onBlur();
      }}
      onPress={onPress}
      style={[
        styles.tile,
        {
          backgroundColor: fill,
          borderColor: focused
            ? '#FFFFFF'
            : selected
              ? theme.colors.focusRing
              : theme.colors.glassBorderTop,
          borderWidth: focused ? 4 : selected ? 3 : 1,
          opacity: disabled ? 0.45 : 1,
        },
        focused && styles.focused,
      ]}
    >
      {selected && <Text style={styles.check}>✓</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 15, gap: 8 },
  title: { fontSize: 15, fontWeight: '700' },
  help: { fontSize: 12 },
  grid: { gap: 7, alignItems: 'flex-start' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  tile: {
    width: 70,
    height: 55,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  focused: { transform: [{ scale: 1.08 }] },
  check: {
    color: '#FFFFFF',
    fontSize: 23,
    fontWeight: '900',
    textShadowColor: '#000000',
    textShadowRadius: 4,
  },
  caption: { fontSize: 12, minHeight: 18 },
});
