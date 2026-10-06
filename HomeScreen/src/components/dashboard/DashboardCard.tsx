import {useState} from 'react';
import {View} from 'react-native';
import type {ViewStyle} from 'react-native';
import type {CardId} from '../../theme/appearance';
import {CARD_LABELS} from '../../theme/appearance';
import TVCard from '../shared/TVCard';
import AdaptiveDashboardCard from './AdaptiveDashboardCard';

/** Both layouts use the same focusable shell and measure its inner content box. */
export default function DashboardCard({id, onOpen, style}: {
  id: CardId;
  onOpen: (id: CardId) => void;
  style: ViewStyle;
}) {
  const [size, setSize] = useState({width: 0, height: 0});
  return (
    <TVCard cardId={id} style={style}
      accessibilityLabel={`${CARD_LABELS[id]}. Open details`}
      onPress={() => onOpen(id)}>
      <View style={{flex: 1, minHeight: 0, minWidth: 0}}
        onLayout={({nativeEvent: {layout}}) => setSize((current) =>
          current.width === layout.width && current.height === layout.height
            ? current : {width: layout.width, height: layout.height})}>
        {size.width > 0 && size.height > 0 && <AdaptiveDashboardCard id={id} {...size} />}
      </View>
    </TVCard>
  );
}
