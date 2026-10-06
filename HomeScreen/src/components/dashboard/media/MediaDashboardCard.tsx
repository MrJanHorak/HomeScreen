import { useWatchNext } from '../../../hooks/useWatchNext';
import type { WatchNextItem } from '../../../hooks/useWatchNext';
import useCompactTVLayout from '../../../hooks/useCompactTVLayout';
import WatchPoster from '../../shared/WatchPoster';
import CardContent from '../shared/CardContent';
import CardProgress from '../shared/CardProgress';
import type { CardDimensions } from '../shared/types';
import {View} from 'react-native';
import {mediaArtworkLayout} from './mediaArtworkLayout';

function queueMessage(
  status: ReturnType<typeof useWatchNext>['status'],
): string {
  if (status === 'web') return 'Programs are available on Android TV';
  if (status === 'permission') return 'Open to enable TV listings access';
  if (status === 'loading') return 'Loading your queue…';
  if (status === 'error' || status === 'unavailable')
    return 'Currently unavailable';
  return 'No unfinished programs';
}

function programDetail(program: WatchNextItem): string {
  const episode =
    program.episodeTitle ||
    (program.season && program.episode
      ? `S${program.season} · E${program.episode}`
      : '');
  return [program.appName, episode].filter(Boolean).join(' · ');
}

export default function MediaDashboardCard({ width, height }: CardDimensions) {
  const { items, status } = useWatchNext();
  const scale = useCompactTVLayout() ? 1 : 1.4;
  const first = items[0];
  const {artHeight, artWidth} = first ? mediaArtworkLayout(width, height, scale) : {artHeight:0,artWidth:0};
  const showArt = artHeight > 0;
  const progress =
    first?.positionMs != null &&
    first.durationMs != null &&
    first.durationMs > 0
      ? first.positionMs / first.durationMs
      : null;
  const showProgress = progress !== null && height >= 70 * scale;

  return (
    <CardContent
      id='media'
      presentation='media'
      width={width}
      height={height}
      title={first?.title || 'Continue watching'}
      subtitle={first ? programDetail(first) : queueMessage(status)}
      badge={first ? 'Play Next' : undefined}
      artWidth={artWidth}
      artHeight={artHeight}
      artLeading
      art={
        showArt ? (
          <View testID='media-art'>
          <WatchPoster
            uri={first?.posterUri}
            width={artWidth}
            height={artHeight}
          />
          </View>
        ) : undefined
      }
      extra={
        showProgress && progress !== null ? (
          <View testID='media-progress' style={{width:'100%', maxWidth:220 * scale}}><CardProgress value={progress} /></View>
        ) : undefined
      }
      extraHeight={showProgress ? 5 : 0}
      lines={items.slice(1).map((item) => ({
        title: item.title,
        detail: item.appName || undefined,
        posterUri: item.posterUri || null,
        section: 'Up next',
      }))}
    />
  );
}
