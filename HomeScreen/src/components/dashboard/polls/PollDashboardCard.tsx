import Text from '../../shared/ReadingText';
import { View} from 'react-native';
import {usePolls} from '../../../context/PollsContext';
import {useTheme} from '../../../theme/ThemeContext';
import useCompactTVLayout from '../../../hooks/useCompactTVLayout';
import useTVClock from '../../../hooks/useTVClock';
import CardHeader from '../shared/CardHeader';
import {pollCardLayout} from './pollCardLayout';
import {PollJoinQR, PollResultRow, pollDeadline} from './PollParts';
import type {Widget} from '../../../../../server/functions/src/utils/widgets';

export default function PollDashboardCard({widget, width, height}: {widget: Widget; width: number; height: number}) {
  const {rounds, stale, loading, offsetMs} = usePolls(); const poll = rounds[widget.roundId || ''];
  const theme = useTheme(); const scale = useCompactTVLayout() ? 1 : 1.4;
  const now = useTVClock() + offsetMs;
  const question = poll?.question || (loading ? 'Loading poll…' : 'Poll unavailable');
  const closed = poll && (poll.state !== 'open' || poll.endsAtMs !== null && now >= poll.endsAtMs);
  const plan = pollCardLayout(width, height, scale, question, !!poll?.joinUrl && !closed, widget.presentation);
  const results = poll?.results || [];
  const max = Math.max(0, ...results.map((r) => r.count));
  const leaders = results.filter((r) => max > 0 && r.count === max);
  const status = !poll ? 'Open details to manage polls' : stale ? 'Results may be out of date' :
    closed ? `${poll.state === 'open' ? 'Final results syncing' : 'Closed'} · ${poll.total} votes${leaders.length > 1 ? ' · Tie' : ''}` :
      `${poll.results === null ? 'Results hidden until close' : `${poll.total} ${poll.total === 1 ? 'vote' : 'votes'}`} · ${pollDeadline(poll, now)}`;
  return <View testID="adaptive-poll" style={{width, height, overflow: 'hidden', gap: plan.gap}}>
    <CardHeader id="poll" scale={scale} height={18 * scale} badge={closed ? 'Closed' : stale ? 'Offline' : 'Vote'}/>
    <View style={{flexDirection: plan.sideBySide ? 'row' : 'column', gap: plan.sideBySide ? 20 * scale : plan.gap}}>
    <View style={{width: plan.heroWidth, gap: plan.gap}}>
    <Text testID="poll-question" numberOfLines={plan.titleLines} style={{fontSize: plan.titleSize, lineHeight: plan.titleSize * 1.2, fontWeight: '700', color: theme.colors.textPrimary}}>{question}</Text>
    <Text testID="poll-status" numberOfLines={1} style={{fontSize: 11 * scale, lineHeight: 15 * scale, color: theme.colors.textSecondary}}>{status}</Text>
    </View>
    <View testID="poll-body" style={{flexDirection: 'row', gap: 20 * scale, minWidth: 0}}>
      <View style={{width: plan.rowWidth, gap: plan.gap}}>
        {results.slice(0, plan.rows).map((r) => <PollResultRow key={r.id} result={r} total={poll!.total} height={plan.rowHeight} scale={scale} accent={widget.accent}/>)}
      </View>
      {plan.qrSize > 0 && poll?.joinUrl && <PollJoinQR url={poll.joinUrl} size={plan.qrSize} scale={scale}/>}
    </View>
    </View>
    {plan.footer && <Text testID="poll-hint" numberOfLines={1} style={{position: 'absolute', bottom: 0, fontSize: 11 * scale, lineHeight: 14 * scale, color: theme.colors.textSecondary}}>
      {poll?.total === 0 && poll.results !== null ? 'Waiting for the first vote · ' : ''}Select for {closed ? 'results' : 'QR and results'}{results.length > plan.rows ? ` · +${results.length - plan.rows} options` : ''}
    </Text>}
  </View>;
}
