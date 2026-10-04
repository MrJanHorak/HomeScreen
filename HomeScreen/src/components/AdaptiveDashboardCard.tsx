import React, {useState} from 'react';
import {Text, View} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {useDashboard} from '../context/DashboardContext';
import {useWatchNext} from '../hooks/useWatchNext';
import useCompactTVLayout from '../hooks/useCompactTVLayout';
import {useTheme} from '../theme/ThemeContext';
import {CARD_LABELS} from '../theme/appearance';
import type {CardId} from '../theme/appearance';
import {activityLayout, activitySummaryHeight, cardTypography, lineKey, planCardContent, type CardPresentation} from '../helpers/cardContentLayout';
import WatchPoster from './tv/WatchPoster';
import TVProgressRing from './activityCard/TVProgressRing';
import ActivityStats from './activityCard/ActivityStats';
import ActivityWeeklyCard, {ActivityWeeklySummary} from './activityCard/ActivityWeeklyCard';

type Icon = React.ComponentProps<typeof MaterialCommunityIcons>['name'];
const icons: Record<CardId, Icon> = {weather: 'weather-partly-cloudy', schedule: 'calendar-month-outline', activity: 'heart-pulse', media: 'play-circle-outline', meal: 'silverware-fork-knife', todo: 'checkbox-marked-circle-outline'};
type Line = {title: string; detail?: string; compactDetail?: string; icon?: Icon; posterUri?: string | null};
function weatherIcon(condition: string): Icon {
  const value = condition.toLowerCase();
  if (value.includes('rain') || value.includes('drizzle')) return 'weather-rainy';
  if (value.includes('snow')) return 'weather-snowy';
  if (value.includes('thunder')) return 'weather-lightning';
  if (value.includes('cloud')) return 'weather-cloudy';
  if (value.includes('fog') || value.includes('mist')) return 'weather-fog';
  return value.includes('clear') ? 'weather-sunny' : 'weather-partly-cloudy';
}
function Progress({value}: {value: number}) {
  const theme = useTheme();
  const percent = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return <View accessibilityRole="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}
    style={{height: 5, borderRadius: 3, backgroundColor: theme.colors.glassChip, overflow: 'hidden'}}>
    <View style={{width: `${percent}%`, height: '100%', backgroundColor: theme.colors.focusRing}} />
  </View>;
}
function Header({id, scale, height, badge}: {id: CardId; scale: number; height: number; badge?: string}) {
  const theme = useTheme();
  return <View style={{height, flexShrink: 0, flexDirection: 'row', alignItems: 'center', gap: 6 * scale}}>
    <MaterialCommunityIcons name={icons[id]} size={15 * scale} color={theme.colors.focusRing} />
    <Text numberOfLines={1} style={{flex: 1, color: theme.colors.textPrimary, fontSize: 12 * scale, lineHeight: 16 * scale, fontWeight: '700'}}>{CARD_LABELS[id]}</Text>
    {badge && <Text numberOfLines={1} style={{maxWidth: '48%', color: theme.colors.textSecondary, fontSize: 10 * scale, lineHeight: 13 * scale}}>{badge}</Text>}
  </View>;
}

