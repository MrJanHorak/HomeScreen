import React, { useState } from 'react';
import { View } from 'react-native';
import { gridRect } from '../../../../server/functions/src/utils/dashboardLayout';
import type { DashboardGridLayout } from '../../../../server/functions/src/utils/dashboardLayout';
import type { CardId } from '../../theme/appearance';
import { CARD_LABELS } from '../../theme/appearance';
import useCompactTVLayout from '../../hooks/useCompactTVLayout';
import TVCard from '../shared/TVCard';
import MeasuredDashboardCard from './MeasuredDashboardCard';

export default function DashboardGrid({ grid, onOpen }: {
  grid: DashboardGridLayout;
  onOpen: (id: CardId) => void;
}) {
  const compact = useCompactTVLayout();
  const [size, setSize] = useState({ width: 0, height: 0 });
  return (
    <View style={{ flex: 1 }} onLayout={({ nativeEvent: { layout } }) => setSize({ width: layout.width, height: layout.height })}>
      {size.width > 0 && size.height > 0 && [...grid.items].sort((a, b) => a.y - b.y || a.x - b.x).map((item) => {
        const rect = gridRect(item, size.width, size.height, compact ? 8 : 12);
        const padding = compact ? 12 : 20;
        return (
          <TVCard key={item.id} cardId={item.id} accessibilityLabel={`${CARD_LABELS[item.id]}. Open details`}
            style={{ position: 'absolute', ...rect, minHeight: 0, padding, justifyContent: 'flex-start' }}
            onPress={() => onOpen(item.id)}>
            <MeasuredDashboardCard id={item.id} />
          </TVCard>
        );
      })}
    </View>
  );
}
