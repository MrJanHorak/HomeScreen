import React, {forwardRef} from 'react';
import {Text as NativeText, StyleSheet} from 'react-native';
import type {TextProps, TextStyle} from 'react-native';
import {useTheme} from '../../theme/ThemeContext';
import {normalizeReading} from '../../../../server/functions/src/utils/reading';

/** One font policy for dashboard, details, settings and ambient text; icon fonts stay separate. */
const ReadingText = forwardRef<NativeText, TextProps>(function ReadingText({style, ...props}, ref) {
  const theme = useTheme();
  const reading = normalizeReading(theme.reading);
  const flat = StyleSheet.flatten(style) || {};
  const size = flat.fontSize || 14;
  const bold = reading.weight === 'bold' || Number(flat.fontWeight) >= 600 || flat.fontWeight === 'bold';
  const dyslexic = reading.font === 'opendyslexic' && theme.fontsReady;
  const font: TextStyle = {
    ...(reading.weight === 'bold' ? {fontWeight: '700'} : {}),
    ...(dyslexic ? {fontFamily: bold ? 'OpenDyslexicBold' : 'OpenDyslexic', fontWeight: '400', fontStyle: 'normal',
      // Explicit line heights are also the adaptive widget's space budget.
      // Settings/details without a budget use comfortable natural spacing.
      lineHeight: flat.lineHeight || Math.ceil(size * 1.4)} : {}),
    ...(reading.spacing === 'relaxed' ? {letterSpacing: Math.max(flat.letterSpacing || 0, Math.min(.7, size * .02))} : {}),
  };
  return <NativeText ref={ref} {...props} style={[{color: theme.colors.textPrimary}, style, font]}/>;
});
export default ReadingText;
