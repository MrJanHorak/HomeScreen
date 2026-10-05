import { Text, View } from 'react-native';
import type { LayoutChangeEvent } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../../theme/ThemeContext';
import type { planCardContent } from './cardContentLayout';
import type { CardId } from '../../../theme/appearance';
import WatchPoster from '../../shared/WatchPoster';
import { CARD_ICONS } from './CardHeader';
import type { DashboardLine } from './types';

interface CardContentRowProps {
  id: CardId;
  line: DashboardLine;
  scale: number;
  plan: ReturnType<typeof planCardContent>;
  onMeasure: (line: DashboardLine, height: number) => void;
}

export default function CardContentRow({
  id,
  line,
  scale,
  plan,
  onMeasure,
}: CardContentRowProps) {
  const theme = useTheme();
  const dense = plan.density === 'compact';
  const compactDetail = line.compactDetail ?? line.detail;
  const title =
    dense && compactDetail ? `${compactDetail} · ${line.title}` : line.title;

  function measureRow(event: LayoutChangeEvent) {
    onMeasure(line, event.nativeEvent.layout.height);
  }

  return (
    <View
      testID='card-row'
      onLayout={measureRow}
      style={{
        width: plan.cellWidth,
        flexDirection: 'row',
        gap: 6 * scale,
        minWidth: 0,
      }}
    >
      {line.posterUri !== undefined ? (
        <WatchPoster
          uri={line.posterUri}
          width={dense ? 18 * scale : plan.posterWidth}
          height={dense ? 24 * scale : plan.posterHeight}
        />
      ) : (
        <MaterialCommunityIcons
          name={line.icon || CARD_ICONS[id]}
          size={13 * scale}
          color={theme.colors.focusRing}
          style={{ width: 16 * scale, lineHeight: plan.rowLine }}
        />
      )}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          testID='card-row-title'
          numberOfLines={dense ? 1 : 2}
          style={{
            color: theme.colors.textPrimary,
            fontSize: dense ? 11 * scale : plan.rowSize,
            lineHeight: plan.rowLine,
            fontWeight: '600',
          }}
        >
          {title}
        </Text>
        {!dense && line.detail && (
          <Text
            numberOfLines={1}
            style={{
              color: theme.colors.textSecondary,
              fontSize: plan.detailSize,
              lineHeight: plan.detailLine,
              marginTop: 2 * scale,
            }}
          >
            {line.detail}
          </Text>
        )}
      </View>
    </View>
  );
}
