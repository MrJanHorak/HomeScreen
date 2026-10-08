import {StyleSheet, View} from 'react-native';
import type {CardId, CardPreference, DashboardAppearance} from '../../theme/appearance';
import {getCardRows} from '../../theme/appearance';
import useCompactTVLayout from '../../hooks/useCompactTVLayout';
import DashboardCard from './DashboardCard';
import type {DashboardWidgetId} from './DashboardCard';
import DashboardGrid from './DashboardGrid';
import {widgetRows, widgetRowWidths} from '../../../../server/functions/src/utils/widgets';
import type {WidgetLayout} from '../../../../server/functions/src/utils/widgets';
import {gridRect} from '../../../../server/functions/src/utils/dashboardLayout';
import {useState} from 'react';

export default function DashboardLayout({cards, grid, widgetLayout, onOpen}: {
  cards: CardPreference[];
  grid: DashboardAppearance['grid'];
  widgetLayout?: WidgetLayout | null;
  onOpen: (id: DashboardWidgetId) => void;
}) {
  const compact = useCompactTVLayout();
  const [area, setArea] = useState({width: 0, height: 0});
  const rows = getCardRows(cards);
  if (widgetLayout) return <View style={[styles.rows, compact && styles.compactRows]}>
    {widgetLayout.grid ? <View style={{flex: 1}} onLayout={({nativeEvent: {layout}}) => setArea({width: layout.width, height: layout.height})}>
      {area.width > 0 && [...widgetLayout.grid.items].sort((a, b) => a.y - b.y || a.x - b.x).map((item) => {
        const widget = widgetLayout.widgets.find((w) => w.id === item.id)!;
          return <DashboardCard key={item.id} id={item.id as DashboardWidgetId} widget={widget} onOpen={onOpen}
          style={{position: 'absolute', ...gridRect(item, area.width, area.height, compact ? 8 : 12), padding: compact ? 12 : 20, minHeight: 0, justifyContent: 'flex-start'}}/>;
      })}
    </View> : widgetRows(widgetLayout.widgets).map((row, index) => <View key={index} style={[styles.row, compact && styles.compactRow]}>
      {row.map((widget, column) => <DashboardCard key={widget.id} id={widget.id as DashboardWidgetId} widget={widget} onOpen={onOpen} style={{flex: widgetRowWidths(row)[column], height: '100%'}}/>)}
    </View>)}
  </View>;
  return (
    <View style={[styles.rows, compact && styles.compactRows]}>
      {grid ? <DashboardGrid grid={grid} onOpen={onOpen} /> : rows.map((row, index) => (
        <View key={index} style={[styles.row, compact && styles.compactRow,
          {flex: index === 0 && rows.length > 1 ? 1.2 : 1}]}>
          {row.map((card) => (
            <DashboardCard key={card.id} id={card.id} onOpen={onOpen}
              style={{flex: card.size === 'wide' ? 2 : 1, height: '100%'}} />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  rows: {flex: 1, gap: 20, marginVertical: 18},
  row: {flex: 1, flexDirection: 'row', gap: 20},
  compactRows: {gap: 12, marginVertical: 8},
  compactRow: {gap: 12, minHeight: 0},
});
