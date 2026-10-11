import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import DashboardCard from '../src/components/dashboard/DashboardCard';
import FeedDashboardCard from '../src/components/dashboard/feeds/FeedDashboardCard';
import TVDetailModal from '../src/components/shared/TVDetailModal';
import FeedDetailView from '../src/components/details/feeds/FeedDetailView';
import {FixtureProvider} from './fixtureHooks';
import type {FixtureDashboard, FixtureWatch} from './fixtureHooks';
import {DEFAULT_APPEARANCE} from '../src/theme/appearance';
import {DYSLEXIA_READING} from '../../server/functions/src/utils/reading';
import {FEED_PRESETS} from '../../server/functions/src/utils/feedConfig';
import type {FeedResult} from '../../server/functions/src/utils/feedConfig';
import {legacyWidgetProjection} from '../../server/functions/src/utils/widgets';
import type {WidgetLayout} from '../../server/functions/src/utils/widgets';
import {NarrationProvider} from '../src/accessibility/NarrationContext';
import {gridRect} from '../../server/functions/src/utils/dashboardLayout';

const widget = {id: `feed_${'a'.repeat(32)}` as const, kind: 'feed' as const, feed: {...FEED_PRESETS[0], itemCount: 8 as const}, visible: true, size: 'standard' as const};
const initial: WidgetLayout = {version: 1, grid: null, widgets: [widget]};
const result = (url: string, title: string): FeedResult => ({url, title, stale: false, error: null, updatedAtMs: Date.now(),
  articles: Array.from({length: 8}, (_, i) => ({id: `${title}${i}`, title: i === 0 ? `${title}: Researchers unveil a new way to explore the universe with a remarkably detailed survey` : `${title}: Story ${i + 1}`,
    summary: 'A readable summary supplied by the publisher. The full article is available by scanning the QR code on your phone.',
    content: Array.from({length: 24}, (_, paragraph) => `Paragraph ${paragraph + 1}. A readable article supplied in the feed. This discovery opens new possibilities for exploring our universe and understanding the world around us.`).join('\n\n'),
    imageUrl: 'https://images.example.org/story.png', url: 'https://news.example.org/story', publishedAtMs: Date.now() - 3600000}))});
const allFeeds = Object.fromEntries(FEED_PRESETS.map((feed) => [feed.url, result(feed.url, feed.title)]));
function Fixture() {
  const [layout, setLayout] = useState(initial); const [topic, setTopic] = useState<`feed_${string}` | null>(null);
  const [feeds, setFeeds] = useState(allFeeds);
  const params = new URLSearchParams(location.search); const compact = params.get('mode') !== 'full';
  const appearance = {...DEFAULT_APPEARANCE, widgetLayout: layout, ...legacyWidgetProjection(layout), ...(params.has('reading') && {reading: DYSLEXIA_READING})};
  Object.assign(window, {feedFixture: {layout}, updateFeeds: setFeeds});
  const sizes = Array.from({length: 10}, (_, x) => Array.from({length: 5}, (_, y) => ({width: x + 3, height: y + 2}))).flat();
  return <FixtureProvider value={{data: {} as FixtureDashboard, watch: {status: 'unavailable', items: []} as FixtureWatch, compact, appearance, feeds, setWidgetLayout: setLayout}}><NarrationProvider>
    {params.has('matrix') ? <div style={{display: 'flex', flexWrap: 'wrap', gap: 20}}>{sizes.map((size) => {
      const rect = gridRect({id: widget.id, x: 0, y: 0, ...size}, compact ? 900 : 1800, compact ? 460 : 920, 12);
      return <article data-size={`${size.width}x${size.height}`} key={`${size.width}x${size.height}`} style={{padding: 20, border: '1px solid #52627c'}}><FeedDashboardCard widget={widget} width={rect.width - 40} height={rect.height - 40}/></article>;
    })}</div> : <div style={{padding: 30, width: compact ? 450 : 750, height: compact ? 280 : 460}}>
      <DashboardCard id={widget.id} widget={layout.widgets[0]} onOpen={(id) => setTopic(id as `feed_${string}`)} style={{width: '100%', height: '100%'}}/>
      {topic && <TVDetailModal visible title={layout.widgets[0].feed!.title} icon="rss" onClose={() => setTopic(null)}><FeedDetailView widgetId={topic}/></TVDetailModal>}
    </div>}
  </NarrationProvider></FixtureProvider>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
