import React from 'react';
import { Text, TextProps, TextStyle } from 'react-native';
import { TVTheme } from '../../theme/tvTheme';

type TypographyVariant = keyof typeof TVTheme.typography;
type ColorVariant = keyof typeof TVTheme.colors;
type SpacingVariant = keyof typeof TVTheme.spacing;

interface TVTextProps extends TextProps {
  text: string;
  typography?: TypographyVariant;
  color?: ColorVariant;
  marginBottom?: SpacingVariant;
  marginTop?: SpacingVariant;
  marginHorizontal?: SpacingVariant;
  numberOfLines?: number;
  singleLine?: boolean;
}

export default function TVText({
  text,
  typography = 'body',
  color = 'textPrimary',
  marginBottom,
  marginTop,
  marginHorizontal,
  style,
  ...rest
}: TVTextProps) {
  const dynamicStyle: TextStyle = {
    color: TVTheme.colors[color],
    marginBottom: marginBottom ? TVTheme.spacing[marginBottom] : undefined,
    marginTop: marginTop ? TVTheme.spacing[marginTop] : undefined,
    marginHorizontal: marginHorizontal
      ? TVTheme.spacing[marginHorizontal]
      : undefined,
  };

  return (
    <Text
      style={[
        TVTheme.typography[typography],
        dynamicStyle,
        { flexShrink: 1 },
        style,
      ]}
      {...rest}
    >
      {text}
    </Text>
  );
}