/** Fit actual content before decorations or the details hint. */
function Content({id, width, height, title, subtitle, lines = [], badge, extra, extraHeight = 0, art, artWidth = 0, artHeight = 0, presentation = 'standard'}: {
  id: CardId; width: number; height: number; title: string; subtitle?: string; lines?: Line[]; badge?: string;
  extra?: React.ReactNode; extraHeight?: number; art?: React.ReactNode; artWidth?: number; artHeight?: number;
  presentation?: CardPresentation;
}) {
  const theme = useTheme();
  const scale = useCompactTVLayout() ? 1 : 1.4;
  const [measuredHero, setMeasuredHero] = useState<{key: string; height: number} | null>(null);
  const [measurements, setMeasurements] = useState<Record<string, number>>({});
  const key = JSON.stringify([id, width, height, scale, title, subtitle, artWidth, artHeight, extraHeight, presentation]);
  const plan = planCardContent({width, height, scale, title, subtitle, lines, artWidth, artHeight, extraHeight,
    measuredHero: measuredHero?.key === key ? measuredHero.height : undefined, measurements, presentation});
  const dense = plan.density === 'compact';
  const visible = lines.slice(0, plan.count);
  const groups = Array.from({length: Math.ceil(visible.length / plan.columns)}, (_, i) => visible.slice(i * plan.columns, (i + 1) * plan.columns));
  const hidden = lines.length - plan.count;
  return <View testID={`adaptive-${id}`} style={{height, width, minWidth: 0, overflow: 'hidden'}}>
    <View testID="card-hero" style={{gap: plan.gap, flexShrink: 0}} onLayout={({nativeEvent: {layout}}) =>
      setMeasuredHero((current) => current?.key === key && Math.abs(current.height - layout.height) < 0.5 ? current : {key, height: layout.height})}>
      <Header id={id} scale={scale} height={plan.header} badge={!plan.footer && hidden ? `+${hidden} more` : badge} />
      <View style={{flexDirection: 'row', gap: plan.gap, alignItems: 'center'}}>
        <View style={{flex: 1, minWidth: 0, gap: plan.gap}}>
          <Text numberOfLines={plan.titleLimit} style={{color: theme.colors.textPrimary, fontSize: plan.titleSize, lineHeight: plan.titleSize * 1.2, fontWeight: '700'}}>{title}</Text>
          {subtitle && <Text numberOfLines={plan.subtitleCount || 1} style={{color: theme.colors.textSecondary, fontSize: 11 * scale, lineHeight: plan.subtitleLine}}>{subtitle}</Text>}
        </View>
        {art}
      </View>
      {extra}
    </View>
    <View testID="card-rows" style={{gap: plan.rowGap, marginTop: groups.length ? plan.rowGap : 0}}>
      {groups.map((group, index) => <View key={index} style={{flexDirection: 'row', gap: plan.gap, alignItems: 'flex-start'}}>
        {group.map((line, col) => <View testID="card-row" key={`${col}-${line.title}`} style={{width: plan.cellWidth, flexDirection: 'row', gap: 6 * scale, minWidth: 0}}
          onLayout={({nativeEvent: {layout}}) => {
            const rowKey = lineKey(line, plan.cellWidth, plan.density, scale);
            setMeasurements((current) => Math.abs((current[rowKey] ?? 0) - layout.height) < 0.5 ? current :
              {...Object.fromEntries(Object.entries(current).slice(-199)), [rowKey]: layout.height});
          }}>
          {line.posterUri !== undefined ? <WatchPoster uri={line.posterUri} width={dense ? 18 * scale : plan.posterWidth} height={dense ? 24 * scale : plan.posterHeight} /> :
            <MaterialCommunityIcons name={line.icon || icons[id]} size={13 * scale} color={theme.colors.focusRing} style={{width: 16 * scale, lineHeight: plan.rowLine}} />}
          <View style={{flex: 1, minWidth: 0}}>
            <Text testID="card-row-title" numberOfLines={dense ? 1 : 2} style={{color: theme.colors.textPrimary, fontSize: dense ? 11 * scale : plan.rowSize, lineHeight: plan.rowLine, fontWeight: '600'}}>
              {dense && (line.compactDetail ?? line.detail) ? `${line.compactDetail ?? line.detail} · ${line.title}` : line.title}
            </Text>
            {!dense && line.detail && <Text numberOfLines={1} style={{color: theme.colors.textSecondary, fontSize: plan.detailSize, lineHeight: plan.detailLine, marginTop: 2 * scale}}>{line.detail}</Text>}
          </View>
        </View>)}
      </View>)}
    </View>
    {plan.footer && <View style={{position: 'absolute', bottom: 0, left: 0, right: 0}}>
      <Text numberOfLines={1} style={{color: theme.colors.textSecondary, fontSize: 10 * scale, lineHeight: 14 * scale}}>{hidden ? `+${hidden} more · Open details ↗` : 'Open details ↗'}</Text>
    </View>}
  </View>;
}
function MediaContent({width, height}: {width: number; height: number}) {
  const {items, status} = useWatchNext();
  const scale = useCompactTVLayout() ? 1 : 1.4;
  const first = items[0];
  const showArt = Boolean(first) && height >= 100 * scale && width >= 180 * scale;
  const artHeight = showArt ? Math.min(120 * scale, height * 0.42) : 0;
  const progress = first?.positionMs != null && first.durationMs != null && first.durationMs > 0 ? first.positionMs / first.durationMs : null;
  const episode = first?.episodeTitle || (first?.season && first?.episode ? `S${first.season} · E${first.episode}` : '');
  const detail = first ? [first.appName, episode].filter(Boolean).join(' · ')
    : status === 'web' ? 'Programs are available on Android TV' : status === 'permission' ? 'Open to enable TV listings access'
      : status === 'loading' ? 'Loading your queue…' : status === 'error' || status === 'unavailable' ? 'Currently unavailable' : 'No unfinished programs';
  const showProgress = progress !== null && height >= 70 * scale;
  return <Content id="media" presentation="media" width={width} height={height} title={first?.title || 'Continue watching'} subtitle={detail} badge={first ? 'Play Next' : undefined}
    artWidth={artHeight * 0.7} artHeight={artHeight} art={showArt ? <WatchPoster uri={first?.posterUri} width={artHeight * 0.7} height={artHeight} /> : undefined}
    extra={showProgress ? <Progress value={progress!} /> : undefined} extraHeight={showProgress ? 5 : 0}
    lines={items.slice(1).map((item) => ({title: item.title, detail: item.appName || undefined,
      posterUri: item.posterUri || null}))} />;
}
function ActivityContent({width, height}: {width: number; height: number}) {
  const health = useDashboard().health;
  const theme = useTheme();
  const scale = useCompactTVLayout() ? 1 : 1.4;
  if (health?.status !== 'ok') return <Content id="activity" width={width} height={height} title="Activity unavailable" subtitle="Open to check your activity connection" />;
  const mode = activityLayout(width, height, scale, Boolean(health.weekly?.length));
  if (mode === 'weekly-wide' || mode === 'weekly-tall') return <ActivityWeeklyCard health={health} width={width} height={height} sideBySide={mode === 'weekly-wide'} />;
  const type = cardTypography(height, scale);
  const progress = health.stepGoal > 0 ? Math.min(1, Math.max(0, health.steps / health.stepGoal)) : 0;
  if (mode === 'ring') {
    const summaryReserve = activitySummaryHeight(height - type.header - type.gap * 2 - 74 * scale, scale, Boolean(health.weekly?.length));
    const ringSize = Math.min(82 * scale, width * 0.3, height - type.header - type.gap - 17 * scale,
      summaryReserve ? height - type.header - type.gap * 2 - summaryReserve - 16 * scale : Infinity);
    const summaryHeight = activitySummaryHeight(height - type.header - type.gap * 2 - Math.max(ringSize + 16 * scale, 74 * scale), scale, Boolean(health.weekly?.length));
    return <View testID="adaptive-activity" style={{height, width, gap: type.gap, overflow: 'hidden'}}>
      <Header id="activity" scale={scale} height={type.header} />
      <View style={{flexDirection: 'row', alignItems: 'center', gap: 6 * scale}}>
        <View style={{width: ringSize + 12 * scale, alignItems: 'center', gap: 3 * scale}}>
          <TVProgressRing progress={progress} size={ringSize} strokeWidth={6 * scale} />
          <Text numberOfLines={1} style={{color: theme.colors.textSecondary, fontSize: 10 * scale, lineHeight: 13 * scale}}>Goal {health.stepGoal.toLocaleString()}</Text>
        </View>
        <View style={{flex: 1, minWidth: 0}}><ActivityStats steps={health.steps} distance={health.distance} calories={health.calories}
          activeMinutes={health.activeMinutes} estimatedRestingCalories={health.estimatedRestingCalories} dense /></View>
      </View>
      {summaryHeight > 0 && <ActivityWeeklySummary weekly={health.weekly!} scale={scale} showAverage={summaryHeight >= 62 * scale} />}
    </View>;
  }
  const stats: {text: string; icon: Icon; color: string}[] = [
    {text: `${health.steps.toLocaleString()} steps`, icon: 'walk', color: '#38BDF8'},
    {text: `${health.distance.toFixed(1)} km`, icon: 'map-marker-distance', color: '#34D399'},
    {text: `${health.activeMinutes ?? '—'} move min`, icon: 'timer-outline', color: '#FBBF24'},
    {text: `${Math.round(health.calories).toLocaleString()} ${health.estimatedRestingCalories ? 'est. ' : ''}kcal`, icon: 'lightning-bolt', color: '#F87171'},
  ];
  const showProgress = height >= type.header + type.gap * 2 + (width >= 165 * scale ? 36 : 76) * scale + 5;
  const summaryHeight = activitySummaryHeight(height - type.header - type.gap * 2 - (width >= 165 * scale ? 36 : 76) * scale - (showProgress ? 5 + type.gap : 0), scale, Boolean(health.weekly?.length));
  return <View testID="adaptive-activity" style={{height, width, gap: type.gap, overflow: 'hidden'}}>
    <Header id="activity" scale={scale} height={type.header} badge={`Goal ${health.stepGoal.toLocaleString()}`} />
    <View style={{flexDirection: 'row', flexWrap: 'wrap', rowGap: 4 * scale, columnGap: 6 * scale}}>
      {stats.map((stat) => <View key={stat.icon} testID="activity-metric" style={{width: width >= 165 * scale ? (width - 6 * scale) / 2 : width, flexDirection: 'row', alignItems: 'center', gap: 3 * scale}}>
        <MaterialCommunityIcons name={stat.icon} size={13 * scale} color={stat.color} />
        <Text numberOfLines={1} style={{flex: 1, color: theme.colors.textPrimary, fontSize: 11 * scale, lineHeight: 16 * scale, fontWeight: '600'}}>{stat.text}</Text>
      </View>)}
    </View>
    {showProgress && <Progress value={progress} />}
    {summaryHeight > 0 && <ActivityWeeklySummary weekly={health.weekly!} scale={scale} showAverage={summaryHeight >= 62 * scale} />}
  </View>;
}

