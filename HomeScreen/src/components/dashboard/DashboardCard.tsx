import {useState} from 'react';
import {View} from 'react-native';
import type {ViewStyle} from 'react-native';
import type {CardId} from '../../theme/appearance';
import {CARD_LABELS} from '../../theme/appearance';
import TVCard from '../shared/TVCard';
import AdaptiveDashboardCard from './AdaptiveDashboardCard';
import type {Widget} from '../../../../server/functions/src/utils/widgets';
import PollDashboardCard from './polls/PollDashboardCard';
import {usePolls} from '../../context/PollsContext';

/** Both layouts use the same focusable shell and measure its inner content box. */
interface DashboardCardProps {
  id: CardId | `poll_${string}`;
  widget?: Widget;
  onOpen: (id: CardId | `poll_${string}`) => void;
  style: ViewStyle;
}
export default function DashboardCard(props: DashboardCardProps) {
  return props.widget?.kind === 'poll' ? <NamedPollCard {...props}/> : <MeasuredDashboardCard {...props}/>;
}
function NamedPollCard(props: DashboardCardProps) {
  const {rounds} = usePolls();
  const question = rounds[props.widget?.roundId || '']?.question || 'Poll';
  return <MeasuredDashboardCard {...props} label={`${question}. Open poll QR and results`}/>;
}
function MeasuredDashboardCard({id, widget, onOpen, style, label}: DashboardCardProps & {label?: string}) {
  const [size, setSize] = useState({width: 0, height: 0});
  return (
    <TVCard cardId={widget?.kind === 'poll' ? undefined : id as CardId} widgetStyle={widget?.style} style={style}
      accessibilityLabel={label || `${CARD_LABELS[id as CardId]}. Open details`}
      onPress={() => onOpen(id)}>
      <View style={{flex: 1, minHeight: 0, minWidth: 0}}
        onLayout={({nativeEvent: {layout}}) => setSize((current) =>
          current.width === layout.width && current.height === layout.height
            ? current : {width: layout.width, height: layout.height})}>
        {size.width > 0 && size.height > 0 && (widget?.kind === 'poll' ? <PollDashboardCard widget={widget} {...size}/> : <AdaptiveDashboardCard id={id as CardId} {...size} />)}
      </View>
    </TVCard>
  );
}
