import React, {useEffect, useState} from 'react';
import {Text, TextInput, View} from 'react-native';
import {useAppearance, useTheme} from '../../../theme/ThemeContext';
import {normalizeHexColor, PALETTES} from '../../../theme/tvTheme';
import GooglePhotosBackgroundPicker from '../shared/GooglePhotosBackgroundPicker';
import RemoteColorPicker from './RemoteColorPicker';
import Option from './AppearanceOption';
import WidgetCardSettings from './WidgetCardSettings';
import SavedLayoutSettings from './SavedLayoutSettings';
import {styles} from './appearanceStyles';
export type AppearanceSection = 'colors' | 'background' | 'layout' | 'cards';

export default function AppearanceSettings({
  section = 'colors',
}: {
  section?: AppearanceSection;
}) {
  const theme = useTheme();
  const {
    appearance,
    ready,
    selectPalette,
    setCustomAccent,
    setBackground,
    setBackgroundColor,
  } = useAppearance();
  const [accentInput, setAccentInput] = useState(appearance.customAccent);
  const [backgroundInput, setBackgroundInput] = useState(
    appearance.backgroundColor,
  );
  const [showAccentHex, setShowAccentHex] = useState(false);
  const [showBackgroundHex, setShowBackgroundHex] = useState(false);
  const [focusedInput, setFocusedInput] = useState<
    'accent' | 'background' | null
  >(null);
  useEffect(
    () => setAccentInput(appearance.customAccent),
    [appearance.customAccent],
  );
  useEffect(
    () => setBackgroundInput(appearance.backgroundColor),
    [appearance.backgroundColor],
  );
  const validAccent = normalizeHexColor(accentInput);
  const validBackground = normalizeHexColor(backgroundInput);
  return (
    <View style={styles.section}>
      <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
        {section === 'colors'
          ? 'Color palette'
          : section === 'background'
            ? 'Background'
            : section === 'layout'
              ? 'Choose a layout'
              : 'Arrange cards'}
      </Text>
      {!ready && (
        <Text style={{ color: theme.colors.textSecondary }}>
          Loading appearance…
        </Text>
      )}

      {section === 'colors' && (
        <>
          <View style={styles.options}>
            {(Object.keys(PALETTES) as Array<keyof typeof PALETTES>).map(
              (id) => (
                <Option
                  key={id}
                  label={PALETTES[id].label}
                  swatch={
                    id === 'night' ? '#38BDF8' : PALETTES[id].colors.focusRing
                  }
                  selected={appearance.palette === id}
                  disabled={!ready}
                  onPress={() => selectPalette(id)}
                />
              ),
            )}
            <Option
              label='Custom'
              swatch={theme.colors.focusRing}
              selected={appearance.palette === 'custom'}
              disabled={!ready}
              onPress={() => selectPalette('custom')}
            />
          </View>
          <RemoteColorPicker
            kind='accent'
            selectedColor={appearance.customAccent}
            selected={appearance.palette === 'custom'}
            disabled={!ready}
            onSelect={setCustomAccent}
          />
          <View style={styles.advancedToggle}>
            <Option
              label={
                showAccentHex ? 'Hide hex color' : 'Advanced: enter hex color'
              }
              onPress={() => setShowAccentHex(!showAccentHex)}
            />
          </View>
          {showAccentHex && (
            <>
              <View style={styles.customColorRow}>
                <Text
                  style={[
                    styles.customColorLabel,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  Accent hex color
                </Text>
                <TextInput
                  value={accentInput}
                  onChangeText={setAccentInput}
                  maxLength={7}
                  onFocus={() => setFocusedInput('accent')}
                  onBlur={() => setFocusedInput(null)}
                  autoCapitalize='characters'
                  placeholder='#38BDF8'
                  placeholderTextColor={theme.colors.textSecondary}
                  accessibilityLabel='Custom accent hex color'
                  style={[
                    styles.colorInput,
                    {
                      color: theme.colors.textPrimary,
                      borderColor:
                        focusedInput === 'accent'
                          ? theme.colors.focusRing
                          : theme.colors.glassBorder,
                    },
                    focusedInput === 'accent' && styles.focusedInput,
                  ]}
                />
                <Option
                  label='Apply accent'
                  disabled={!ready || !validAccent}
                  onPress={() => validAccent && setCustomAccent(validAccent)}
                />
              </View>
              {!validAccent && (
                <Text
                  style={[
                    styles.colorHint,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  Enter six hex digits, such as #38BDF8.
                </Text>
              )}
            </>
          )}
        </>
      )}

      {section === 'background' && (
        <>
          <View style={styles.options}>
            <Option
              label='Night sky photo'
              selected={appearance.background === 'photo'}
              disabled={!ready}
              onPress={() => setBackground('photo')}
            />
            <Option
              label='Solid color'
              selected={appearance.background === 'solid'}
              disabled={!ready}
              onPress={() => setBackground('solid')}
            />
          </View>
          <RemoteColorPicker
            kind='background'
            selectedColor={appearance.backgroundColor}
            selected={appearance.background === 'solid'}
            disabled={!ready}
            onSelect={setBackgroundColor}
          />
          <View style={styles.advancedToggle}>
            <Option
              label={
                showBackgroundHex
                  ? 'Hide hex color'
                  : 'Advanced: enter hex color'
              }
              onPress={() => setShowBackgroundHex(!showBackgroundHex)}
            />
          </View>
          {showBackgroundHex && (
            <View style={styles.customColorRow}>
              <Text
                style={[
                  styles.customColorLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Background hex color
              </Text>
              <TextInput
                value={backgroundInput}
                onChangeText={setBackgroundInput}
                maxLength={7}
                onFocus={() => setFocusedInput('background')}
                onBlur={() => setFocusedInput(null)}
                autoCapitalize='characters'
                placeholder='#0F172A'
                placeholderTextColor={theme.colors.textSecondary}
                accessibilityLabel='Custom background hex color'
                style={[
                  styles.colorInput,
                  {
                    color: theme.colors.textPrimary,
                    borderColor:
                      focusedInput === 'background'
                        ? theme.colors.focusRing
                        : theme.colors.glassBorder,
                  },
                  focusedInput === 'background' && styles.focusedInput,
                ]}
              />
              <Option
                label='Apply background'
                disabled={!ready || !validBackground}
                onPress={() =>
                  validBackground && setBackgroundColor(validBackground)
                }
              />
            </View>
          )}
          {showBackgroundHex && !validBackground && (
            <Text
              style={[styles.colorHint, { color: theme.colors.textSecondary }]}
            >
              Enter six hex digits, such as #0F172A.
            </Text>
          )}
          <Text
            style={[styles.colorHint, { color: theme.colors.textSecondary }]}
          >
            Bright background colors are darkened on the dashboard to keep text
            readable.
          </Text>
          <GooglePhotosBackgroundPicker />
        </>
      )}

      {section === 'layout' && <SavedLayoutSettings />}
      {section === 'cards' && <WidgetCardSettings />}
    </View>
  );
}