/** The canvas and automatic rows use the same content-fitting rules. */
export default function AdaptiveDashboardCard({id, width, height}: {id: CardId; width: number; height: number}) {
  const data = useDashboard();
  const theme = useTheme();
  const scale = useCompactTVLayout() ? 1 : 1.4;
  const props = {id, width, height};
  if (id === 'media') return <MediaContent width={width} height={height} />;
  if (data.isLoading) return <Content {...props} title="Loading…" subtitle="Your dashboard is updating" />;
  if (id === 'activity') return <ActivityContent width={width} height={height} />;
  if (id === 'schedule') {
    const first = data.schedule[0] || data.upcomingEvents[0];
    const following = data.schedule.length ? [...data.schedule.slice(1), ...data.upcomingEvents] : data.upcomingEvents.slice(1);
    const eventTime = (event: typeof first) => `${event.time}${event.endTime && event.endTime !== event.time ? ` – ${event.endTime}` : ''}`;
    const eventDetail = (event: typeof first) => event ? [event.date?.slice(5), eventTime(event), event.category].filter(Boolean).join(' · ') : '';
    return <Content {...props} title={first?.title || 'No events planned'} subtitle={first ? eventDetail(first) : 'A little room in your day'}
      badge={data.schedule.length ? `${data.schedule.length} today` : first ? 'Next up' : 'No events today'} lines={following.map((event) => ({title: event.title, detail: eventDetail(event), compactDetail: [event.date?.slice(5), event.time].filter(Boolean).join(' · ')}))} />;
  }
  if (id === 'todo') {
    const pending = data.tasks.filter((task) => !task.completed);
    return <Content {...props} title={pending.length ? `${pending.length} task${pending.length === 1 ? '' : 's'} to do` : 'All caught up'} subtitle={pending.length ? undefined : 'Nothing pending'}
      lines={pending.map((task) => ({title: task.title, detail: task.due ? `Due ${task.due.slice(0, 10)}` : undefined, icon: 'checkbox-blank-circle-outline'}))} />;
  }
  if (id === 'meal') {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const meals = data.meals.items.filter((meal) => meal.date >= today).sort((a, b) => a.date.localeCompare(b.date));
    const first = meals[0];
    const detail = (meal: typeof first) => [meal.date === today ? 'Tonight' : meal.date.slice(5), meal.servings ? `Serves ${meal.servings}` : '', meal.cook ? `Cook: ${meal.cook}` : ''].filter(Boolean).join(' · ');
    return <Content {...props} presentation="meal" title={first?.title || (data.meals.status === 'not_connected' ? 'Connect a meal sheet' : data.meals.status === 'unavailable' ? 'Meals unavailable' : 'No dinners planned')}
      subtitle={first ? detail(first) : data.meals.message || 'Open meal planner to check your connection'} badge="Dinner plan"
      lines={first ? [
        ...meals.slice(1).map((meal) => ({title: meal.title, detail: detail(meal), compactDetail: meal.date.slice(5)})),
        ...(first.side ? [{title: first.side, detail: 'On the side'}] : []),
        ...(first.note ? [{title: first.note, icon: 'note-text-outline' as Icon}] : []),
      ] : []} />;
  }
  const weather = data.weather;
  const temp = weather?.temp ?? '--';
  const showIcon = height >= 115 * scale && width >= 240 * scale;
  const iconSize = showIcon ? 34 * scale : 0;
  return <Content {...props} title={`${temp.includes('°') ? temp : `${temp}°`} · ${weather?.condition || 'Unavailable'}`}
    subtitle={[data.activeLocation.name, weather?.high !== undefined ? `H ${Math.round(weather.high)}° · L ${Math.round(weather.low ?? weather.high)}°` : ''].filter(Boolean).join(' · ')}
    artWidth={iconSize} artHeight={iconSize} art={showIcon ? <MaterialCommunityIcons name={weatherIcon(weather?.condition || '')} size={iconSize} color={theme.colors.focusRing} /> : undefined}
    lines={[
      ...(weather?.feelsLike !== undefined ? [{title: `Feels like ${Math.round(weather.feelsLike)}°`, icon: 'thermometer' as Icon}] : []),
      ...(weather?.humidity !== undefined ? [{title: `${weather.humidity}% humidity`, icon: 'water-percent' as Icon}] : []),
      ...(weather?.windSpeed !== undefined ? [{title: `${weather.windSpeed} mph wind${weather.windDirection ? ` · ${weather.windDirection}` : ''}`, icon: 'weather-windy' as Icon}] : []),
      ...(weather?.forecast || []).map((day) => ({title: `${day.day} · ${Math.round(day.high)}° / ${Math.round(day.low)}°`, detail: day.condition, icon: weatherIcon(day.condition)})),
      ...(weather?.hourly || []).map((hour) => ({title: `${hour.time} · ${hour.temp}`, detail: `${hour.pop} rain`, icon: 'clock-outline' as Icon})),
    ]} />;
}
