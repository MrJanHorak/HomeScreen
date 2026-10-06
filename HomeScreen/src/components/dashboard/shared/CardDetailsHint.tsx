import { Text } from 'react-native';
import { useTheme } from '../../../theme/ThemeContext';

/** Display only: the containing TVCard owns the remote-selectable details action. */
export default function CardDetailsHint({ scale, hiddenCount = 0 }: { scale: number; hiddenCount?: number }) {
  const theme = useTheme();
  return <Text numberOfLines={1} style={{ color: theme.colors.textSecondary,
    fontSize: 10 * scale, lineHeight: 14 * scale }}>
    {hiddenCount ? `+${hiddenCount} more · Open details ↗` : 'Open details ↗'}
  </Text>;
}
