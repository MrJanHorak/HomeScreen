import Text from '../../shared/ReadingText';
import type {ReactNode} from 'react';
import {StyleSheet, View} from 'react-native';
import {useTheme} from '../../../theme/ThemeContext';

export default function ForecastSection({title, children}: {title: string; children: ReactNode}) {
  const theme = useTheme();
  return (
    <View style={styles.section}>
      <Text style={[styles.title, {color: theme.colors.textPrimary}]}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {marginBottom: 24},
  title: {fontSize: 18, fontWeight: '700', marginBottom: 12, letterSpacing: 0.3},
});
