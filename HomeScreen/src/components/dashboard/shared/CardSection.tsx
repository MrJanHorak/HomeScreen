import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '../../../theme/ThemeContext';
import { cardSectionLayout } from './cardSectionLayout';

/** A quiet section boundary; each domain owns its contents and space budget. */
export default function CardSection({ title, caption, scale, children, testID, compact = false }: {
  title: string; caption?: string; scale: number; children: ReactNode; testID?: string; compact?: boolean;
}) {
  const theme = useTheme();
  const layout = cardSectionLayout(compact);
  return (
    <View testID={testID} style={{ borderTopWidth: layout.border * scale, borderTopColor: theme.colors.glassBorder,
      paddingTop: layout.paddingTop * scale, gap: layout.gap * scale, minWidth: 0 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 * scale }}>
        <Text numberOfLines={1} style={{ flex: 1, color: theme.colors.textSecondary,
          fontSize: layout.titleSize * scale, lineHeight: layout.titleLine * scale }}>{title}</Text>
        {caption && <Text numberOfLines={1} style={{ color: theme.colors.textSecondary,
          fontSize: 10 * scale, lineHeight: layout.titleLine * scale }}>{caption}</Text>}
      </View>
      {children}
    </View>
  );
}
