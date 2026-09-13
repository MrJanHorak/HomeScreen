import { useState } from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

interface TVCardProps {
  title: string;
  onPress?: () => void;
}

export const TVCard = ({ title, onPress }: TVCardProps) => {
  const theme = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  const containerStyle: ViewStyle = {
    backgroundColor: isFocused
      ? theme.colors.surfaceFocused
      : theme.colors.surface,
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
      style={[styles.card, containerStyle]}
    >
      <Text style={[styles.text, theme.typography.body, textStyle]}>
        {title}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 24,
    borderRadius: 12,
    borderWidth: 3,
    minWidth: 220,
    minHeight: 140,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    textAlign: 'center',
  },
});
