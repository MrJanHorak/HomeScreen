import { ReactNode, useState } from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
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
      ? theme.colors.surfaceFocusedOpacity
      : theme.colors.surfaceOpacity,
    borderColor: isFocused ? theme.colors.focusRing : 'transparent',
    transform: [{ scale: isFocused ? theme.tvAnimation.focusScale : 1.0 }],
  };

  const textStyle: TextStyle = {
    color: isFocused ? theme.colors.textFocused : theme.colors.textSecondary,
  };

  return (
    <Pressable
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      onPress={onPress}
      style={[styles.card, containerStyle, style]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 24,
    borderRadius: 12,
    borderWidth: 3,
    minHeight: 140,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  text: {
    textAlign: 'center',
  },
});
