import Text from '../../shared/ReadingText';
import { View} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import {useTheme} from '../../../theme/ThemeContext';
import type {PollView, PollResult} from '../../../../../server/functions/src/utils/polls';

export function pollDeadline(poll: PollView, now: number) {
  if (poll.state === 'archived') return 'Archived';
  if (poll.state === 'closed' || poll.endsAtMs !== null && now >= poll.endsAtMs) return 'Closed';
  if (poll.endsAtMs === null) return 'Open · no closing time';
  return `Closes ${new Intl.DateTimeFormat('en-US', {timeZone: poll.timeZone, month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'}).format(poll.endsAtMs)}`;
}
export function PollJoinQR({url, size, scale = 1, label = 'Scan to vote'}: {url: string; size: number; scale?: number; label?: string}) {
  const theme = useTheme();
  const padding = Math.max(12 * scale, size * .12);
  return <View testID="poll-qr" style={{width: size, alignItems: 'center', gap: 5 * scale}}>
    <View style={{width: size, height: size, padding, backgroundColor: '#FFFFFF', borderRadius: 10 * scale}}>
      <QRCode value={url} size={size - padding * 2} color="#111111" backgroundColor="#FFFFFF" ecl="M" quietZone={0}/>
    </View><Text style={{color: theme.colors.textPrimary, fontSize: 12 * scale, lineHeight: 15 * scale}}>{label}</Text>
  </View>;
}
export function PollResultRow({result, total, height, scale = 1, accent}: {result: PollResult; total: number; height: number; scale?: number; accent?: string}) {
  const theme = useTheme(); const percent = total ? Math.round(result.count / total * 100) : 0;
  return <View testID="poll-result" accessibilityLabel={`${result.label}, ${result.count} votes, ${percent} percent`}
    style={{height, gap: 6 * scale, minWidth: 0}}>
    <View style={{flexDirection: 'row', gap: 8 * scale, alignItems: 'center'}}>
      <Text numberOfLines={1} style={{flex: 1, color: theme.colors.textPrimary, fontSize: 14 * scale, lineHeight: 18 * scale}}>{result.label}</Text>
      <Text style={{color: theme.colors.textSecondary, fontSize: 12 * scale, lineHeight: 18 * scale}}>{result.count} · {percent}%</Text>
    </View><View style={{height: 7 * scale, backgroundColor: theme.colors.glassChip, borderRadius: 4 * scale, overflow: 'hidden'}}>
      <View style={{height: '100%', width: `${percent}%`, backgroundColor: accent || theme.colors.focusRing}}/>
    </View>
  </View>;
}
