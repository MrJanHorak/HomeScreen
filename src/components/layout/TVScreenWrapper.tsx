import { View, StyleSheet, ViewStyle } from 'react-native';
import { TVTheme } from '../../theme/tvTheme';

interface TVScreenWrapperProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export default function TVScreenWrapper({
  children,
  style,
}: TVScreenWrapperProps) {
  return <View style={[styles.container, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: TVTheme.colors.background,
    paddingHorizontal: TVTheme.spacing.safeHorizontal,
    paddingVertical: TVTheme.spacing.safeVertical,
  },
});
