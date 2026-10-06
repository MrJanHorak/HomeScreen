import {StyleSheet, View} from 'react-native';
import type {CardId, CardPreference, DashboardAppearance} from '../../theme/appearance';
import {getCardRows} from '../../theme/appearance';
import useCompactTVLayout from '../../hooks/useCompactTVLayout';
import DashboardCard from './DashboardCard';
import DashboardGrid from './DashboardGrid';

export default function DashboardLayout({cards, grid, onOpen}: {
  cards: CardPreference[];
  grid: DashboardAppearance['grid'];
  onOpen: (id: CardId) => void;
}) {
  const compact = useCompactTVLayout();
  const rows = getCardRows(cards);
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
