import type {ComponentProps} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {useTheme} from '../../../theme/ThemeContext';

interface WeatherMetricProps {
  icon: ComponentProps<typeof MaterialCommunityIcons>['name'];
  color: string;
  label: string;
  value: string;
}

export default function WeatherMetric({icon, color, label, value}: WeatherMetricProps) {
  const theme = useTheme();
  return (
    <View style={styles.tile}>
      <MaterialCommunityIcons name={icon} size={24} color={color} />
      <Text style={[styles.label, {color: theme.colors.textSecondary}]}>{label}</Text>
      <Text style={[styles.value, {color: theme.colors.textPrimary}]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: '47%', paddingVertical: 12, paddingHorizontal: 14, borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.05)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  label: {fontSize: 13, fontWeight: '500', marginTop: 4},
  value: {fontSize: 17, fontWeight: '700', marginTop: 2},
});
