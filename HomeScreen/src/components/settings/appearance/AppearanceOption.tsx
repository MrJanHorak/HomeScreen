import Pressable from '../../shared/NarratedPressable';
import Text from '../../shared/ReadingText';
import {useState} from 'react';
import type React from 'react';
import {View} from 'react-native';
import type {StyleProp, ViewStyle} from 'react-native';
import {useTheme} from '../../../theme/ThemeContext';
import {styles} from './appearanceStyles';
import {useMotion} from '../../../accessibility/MotionContext';

interface OptionProps {
  ref?: React.Ref<View>;
  label: string;
  accessibilityLabel?: string;
  selected?: boolean;
  disabled?: boolean;
  subtitle?: string;
  swatch?: string;
  preview?: React.ReactNode;
  onPress: () => void;
  large?: boolean;
  compact?: boolean;
  expanded?: boolean;
  style?: StyleProp<ViewStyle>;
}

export default function Option({
  ref,
  label,
  accessibilityLabel,
  selected,
  disabled,
  subtitle,
  swatch,
  preview,
  onPress,
  large = false,
  compact = false,
  expanded,
  style,
}: OptionProps) {
  const theme = useTheme();
  const {reduced} = useMotion();
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      ref={ref}
      accessibilityRole='button'
      aria-expanded={expanded}
      accessibilityLabel={
        accessibilityLabel || (subtitle ? `${label}. ${subtitle}` : label)
      }
      accessibilityState={{
        selected: Boolean(selected),
        disabled: Boolean(disabled),
        ...(expanded !== undefined ? {expanded} : {}),
      }}
      disabled={disabled}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onPress={onPress}
      style={[
        styles.option,
        large && {minHeight: 64, maxWidth: '100%'},
        compact && {minHeight: 44, paddingVertical: 8, paddingHorizontal: 12},
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
        focused && (large || compact || reduced ? {borderWidth: 3} : styles.focused),
        style,
      ]}
    >
      {swatch && <View style={[styles.swatch, { backgroundColor: swatch }]} />}
      <View style={{flexShrink: 1}}>
        <Text
          style={[
            styles.optionLabel,
            large && {fontSize: 22},
            compact && {fontSize: 18},
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
              compact && {fontSize: 14, maxWidth: '100%'},
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


