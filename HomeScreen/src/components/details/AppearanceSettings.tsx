import React, { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useAppearance, useTheme } from '../../theme/ThemeContext';
import { CARD_LABELS, getCardRows, LAYOUTS } from '../../theme/appearance';
import type { CardPreference } from '../../theme/appearance';
import { normalizeHexColor, PALETTES } from '../../theme/tvTheme';
import GooglePhotosBackgroundPicker from './GooglePhotosBackgroundPicker';
import RemoteColorPicker from './RemoteColorPicker';
import nightSkyImage from '../../../assets/media/wp8860764-nasa-4k-wallpapers.jpg';
import { cardInk, cardSurface } from '../../../../server/functions/src/utils/cardStyle';
import type { CardId } from '../../theme/appearance';

interface OptionProps {
  label: string;
  accessibilityLabel?: string;
  selected?: boolean;
  disabled?: boolean;
  subtitle?: string;
  swatch?: string;
  preview?: React.ReactNode;
  onPress: () => void;
}

function Option({ label, accessibilityLabel, selected, disabled, subtitle, swatch, preview, onPress }: OptionProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || (subtitle ? `${label}. ${subtitle}` : label)}
      accessibilityState={{ selected: Boolean(selected), disabled: Boolean(disabled) }}
      disabled={disabled}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onPress={onPress}
      style={[
        styles.option,
        Boolean(preview) && styles.layoutOption,
        { borderColor: focused ? theme.colors.focusRing : selected ? theme.colors.glassBorderTop : theme.colors.glassBorder,
          backgroundColor: selected ? theme.colors.glassSurfaceFocused : theme.colors.glassSurface,
          opacity: disabled ? 0.45 : 1 },
        focused && styles.focused,
      ]}
    >
      {swatch && <View style={[styles.swatch, { backgroundColor: swatch }]} />}
      <View>
        <Text style={[styles.optionLabel, { color: selected ? theme.colors.focusRing : theme.colors.textPrimary }]}>
          {selected ? '✓ ' : ''}{label}
        </Text>
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
  const tileColors = (id: CardId) => {
    const custom = appearance.cardStyles[id];
    const ink = custom ? cardInk(custom, theme.colors.background, theme.colors.focusRing) : null;
    return { backgroundColor: custom ? cardSurface(custom) : theme.colors.glassSurfaceFocused,
      borderColor: ink?.border || theme.colors.glassBorderTop, color: ink?.primary || theme.colors.textPrimary };
  };
  const image = large && appearance.background === 'photo' ? nightSkyImage
    : large && appearance.background === 'google-photo' && photoDataUrl ? { uri: photoDataUrl } : null;
  return (
    <View style={[styles.preview, large && styles.largePreview, { backgroundColor: theme.colors.background }]} accessible={false}>
      {image && <Image source={image} resizeMode="cover" style={styles.previewImage} />}
      {large && appearance.grid ? appearance.grid.items.map((item) => (
        <View key={item.id} style={[styles.previewTile, {
          position: 'absolute', left: `${item.x / 12 * 100}%`, top: `${item.y / 6 * 100}%`,
          width: `${item.width / 12 * 100}%`, height: `${item.height / 6 * 100}%`,
          backgroundColor: tileColors(item.id).backgroundColor, borderColor: tileColors(item.id).borderColor,
        }]}><Text numberOfLines={1} style={[styles.previewLabel, { color: tileColors(item.id).color }]}>{CARD_LABELS[item.id]}</Text></View>
      )) : rows.map((row, rowIndex) => (
        <View key={rowIndex} style={[styles.previewRow, { flex: rowIndex === 0 && rows.length > 1 ? 1.2 : 1 }]}>
          {row.map((card) => (
            <View
              key={card.id}
              style={[styles.previewTile, {
                flex: card.size === 'wide' ? 2 : 1,
                backgroundColor: tileColors(card.id).backgroundColor,
                borderColor: tileColors(card.id).borderColor,
              }]}
            >
              <Text numberOfLines={1} style={[styles.previewLabel, large && styles.largePreviewLabel, { color: tileColors(card.id).color }]}>
                {CARD_LABELS[card.id]}
              </Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

export type AppearanceSection = 'colors' | 'background' | 'layout' | 'cards';

export default function AppearanceSettings({ section = 'colors' }: { section?: AppearanceSection }) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const sideBySide = width >= 900;
  const {
    appearance, ready, selectLayout, selectPalette, setCustomAccent,
    setBackground, setBackgroundColor,
    moveCard, toggleCard, toggleCardSize, resetAppearance,
  } = useAppearance();
  const [accentInput, setAccentInput] = useState(appearance.customAccent);
  const [backgroundInput, setBackgroundInput] = useState(appearance.backgroundColor);
  const [showAccentHex, setShowAccentHex] = useState(false);
  const [showBackgroundHex, setShowBackgroundHex] = useState(false);
  const [focusedInput, setFocusedInput] = useState<'accent' | 'background' | null>(null);
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
            <Option label="Up" accessibilityLabel={`Move ${CARD_LABELS[card.id]} up`} disabled={!ready || Boolean(appearance.grid) || index === 0} onPress={() => moveCard(card.id, -1)} />
            <Option label="Down" accessibilityLabel={`Move ${CARD_LABELS[card.id]} down`} disabled={!ready || Boolean(appearance.grid) || index === appearance.cards.length - 1}
              onPress={() => moveCard(card.id, 1)} />
            <Option label={card.visible ? 'Shown' : 'Hidden'} selected={card.visible}
              accessibilityLabel={`${CARD_LABELS[card.id]} ${card.visible ? 'shown' : 'hidden'}`}
              disabled={!ready || Boolean(appearance.grid) || (card.visible && visibleCount === 1)} onPress={() => toggleCard(card.id)} />
            <Option label={card.size === 'wide' ? 'Wide' : 'Standard'} accessibilityLabel={`${CARD_LABELS[card.id]} ${card.size} size`} disabled={!ready || Boolean(appearance.grid)}
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
        {appearance.grid ? 'Free layout is active. Edit positions and sizes on the companion site.' : 'Move, show, or resize a card to see the layout update here.'}
      </Text>
    </View>
  );

  return (
    <View style={styles.section}>
      <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
        {section === 'colors' ? 'Color palette' : section === 'background' ? 'Background' : section === 'layout' ? 'Choose a layout' : 'Arrange cards'}
      </Text>
      {!ready && <Text style={{ color: theme.colors.textSecondary }}>Loading appearance…</Text>}

      {section === 'colors' && <>
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
              onFocus={() => setFocusedInput('accent')} onBlur={() => setFocusedInput(null)}
              autoCapitalize="characters" placeholder="#38BDF8" placeholderTextColor={theme.colors.textSecondary}
              accessibilityLabel="Custom accent hex color"
              style={[styles.colorInput, { color: theme.colors.textPrimary, borderColor: focusedInput === 'accent' ? theme.colors.focusRing : theme.colors.glassBorder }, focusedInput === 'accent' && styles.focusedInput]} />
            <Option label="Apply accent" disabled={!ready || !validAccent}
              onPress={() => validAccent && setCustomAccent(validAccent)} />
          </View>
          {!validAccent && <Text style={[styles.colorHint, { color: theme.colors.textSecondary }]}>Enter six hex digits, such as #38BDF8.</Text>}
        </>
      )}

      </>}

      {section === 'background' && <>
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
            onFocus={() => setFocusedInput('background')} onBlur={() => setFocusedInput(null)}
            autoCapitalize="characters" placeholder="#0F172A" placeholderTextColor={theme.colors.textSecondary}
            accessibilityLabel="Custom background hex color"
            style={[styles.colorInput, { color: theme.colors.textPrimary, borderColor: focusedInput === 'background' ? theme.colors.focusRing : theme.colors.glassBorder }, focusedInput === 'background' && styles.focusedInput]} />
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

      </>}

      {section === 'layout' && <>
      {appearance.grid && <Text style={[styles.description, { color: theme.colors.textSecondary }]}>Your companion free layout is active. Selecting a preset replaces it with automatic rows.</Text>}
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
      </>}

      {section === 'cards' && <>
      <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
        {appearance.grid ? 'Use Settings → Companion site to edit this free layout. Choose a preset in Layout to use the TV card controls again.' : 'Change card order, visibility, and size. The preview updates as you go.'}
      </Text>
      <View style={[styles.cardEditor, { flexDirection: sideBySide ? 'row' : 'column' }]}>
        {sideBySide ? <>{cardControls}{livePreview}</> : <>{livePreview}{cardControls}</>}
      </View>
      <View style={styles.reset}>
        <Option label="Restore default appearance" disabled={!ready} onPress={resetAppearance} />
      </View>
      </>}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    padding: 18, borderRadius: 18, marginBottom: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  description: { fontSize: 14, lineHeight: 19, marginTop: 0, marginBottom: 10 },
  heading: { fontSize: 17, fontWeight: '700', marginTop: 17, marginBottom: 10 },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  advancedToggle: { alignSelf: 'flex-start', marginTop: 10 },
  customColorRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginTop: 11 },
  customColorLabel: { fontSize: 13, minWidth: 145 },
  colorInput: { width: 150, minHeight: 52, borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 12, fontSize: 17 },
  focusedInput: { borderWidth: 3 },
  colorHint: { fontSize: 12, marginTop: 7 },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: 9,
    minHeight: 52, paddingVertical: 10, paddingHorizontal: 15,
    borderWidth: 1.5, borderRadius: 12,
  },
  layoutOption: { width: '48%', minWidth: 250, alignItems: 'stretch', flexDirection: 'column', gap: 6 },
  preview: { width: '100%', height: 90, borderRadius: 8, padding: 6, gap: 4 },
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
  optionLabel: { fontSize: 16, fontWeight: '700' },
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
