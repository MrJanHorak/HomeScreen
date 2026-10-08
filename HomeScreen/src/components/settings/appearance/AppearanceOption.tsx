import {useState} from 'react';
import type React from 'react';
import {Pressable, Text, View} from 'react-native';
import {useTheme} from '../../../theme/ThemeContext';
import {styles} from './appearanceStyles';

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

export default function Option({
  label,
  accessibilityLabel,
  selected,
  disabled,
  subtitle,
  swatch,
  preview,
  onPress,
}: OptionProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      accessibilityRole='button'
      accessibilityLabel={
        accessibilityLabel || (subtitle ? `${label}. ${subtitle}` : label)
      }
      accessibilityState={{
        selected: Boolean(selected),
        disabled: Boolean(disabled),
      }}
      disabled={disabled}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onPress={onPress}
      style={[
        styles.option,
        Boolean(preview) && styles.layoutOption,
        {
          borderColor: focused
            ? theme.colors.focusRing
            : selected
              ? theme.colors.glassBorderTop
              : theme.colors.glassBorder,
          backgroundColor: selected
            ? theme.colors.glassSurfaceFocused
            : theme.colors.glassSurface,
          opacity: disabled ? 0.45 : 1,
        },
        focused && styles.focused,
      ]}
    >
      {swatch && <View style={[styles.swatch, { backgroundColor: swatch }]} />}
      <View>
        <Text
          style={[
            styles.optionLabel,
            {
              color: selected
                ? theme.colors.focusRing
                : theme.colors.textPrimary,
            },
          ]}
        >
          {selected ? '✓ ' : ''}
          {label}
        </Text>
        {subtitle && (
          <Text
            style={[
              styles.optionSubtitle,
              { color: theme.colors.textSecondary },
            ]}
          >
            {subtitle}
          </Text>
        )}
      </View>
      {preview}
    </Pressable>
  );
}


