import React, { useState } from 'react';
import { View } from 'react-native';
import { gridRect } from '../../../../server/functions/src/utils/dashboardLayout';
import type { DashboardGridLayout } from '../../../../server/functions/src/utils/dashboardLayout';
import type { CardId } from '../../theme/appearance';
import useCompactTVLayout from '../../hooks/useCompactTVLayout';
import DashboardCard from './DashboardCard';

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
          <DashboardCard key={item.id} id={item.id} onOpen={onOpen}
            style={{ position: 'absolute', ...rect, minHeight: 0, padding, justifyContent: 'flex-start' }}
          />
        );
      })}
    </View>
  );
}
