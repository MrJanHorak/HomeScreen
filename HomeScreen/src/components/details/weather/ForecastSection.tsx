import Text from '../../shared/ReadingText';
import type {ReactNode} from 'react';
import {StyleSheet, View} from 'react-native';
import {useTheme} from '../../../theme/ThemeContext';
import {useDetailLayout} from '../../shared/DetailLayout';

export default function ForecastSection({title, children}: {title: string; children: ReactNode}) {
  const theme = useTheme();
  const {compact} = useDetailLayout();
  return (
    <View style={[styles.section, compact && {marginBottom: 12}]}>
      <Text style={[styles.title, compact && {marginBottom: 8}, {color: theme.colors.textPrimary}]}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {marginBottom: 24},
  title: {fontSize: 18, fontWeight: '700', marginBottom: 12, letterSpacing: 0.3},
});
