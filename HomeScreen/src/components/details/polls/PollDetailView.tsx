import Text from '../../shared/ReadingText';
import {ScrollView, View} from 'react-native';
import {usePolls} from '../../../context/PollsContext';
import {useTheme} from '../../../theme/ThemeContext';
import useTVClock from '../../../hooks/useTVClock';
import {PollJoinQR, PollResultRow, pollDeadline} from '../../dashboard/polls/PollParts';
import {companionSiteUrl} from '../../../services/companionSite';

export default function PollDetailView({roundId}: {roundId: string}) {
  const {rounds, stale, loading, offsetMs} = usePolls(); const poll = rounds[roundId]; const theme = useTheme();
  const now = useTVClock() + offsetMs; const open = poll?.state === 'open' && (poll.endsAtMs === null || now < poll.endsAtMs);
  const ink = {color: theme.colors.textPrimary};
  if (!poll) return <View style={{gap: 20}}><Text style={[ink, {fontSize: 28}]}>{loading ? 'Loading poll…' : 'This poll is unavailable.'}</Text>
    <Text style={[ink, {fontSize: 20}]}>Manage saved polls in the companion site.</Text>
    {companionSiteUrl('/polls') && <PollJoinQR url={companionSiteUrl('/polls')!} size={240} label="Manage polls"/>}</View>;
  const results = poll.results || []; const maximum = Math.max(0, ...results.map((r) => r.count)); const leaders = results.filter((r) => maximum && r.count === maximum);
  return <ScrollView contentContainerStyle={{gap: 20, padding: 12}}>
    <Text style={[ink, {fontSize: 32, fontWeight: '700'}]}>{poll.question}</Text>
    {!!poll.description && <Text style={[ink, {fontSize: 20}]}>{poll.description}</Text>}
    <Text style={[ink, {fontSize: 20}]}>{pollDeadline(poll, now)} · {poll.timeZone}{poll.results !== null ? ` · ${poll.total} votes` : ''}</Text>
    {stale && <Text style={[ink, {fontSize: 18}]}>Results may be out of date.</Text>}
    {!open && poll.state === 'open' && <Text style={[ink, {fontSize: 18}]}>Final results syncing…</Text>}
    {!open && poll.total > 0 && poll.answerMode !== 'written' && <Text style={[ink, {fontSize: 24}]}>{leaders.length === 1 ? `Winner: ${leaders[0].label}` : leaders.length > 1 ? `Tie: ${leaders.map((r) => r.label).join(', ')}` : ''}</Text>}
    <View style={{flexDirection: 'row', gap: 40, alignItems: 'flex-start'}}>
      <View style={{flex: 1, gap: 12}}>
        {poll.results === null ? <Text style={[ink, {fontSize: 22}]}>Results will be revealed when voting closes.</Text> :
          results.map((r) => <PollResultRow key={r.id} result={r} total={poll.total} height={60} scale={1.4}/>)}
        {!!poll.pendingCount && <Text style={[ink, {fontSize: 18}]}>{poll.pendingCount} written responses awaiting review</Text>}
        {poll.results !== null && poll.total === 0 && <Text style={[ink, {fontSize: 22}]}>Waiting for the first vote.</Text>}
      </View>
      {open && poll.joinUrl && <View style={{gap: 14, alignItems: 'center'}}><PollJoinQR url={poll.joinUrl} size={280}/><Text style={[ink, {fontSize: 18}]}>Enter your name and one vote</Text></View>}
    </View>
  </ScrollView>;
}
