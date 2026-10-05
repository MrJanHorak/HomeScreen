import { ReactNode, useState } from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  Platform,
} from 'react-native';
import {
  CardThemeProvider,
  useAppearance,
  useTheme,
} from '../../theme/ThemeContext';
import type { CardId } from '../../theme/appearance';
import {
  cardInk,
  cardSurface,
} from '../../../../server/functions/src/utils/cardStyle';
import useCompactTVLayout from '../../hooks/useCompactTVLayout';

interface TVCardProps {
  title?: string;
  onPress?: () => void;
  children?: ReactNode;
  style?: ViewStyle;
  accessibilityLabel?: string;
  cardId?: CardId;
}

export default function TVCard({
  title,
  onPress,
  children,
  style,
  accessibilityLabel,
  cardId,
}: TVCardProps) {
  const theme = useTheme();
  const { appearance } = useAppearance();
  const compact = useCompactTVLayout();
  const [isFocused, setIsFocused] = useState(false);
  const custom = cardId ? appearance.cardStyles[cardId] : undefined;
  const ink =
    custom && !custom.useThemeSurface
      ? cardInk(custom, theme.colors.background, theme.colors.focusRing)
      : null;
  const cardTheme = ink
    ? {
        ...theme,
        colors: {
          ...theme.colors,
          textPrimary: ink.primary,
          textFocused: ink.primary,
          textSecondary: ink.secondary,
          focusRing: ink.accent,
          accent: ink.accent,
          glassBorder: ink.border,
          glassBorderTop: ink.border,
          glassSubtle: ink.subtle,
          glassHighlight: ink.subtle,
          glassChip: ink.subtle,
        },
      }
    : theme;

  const containerStyle: ViewStyle = {
    backgroundColor:
      custom && !custom.useThemeSurface
        ? cardSurface(custom, isFocused)
        : Platform.OS === 'web'
          ? isFocused
            ? theme.colors.glassSurfaceFocused
            : theme.colors.glassSurface
          : isFocused
            ? theme.colors.surfaceFocused
            : theme.colors.modalSurface,
    borderColor: isFocused
      ? theme.colors.focusRing
      : cardTheme.colors.glassBorder,
    transform: [{ scale: isFocused ? theme.tvAnimation.focusScale : 1.0 }],
    shadowColor: isFocused ? theme.colors.focusRing : '#000',
    shadowOpacity: isFocused ? 0.5 : 0.35,
    shadowRadius: isFocused ? 24 : 16,
    shadowOffset: { width: 0, height: isFocused ? 12 : 8 },
    ...Platform.select({
      android: {
        // Elevation shadows bleed through translucent surfaces on Android TV.
        // Outset box shadows exclude the card interior; zIndex preserves focus stacking.
        elevation: 0,
        zIndex: isFocused ? 1 : 0,
        ...(Number(Platform.Version) >= 28 && {
          boxShadow: isFocused
            ? `0 0 30px ${theme.colors.focusGlow}, 0 20px 40px rgba(0, 0, 0, 0.5)`
            : '0 12px 32px rgba(0, 0, 0, 0.35)',
        }),
      },
      web: {
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        boxShadow: isFocused
          ? `0 0 30px ${theme.colors.focusGlow}, 0 20px 40px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.3)`
          : '0 12px 32px rgba(0, 0, 0, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.15)',
        transition:
          'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.22s ease, border-color 0.2s ease, background-color 0.2s ease',
        outline: 'none',
      } as any,
    }),
  };

  return (
    <Pressable
      accessibilityRole='button'
      accessibilityLabel={accessibilityLabel}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      onPress={onPress}
      style={[
        styles.card,
        compact && styles.compactCard,
        containerStyle,
        style,
        custom && {
          borderWidth: isFocused
            ? Math.max(2, custom.borderWidth ?? 1.5)
            : (custom.borderWidth ?? 1.5),
          borderRadius: custom.borderRadius ?? (compact ? 16 : 20),
        },
      ]}
    >
      {title && !children ? (
        <Text
          style={[
            styles.title,
            {
              color: isFocused
                ? cardTheme.colors.textFocused
                : cardTheme.colors.textPrimary,
            },
          ]}
        >
          {title}
        </Text>
      ) : (
        <CardThemeProvider theme={cardTheme}>{children}</CardThemeProvider>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 22,
    borderRadius: 20,
    borderWidth: 1.5,
    minHeight: 140,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  title: {
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '600',
  },
  compactCard: { padding: 12, borderRadius: 16, minHeight: 0 },
});
