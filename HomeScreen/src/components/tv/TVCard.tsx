import { ReactNode, useState } from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  Platform,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

interface TVCardProps {
  title?: string;
  onPress?: () => void;
  children?: ReactNode;
  style?: ViewStyle;
}

export default function TVCard({
  title,
  onPress,
  children,
  style,
}: TVCardProps) {
  const theme = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  const containerStyle: ViewStyle = {
    backgroundColor: isFocused
      ? theme.colors.glassSurfaceFocused
      : theme.colors.glassSurface,
    borderColor: isFocused ? theme.colors.focusRing : theme.colors.glassBorder,
    transform: [{ scale: isFocused ? theme.tvAnimation.focusScale : 1.0 }],
    shadowColor: isFocused ? theme.colors.focusRing : '#000',
    shadowOpacity: isFocused ? 0.5 : 0.35,
    shadowRadius: isFocused ? 24 : 16,
    shadowOffset: { width: 0, height: isFocused ? 12 : 8 },
    elevation: isFocused ? 14 : 6,
    ...Platform.select({
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
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      onPress={onPress}
      style={[styles.card, containerStyle, style]}
    >
      {title && !children ? (
        <Text style={[styles.title, { color: isFocused ? theme.colors.textFocused : theme.colors.textPrimary }]}>
          {title}
        </Text>
      ) : (
        children
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
});

