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
import {usePeople} from '../../context/PeopleContext';

export type DashboardWidgetId = CardId | `poll_${string}` | `activity_${string}`;

/** Both layouts use the same focusable shell and measure its inner content box. */
interface DashboardCardProps {
  id: DashboardWidgetId;
  widget?: Widget;
  onOpen: (id: DashboardWidgetId) => void;
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
  const {people} = usePeople();
  const kind = widget?.kind || id as CardId;
  const person = people.find((p) => p.id === widget?.personId);
  const activityLabel = widget?.personId ? `Activity for ${person?.name || 'unavailable person'}. Open details` : undefined;
  return (
    <TVCard cardId={kind === 'poll' ? undefined : kind as CardId} widgetStyle={widget?.style} style={style}
      accessibilityLabel={label || activityLabel || `${CARD_LABELS[kind as CardId]}. Open details`}
      onPress={() => onOpen(id)}>
      <View style={{flex: 1, minHeight: 0, minWidth: 0}}
        onLayout={({nativeEvent: {layout}}) => setSize((current) =>
          current.width === layout.width && current.height === layout.height
            ? current : {width: layout.width, height: layout.height})}>
        {size.width > 0 && size.height > 0 && (widget?.kind === 'poll' ? <PollDashboardCard widget={widget} {...size}/> : <AdaptiveDashboardCard id={kind as CardId} personId={widget?.personId} {...size} />)}
      </View>
    </TVCard>
  );
}
