import Text from '../../shared/ReadingText';
import {Image, View} from 'react-native';
import {useState} from 'react';
import {useAppearance, useTheme} from '../../../theme/ThemeContext';
import {CARD_LABELS, getCardRows} from '../../../theme/appearance';
import type {CardId, CardPreference} from '../../../theme/appearance';
import {cardInk, cardSurface} from '../../../../../server/functions/src/utils/cardStyle';
import nightSkyImage from '../../../../assets/media/wp8860764-nasa-4k-wallpapers.jpg';
import {styles} from './appearanceStyles';
import type {DashboardAppearance} from '../../../theme/appearance';
import {themeForPalette} from '../../../theme/tvTheme';
import {widgetRows} from '../../../../../server/functions/src/utils/widgets';
import type {Widget} from '../../../../../server/functions/src/utils/widgets';
import {widgetLabel} from './widgetControls';
import {gridRect} from '../../../../../server/functions/src/utils/dashboardLayout';

export default function LayoutPreview({
  cards,
  large = false,
  appearance: suppliedAppearance,
  label = widgetLabel,
  selectedId,
  compact = false,
}: {
  cards: CardPreference[];
  large?: boolean;
  appearance?: DashboardAppearance;
  label?: (widget: Widget) => string;
  selectedId?: string;
  compact?: boolean;
}) {
  const currentTheme = useTheme();
  const [area, setArea] = useState({width: 0, height: 0});
  const {appearance: currentAppearance, photoDataUrl} = useAppearance();
  const appearance = suppliedAppearance || currentAppearance;
  const theme = suppliedAppearance ? themeForPalette(appearance.palette, appearance.customAccent, appearance.backgroundColor, appearance.background) : currentTheme;
  const widgets = appearance.widgetLayout;
  const rows = widgets ? widgetRows(widgets.widgets) : getCardRows(cards);
  const grid = widgets ? widgets.grid : (large || suppliedAppearance ? appearance.grid : null);
  const labelFor = (id: string) => {
    const widget = widgets?.widgets.find((item) => item.id === id);
    return widget ? label(widget) : CARD_LABELS[id as CardId] || id;
  };
  const tileColors = (id: string) => {
    const custom = widgets?.widgets.find((item) => item.id === id)?.style || appearance.cardStyles[id as CardId];
    const ink =
      custom && !custom.useThemeSurface
        ? cardInk(custom, theme.colors.background, theme.colors.focusRing)
        : null;
    return {
      backgroundColor:
        custom && !custom.useThemeSurface
          ? cardSurface(custom)
          : theme.colors.glassSurfaceFocused,
      borderColor: ink?.border || theme.colors.glassBorderTop,
      color: ink?.primary || theme.colors.textPrimary,
      borderWidth: custom?.borderWidth ?? 1,
      borderRadius: custom?.borderRadius ?? 5,
    };
  };
  const image =
    large && appearance.background === 'photo'
      ? nightSkyImage
      : large && appearance.background === 'google-photo' && photoDataUrl
        ? { uri: photoDataUrl }
        : null;
  return (
    <View
      testID='layout-preview'
      style={[
        styles.preview,
        large && styles.largePreview,
        compact && {height: 108},
        { backgroundColor: theme.colors.background },
      ]}
      accessible={false}
    >
      {image && (
        <Image source={image} resizeMode='cover' style={styles.previewImage} />
      )}
      {grid
        ? <View testID='layout-preview-grid' style={{flex: 1, minWidth: 0, minHeight: 0}}
            onLayout={({nativeEvent: {layout}}) => setArea({width: layout.width, height: layout.height})}>
          {area.width > 0 && grid.items.map((item) => (
            <View
              key={item.id}
              testID={`preview-tile-${item.id}`}
              style={[
                styles.previewTile,
                {
                  position: 'absolute',
                  ...gridRect(item, area.width, area.height, large ? 4 : 2),
                  backgroundColor: tileColors(item.id).backgroundColor,
                  borderColor: tileColors(item.id).borderColor,
                  borderWidth: tileColors(item.id).borderWidth,
                  borderRadius: tileColors(item.id).borderRadius,
                  ...(selectedId === item.id ? {borderColor: theme.colors.focusRing, borderWidth: 2} : {}),
                },
              ]}
            >
              <Text
                numberOfLines={1}
                style={[
                  styles.previewLabel,
                  { color: tileColors(item.id).color },
                ]}
              >
                {labelFor(item.id)}
              </Text>
            </View>
          ))}
          </View>
        : rows.map((row, rowIndex) => (
            <View
              key={rowIndex}
              style={[
                styles.previewRow,
                { flex: rowIndex === 0 && rows.length > 1 ? 1.2 : 1 },
              ]}
            >
              {row.map((card) => (
                <View
                  key={card.id}
                  testID={`preview-tile-${card.id}`}
                  style={[
                    styles.previewTile,
                    {
                      flex: card.size === 'wide' ? 2 : 1,
                      backgroundColor: tileColors(card.id).backgroundColor,
                      borderColor: tileColors(card.id).borderColor,
                      borderWidth: tileColors(card.id).borderWidth,
                      borderRadius: tileColors(card.id).borderRadius,
                      ...(selectedId === card.id ? {borderColor: theme.colors.focusRing, borderWidth: 2} : {}),
                    },
                  ]}
                >
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.previewLabel,
                      large && styles.largePreviewLabel,
                      { color: tileColors(card.id).color },
                    ]}
                  >
                    {labelFor(card.id)}
                  </Text>
                </View>
              ))}
            </View>
          ))}
    </View>
  );
}


