import React, { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useAppearance, useTheme } from '../../theme/ThemeContext';
import { CARD_LABELS, getCardRows, LAYOUTS } from '../../theme/appearance';
import type { CardPreference } from '../../theme/appearance';
import { normalizeHexColor, PALETTES } from '../../theme/tvTheme';
import GooglePhotosBackgroundPicker from './GooglePhotosBackgroundPicker';
import RemoteColorPicker from './RemoteColorPicker';
import nightSkyImage from '../../../assets/media/wp8860764-nasa-4k-wallpapers.jpg';

interface OptionProps {
  label: string;
  selected?: boolean;
  disabled?: boolean;
  subtitle?: string;
  swatch?: string;
  preview?: React.ReactNode;
  onPress: () => void;
}

function Option({ label, selected, disabled, subtitle, swatch, preview, onPress }: OptionProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${label}. ${subtitle}` : label}
      accessibilityState={{ selected: Boolean(selected), disabled: Boolean(disabled) }}
      disabled={disabled}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onPress={onPress}
      style={[
        styles.option,
        Boolean(preview) && styles.layoutOption,
        { borderColor: focused || selected ? theme.colors.focusRing : theme.colors.glassBorder,
          backgroundColor: selected ? theme.colors.glassSurfaceFocused : theme.colors.glassSurface,
          opacity: disabled ? 0.45 : 1 },
        focused && styles.focused,
      ]}
    >
      {swatch && <View style={[styles.swatch, { backgroundColor: swatch }]} />}
      <View>
        <Text style={[styles.optionLabel, { color: theme.colors.textPrimary }]}>{label}</Text>
        {subtitle && <Text style={[styles.optionSubtitle, { color: theme.colors.textSecondary }]}>{subtitle}</Text>}
      </View>
      {preview}
    </Pressable>
  );
}

function LayoutPreview({ cards, large = false }: { cards: CardPreference[]; large?: boolean }) {
  const theme = useTheme();
  const { appearance, photoDataUrl } = useAppearance();
  const rows = getCardRows(cards);
  const image = large && appearance.background === 'photo' ? nightSkyImage
    : large && appearance.background === 'google-photo' && photoDataUrl ? { uri: photoDataUrl } : null;
  return (
    <View style={[styles.preview, large && styles.largePreview, { backgroundColor: theme.colors.background }]} accessible={false}>
      {image && <Image source={image} resizeMode="cover" style={styles.previewImage} />}
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={[styles.previewRow, { flex: rowIndex === 0 && rows.length > 1 ? 1.2 : 1 }]}>
          {row.map((card) => (
            <View
              key={card.id}
              style={[styles.previewTile, {
                flex: card.size === 'wide' ? 2 : 1,
                backgroundColor: theme.colors.glassSurfaceFocused,
                borderColor: theme.colors.glassBorderTop,
              }]}
            >
              <Text numberOfLines={1} style={[styles.previewLabel, large && styles.largePreviewLabel, { color: theme.colors.textPrimary }]}>
                {CARD_LABELS[card.id]}
              </Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

export default function AppearanceSettings() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const sideBySide = width >= 1100;
  const {
    appearance, ready, selectLayout, selectPalette, setCustomAccent,
    setBackground, setBackgroundColor,
    moveCard, toggleCard, toggleCardSize, resetAppearance,
  } = useAppearance();
  const [accentInput, setAccentInput] = useState(appearance.customAccent);
  const [backgroundInput, setBackgroundInput] = useState(appearance.backgroundColor);
  const [showAccentHex, setShowAccentHex] = useState(false);
  const [showBackgroundHex, setShowBackgroundHex] = useState(false);
  useEffect(() => setAccentInput(appearance.customAccent), [appearance.customAccent]);
  useEffect(() => setBackgroundInput(appearance.backgroundColor), [appearance.backgroundColor]);
  const validAccent = normalizeHexColor(accentInput);
  const validBackground = normalizeHexColor(backgroundInput);
  const visibleCount = appearance.cards.filter((card) => card.visible).length;
  const hiddenNames = appearance.cards.filter((card) => !card.visible).map((card) => CARD_LABELS[card.id]);

  const cardControls = (
    <View style={[styles.cardList, { flex: sideBySide ? 1 : undefined, width: sideBySide ? undefined : '100%' }]}>
      {appearance.cards.map((card, index) => (
        <View key={card.id} style={[styles.cardRow, { borderColor: theme.colors.glassBorder }]}>
          <Text style={[styles.cardName, { color: theme.colors.textPrimary }]}>
            {index + 1}. {CARD_LABELS[card.id]}
          </Text>
          <View style={styles.cardActions}>
            <Option label="Up" disabled={!ready || index === 0} onPress={() => moveCard(card.id, -1)} />
            <Option label="Down" disabled={!ready || index === appearance.cards.length - 1}
              onPress={() => moveCard(card.id, 1)} />
            <Option label={card.visible ? 'Shown' : 'Hidden'} selected={card.visible}
              disabled={!ready || (card.visible && visibleCount === 1)} onPress={() => toggleCard(card.id)} />
            <Option label={card.size === 'wide' ? 'Wide' : 'Standard'} disabled={!ready}
              onPress={() => toggleCardSize(card.id)} />
          </View>
        </View>
      ))}
    </View>
  );

  const livePreview = (
    <View style={[styles.livePreviewPanel, {
      width: sideBySide ? 320 : '100%',
      borderColor: theme.colors.focusRing,
      backgroundColor: theme.colors.glassSurface,
    }]}>
      <Text style={[styles.livePreviewTitle, { color: theme.colors.textPrimary }]}>Live dashboard preview</Text>
      <Text style={[styles.livePreviewMeta, { color: theme.colors.textSecondary }]}>
        {visibleCount} of {appearance.cards.length} cards shown
      </Text>
      <LayoutPreview cards={appearance.cards} large />
      {hiddenNames.length > 0 && (
        <Text style={[styles.livePreviewMeta, { color: theme.colors.textSecondary }]}>
          Hidden: {hiddenNames.join(', ')}
        </Text>
      )}
      <Text style={[styles.livePreviewHint, { color: theme.colors.textSecondary }]}>
        Move, show, or resize a card to see the layout update here.
      </Text>
    </View>
  );

  return (
    <View style={styles.section}>
      <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Make it yours</Text>
      <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
        Changes appear immediately and sync across your signed-in screens.
      </Text>
      {!ready && <Text style={{ color: theme.colors.textSecondary }}>Loading appearance…</Text>}

      <Text style={[styles.heading, { color: theme.colors.textPrimary }]}>Colors</Text>
      <View style={styles.options}>
        {(Object.keys(PALETTES) as Array<keyof typeof PALETTES>).map((id) => (
          <Option
            key={id}
            label={PALETTES[id].label}
            swatch={id === 'night' ? '#38BDF8' : PALETTES[id].colors.focusRing}
            selected={appearance.palette === id}
            disabled={!ready}
            onPress={() => selectPalette(id)}
          />
        ))}
        <Option label="Custom" swatch={theme.colors.focusRing}
          selected={appearance.palette === 'custom'} disabled={!ready}
          onPress={() => selectPalette('custom')} />
      </View>
      <RemoteColorPicker kind="accent" selectedColor={appearance.customAccent}
        selected={appearance.palette === 'custom'} disabled={!ready} onSelect={setCustomAccent} />
      <View style={styles.advancedToggle}>
        <Option label={showAccentHex ? 'Hide hex color' : 'Advanced: enter hex color'}
          onPress={() => setShowAccentHex(!showAccentHex)} />
      </View>
      {showAccentHex && (
        <>
          <View style={styles.customColorRow}>
            <Text style={[styles.customColorLabel, { color: theme.colors.textSecondary }]}>Accent hex color</Text>
            <TextInput value={accentInput} onChangeText={setAccentInput} maxLength={7}
              autoCapitalize="characters" placeholder="#38BDF8" placeholderTextColor={theme.colors.textSecondary}
              accessibilityLabel="Custom accent hex color"
              style={[styles.colorInput, { color: theme.colors.textPrimary, borderColor: theme.colors.glassBorder }]} />
            <Option label="Apply accent" disabled={!ready || !validAccent}
              onPress={() => validAccent && setCustomAccent(validAccent)} />
          </View>
          {!validAccent && <Text style={[styles.colorHint, { color: theme.colors.textSecondary }]}>Enter six hex digits, such as #38BDF8.</Text>}
        </>
      )}

      <Text style={[styles.heading, { color: theme.colors.textPrimary }]}>Background</Text>
      <View style={styles.options}>
        <Option label="Night sky photo" selected={appearance.background === 'photo'} disabled={!ready}
          onPress={() => setBackground('photo')} />
        <Option label="Solid color" selected={appearance.background === 'solid'} disabled={!ready}
          onPress={() => setBackground('solid')} />
      </View>
      <RemoteColorPicker kind="background" selectedColor={appearance.backgroundColor}
        selected={appearance.background === 'solid'} disabled={!ready} onSelect={setBackgroundColor} />
      <View style={styles.advancedToggle}>
        <Option label={showBackgroundHex ? 'Hide hex color' : 'Advanced: enter hex color'}
          onPress={() => setShowBackgroundHex(!showBackgroundHex)} />
      </View>
      {showBackgroundHex && (
        <View style={styles.customColorRow}>
          <Text style={[styles.customColorLabel, { color: theme.colors.textSecondary }]}>Background hex color</Text>
          <TextInput value={backgroundInput} onChangeText={setBackgroundInput} maxLength={7}
            autoCapitalize="characters" placeholder="#0F172A" placeholderTextColor={theme.colors.textSecondary}
            accessibilityLabel="Custom background hex color"
            style={[styles.colorInput, { color: theme.colors.textPrimary, borderColor: theme.colors.glassBorder }]} />
          <Option label="Apply background" disabled={!ready || !validBackground}
            onPress={() => validBackground && setBackgroundColor(validBackground)} />
        </View>
      )}
      {showBackgroundHex && !validBackground && (
        <Text style={[styles.colorHint, { color: theme.colors.textSecondary }]}>Enter six hex digits, such as #0F172A.</Text>
      )}
      <Text style={[styles.colorHint, { color: theme.colors.textSecondary }]}>
        Bright background colors are darkened on the dashboard to keep text readable.
      </Text>
      <GooglePhotosBackgroundPicker />

      <Text style={[styles.heading, { color: theme.colors.textPrimary }]}>Layout</Text>
      <View style={styles.options}>
        {(Object.keys(LAYOUTS) as Array<keyof typeof LAYOUTS>).map((id) => (
          <Option
            key={id}
            label={LAYOUTS[id].label}
            subtitle={LAYOUTS[id].description}
            preview={<LayoutPreview cards={LAYOUTS[id].cards} />}
            selected={appearance.layout === id}
            disabled={!ready}
            onPress={() => selectLayout(id)}
          />
        ))}
      </View>

      <Text style={[styles.heading, { color: theme.colors.textPrimary }]}>Cards</Text>
      <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
        Arrange their TV remote focus order, choose what appears, and give important cards more room.
      </Text>
      <View style={[styles.cardEditor, { flexDirection: sideBySide ? 'row' : 'column' }]}>
        {sideBySide ? <>{cardControls}{livePreview}</> : <>{livePreview}{cardControls}</>}
      </View>
      <View style={styles.reset}>
        <Option label="Restore default appearance" disabled={!ready} onPress={resetAppearance} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    padding: 24, borderRadius: 20, marginBottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  title: { fontSize: 22, fontWeight: '700' },
  description: { fontSize: 14, lineHeight: 21, marginTop: 6, marginBottom: 10 },
  heading: { fontSize: 17, fontWeight: '700', marginTop: 17, marginBottom: 10 },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  advancedToggle: { alignSelf: 'flex-start', marginTop: 10 },
  customColorRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginTop: 11 },
  customColorLabel: { fontSize: 13, minWidth: 145 },
  colorInput: { width: 130, minHeight: 44, borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 12, fontSize: 15 },
  colorHint: { fontSize: 12, marginTop: 7 },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: 9,
    minHeight: 44, paddingVertical: 8, paddingHorizontal: 12,
    borderWidth: 1.5, borderRadius: 12,
  },
  layoutOption: { width: 252, alignItems: 'stretch', flexDirection: 'column', gap: 8 },
  preview: { width: '100%', height: 82, borderRadius: 8, padding: 6, gap: 4 },
  previewImage: { ...StyleSheet.absoluteFill, borderRadius: 8 },
  largePreview: { height: 188, padding: 9, gap: 7 },
  previewRow: { flexDirection: 'row', gap: 4 },
  previewTile: {
    minWidth: 0, borderRadius: 5, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2,
  },
  previewLabel: { fontSize: 9, fontWeight: '700' },
  largePreviewLabel: { fontSize: 12 },
  focused: { transform: [{ scale: 1.04 }] },
  optionLabel: { fontSize: 14, fontWeight: '700' },
  optionSubtitle: { fontSize: 12, maxWidth: 200, marginTop: 2 },
  swatch: { width: 18, height: 18, borderRadius: 9, borderWidth: 1, borderColor: '#FFFFFF' },
  cardEditor: { gap: 18, alignItems: 'flex-start' },
  cardList: { gap: 8, minWidth: 0 },
  livePreviewPanel: { borderWidth: 1.5, borderRadius: 16, padding: 15 },
  livePreviewTitle: { fontSize: 16, fontWeight: '700' },
  livePreviewMeta: { fontSize: 12, marginTop: 4, marginBottom: 8 },
  livePreviewHint: { fontSize: 12, lineHeight: 18, marginTop: 9 },
  cardRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    flexWrap: 'wrap', gap: 10, borderWidth: 1, borderRadius: 12, padding: 10,
  },
  cardName: { fontSize: 15, fontWeight: '700', minWidth: 110 },
  cardActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  reset: { marginTop: 17, alignSelf: 'flex-start' },
});
