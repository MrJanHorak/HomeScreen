import Pressable from '../../shared/NarratedPressable';
import Text from '../../shared/ReadingText';
import {useState} from 'react';
import type React from 'react';
import {View} from 'react-native';
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
  large?: boolean;
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
  large = false,
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
        large && {minHeight: 64, maxWidth: '100%'},
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
        focused && (large ? {borderWidth: 3} : styles.focused),
      ]}
    >
      {swatch && <View style={[styles.swatch, { backgroundColor: swatch }]} />}
      <View style={{flexShrink: 1}}>
        <Text
          style={[
            styles.optionLabel,
            large && {fontSize: 22},
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
              large && {fontSize: 18, maxWidth: 600},
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


