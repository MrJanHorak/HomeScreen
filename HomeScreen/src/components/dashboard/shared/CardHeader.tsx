import { Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../../theme/ThemeContext';
import { CARD_LABELS } from '../../../theme/appearance';
import type { CardId } from '../../../theme/appearance';
import type { DashboardIcon } from './types';

export const CARD_ICONS: Record<CardId, DashboardIcon> = {
  weather: 'weather-partly-cloudy',
  schedule: 'calendar-month-outline',
  activity: 'heart-pulse',
  media: 'play-circle-outline',
  meal: 'silverware-fork-knife',
  todo: 'checkbox-marked-circle-outline',
};

interface CardHeaderProps {
  id: CardId;
  scale: number;
  height: number;
  badge?: string;
}

export default function CardHeader({
  id,
  scale,
  height,
  badge,
}: CardHeaderProps) {
  const theme = useTheme();
  return (
    <View
      style={{
        height,
        flexShrink: 0,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6 * scale,
      }}
    >
      <MaterialCommunityIcons
        name={CARD_ICONS[id]}
        size={15 * scale}
        color={theme.colors.focusRing}
      />
      <Text
        numberOfLines={1}
        style={{
          flex: 1,
          color: theme.colors.textPrimary,
          fontSize: 12 * scale,
          lineHeight: 16 * scale,
          fontWeight: '700',
        }}
      >
        {CARD_LABELS[id]}
      </Text>
      {badge && (
        <Text
          numberOfLines={1}
          style={{
            maxWidth: '48%',
            color: theme.colors.textSecondary,
            fontSize: 10 * scale,
            lineHeight: 13 * scale,
          }}
        >
          {badge}
        </Text>
      )}
    </View>
  );
}
