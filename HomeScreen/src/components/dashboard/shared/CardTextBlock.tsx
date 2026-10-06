import { Text, View } from 'react-native';
import type { TextStyle, ViewStyle } from 'react-native';
import { useTheme } from '../../../theme/ThemeContext';

/** A bounded primary/secondary text pair shared by list rows and featured content. */
export default function CardTextBlock({ title, detail, titleSize, titleLine, titleLines = 2,
  detailSize, detailLine, detailGap = 2, weight = '600', titleTestID, style }: {
  title: string; detail?: string; titleSize: number; titleLine: number; titleLines?: number;
  detailSize: number; detailLine: number; detailGap?: number;
  weight?: TextStyle['fontWeight']; titleTestID?: string; style?: ViewStyle;
}) {
  const theme = useTheme();
  return <View style={[{ minWidth: 0 }, style]}>
    <Text testID={titleTestID} numberOfLines={titleLines} style={{ color: theme.colors.textPrimary,
      fontSize: titleSize, lineHeight: titleLine, fontWeight: weight }}>{title}</Text>
    {detail && <Text numberOfLines={1} style={{ color: theme.colors.textSecondary,
      fontSize: detailSize, lineHeight: detailLine, marginTop: detailGap }}>{detail}</Text>}
  </View>;
}
