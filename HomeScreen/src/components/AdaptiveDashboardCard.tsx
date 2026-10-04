import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useDashboard } from '../context/DashboardContext';
import { useWatchNext } from '../hooks/useWatchNext';
import useCompactTVLayout from '../hooks/useCompactTVLayout';
import { useTheme } from '../theme/ThemeContext';
import { CARD_LABELS } from '../theme/appearance';
import type { CardId } from '../theme/appearance';
import WatchPoster from './tv/WatchPoster';
import TVProgressRing from './activityCard/TVProgressRing';
import ActivityStats from './activityCard/ActivityStats';

type Icon = React.ComponentProps<typeof MaterialCommunityIcons>['name'];
const icons: Record<CardId, Icon> = {
  weather: 'weather-partly-cloudy', schedule: 'calendar-month-outline', activity: 'heart-pulse',
  media: 'play-circle-outline', meal: 'silverware-fork-knife', todo: 'checkbox-marked-circle-outline',
};
type Line = {title: string; detail?: string; icon?: Icon; posterUri?: string | null};

function weatherIcon(condition: string): Icon {
  const value = condition.toLowerCase();
  if (value.includes('rain') || value.includes('drizzle')) return 'weather-rainy';
  if (value.includes('snow')) return 'weather-snowy';
  if (value.includes('thunder')) return 'weather-lightning';
  if (value.includes('cloud')) return 'weather-cloudy';
  if (value.includes('fog') || value.includes('mist')) return 'weather-fog';
  if (value.includes('clear')) return 'weather-sunny';
  return 'weather-partly-cloudy';
}

function Progress({ value }: {value: number}) {
  const theme = useTheme();
  return <View accessibilityRole="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(Math.max(0, Math.min(1, value)) * 100)}
    style={{ height: 5, borderRadius: 3, backgroundColor: theme.colors.glassChip, overflow: 'hidden', marginTop: 5 }}>
    <View style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, height: '100%', backgroundColor: theme.colors.focusRing }} />
  </View>;
}

function Content({ id, width, height, title, subtitle, lines = [], badge, visual, extra, reserved = 0, heroArt, dense = false }: {
  id: CardId; width: number; height: number; title: string; subtitle?: string;
  lines?: Line[]; badge?: string; visual?: React.ReactNode; extra?: React.ReactNode; reserved?: number;
  heroArt?: React.ReactNode; dense?: boolean;
}) {
  const theme = useTheme();
  const compact = useCompactTVLayout();
  const scale = compact ? 1 : 1.4;
  const tight = height < 120 * scale;
  const gap = tight ? 4 : 9 * scale;
  const titleSize = (tight ? 16 : 21) * scale;
  const labelSize = (tight ? 10 : 12) * scale;
  const [measuredHero, setMeasuredHero] = useState<{key: string; height: number} | null>(null);
  const [rowHeights, setRowHeights] = useState<Record<string, number>>({});
  const measureKey = `${width}:${height}:${title}:${subtitle}:${reserved}:${Boolean(heroArt)}`;
  const fixedHeight = (tight ? 18 : 28) * scale + (subtitle ? (tight ? 15 : 30) * scale : 0) +
    gap * (1 + Number(Boolean(subtitle)) + Number(Boolean(visual)) + Number(Boolean(extra))) + reserved;
  const titleLines = tight ? 1 : Math.max(1, Math.min(3, Math.floor((height - fixedHeight) / (titleSize * 1.2))));
  // Measure the rendered summary: a one-line title should not reserve three lines.
  const heroHeight = measuredHero?.key === measureKey ? measuredHero.height : fixedHeight + titleLines * titleSize * 1.2;
  const rowKey = (line: Line) => `${width}:${scale}:${dense}:${line.title}:${line.detail}`;
  const rowHeight = (line: Line) => rowHeights[rowKey(line)] ??
    (dense ? 16 : line.posterUri !== undefined ? 44 : 30 + (line.detail ? 15 : 0)) * scale;
  let used = gap + (dense ? 0 : gap + 1);
  let count = 0;
  for (const line of lines) {
    const next = rowHeight(line) + (count ? gap : 0);
    if (used + next > height - heroHeight - 3) break;
    used += next;
    count++;
  }
  return <View style={{ height: '100%', gap, minWidth: 0 }}>
    <View style={{ gap }} onLayout={({nativeEvent: {layout}}) => setMeasuredHero((current) =>
      current?.key === measureKey && Math.abs(current.height - layout.height) < 0.5 ? current : {key: measureKey, height: layout.height})}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 * scale }}>
      <View style={{ padding: tight ? 0 : 5 * scale, borderRadius: 8, backgroundColor: tight ? 'transparent' : theme.colors.glassChip }}>
        <MaterialCommunityIcons name={icons[id]} size={(tight ? 13 : 17) * scale} color={theme.colors.focusRing} />
      </View>
      <Text numberOfLines={1} style={{ flex: 1, color: theme.colors.textPrimary, fontSize: labelSize, fontWeight: '700' }}>{CARD_LABELS[id]}</Text>
      {badge && width > 145 * scale && !tight && <Text numberOfLines={1} style={{ color: theme.colors.focusRing, fontSize: 10 * scale }}>{badge}</Text>}
    </View>
    {visual}
    <View style={{ flexDirection: 'row', gap, alignItems: 'center' }}>
      <View style={{ flex: 1, minWidth: 0, gap }}>
        <Text numberOfLines={titleLines} style={{ color: theme.colors.textPrimary, fontSize: titleSize, lineHeight: titleSize * 1.2, fontWeight: '700' }}>{title}</Text>
        {subtitle && <Text numberOfLines={tight ? 1 : 2} style={{ color: theme.colors.textSecondary, fontSize: 11 * scale, lineHeight: 15 * scale }}>{subtitle}</Text>}
      </View>
      {heroArt}
    </View>
    {extra}
    </View>
    {count > 0 && <View style={{ borderTopWidth: dense ? 0 : 1, borderColor: theme.colors.glassBorder, paddingTop: dense ? 0 : gap, gap }}>
      {lines.slice(0, count).map((line, index) => <View key={`${index}-${line.title}`} style={{ flexDirection: 'row', gap: 7 * scale, minWidth: 0 }}
        onLayout={({nativeEvent: {layout}}) => { const key = rowKey(line); setRowHeights((current) =>
          Math.abs((current[key] ?? 0) - layout.height) < 0.5 ? current : {...current, [key]: layout.height}); }}>
        {line.posterUri !== undefined ? <WatchPoster uri={line.posterUri} width={30 * scale} height={44 * scale} /> :
          <MaterialCommunityIcons name={line.icon || icons[id]} size={(dense ? 12 : 14) * scale} color={theme.colors.focusRing}
            style={{ marginTop: dense ? 0 : 2, lineHeight: (dense ? 14 : 16) * scale }} />}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={dense ? 1 : 2} style={{ color: theme.colors.textPrimary, fontSize: (dense ? 11 : 12) * scale, lineHeight: (dense ? 14 : 15) * scale, fontWeight: '600' }}>{line.title}</Text>
          {!dense && line.detail && <Text numberOfLines={1} style={{ color: theme.colors.textSecondary, fontSize: 10 * scale, lineHeight: 12 * scale, marginTop: 2 }}>{line.detail}</Text>}
        </View>
      </View>)}
    </View>}
    {!tight && height - heroHeight - used > 22 * scale && <View style={{ flex: 1, justifyContent: 'flex-end' }}>
      <Text numberOfLines={1} style={{ color: theme.colors.textSecondary, fontSize: 10 * scale }}>{lines.length > count ? `+${lines.length - count} more · Open details ↗` : 'Open details ↗'}</Text>
    </View>}
  </View>;
}

function MediaContent({ width, height }: {width: number; height: number}) {
  const { items, status } = useWatchNext();
  const compact = useCompactTVLayout();
  const first = items[0];
  const scale = compact ? 1 : 1.4;
  const showArt = Boolean(first) && height >= 150 * scale && width >= 145 * scale;
  const artHeight = showArt ? Math.max(64 * scale, Math.min(height * 0.28, 120 * scale)) : 0;
  const progress = first?.positionMs != null && first.durationMs != null && first.durationMs > 0
    ? first.positionMs / first.durationMs : null;
  const detail = first ? [first.appName, first.episodeTitle].filter(Boolean).join(' · ')
    : status === 'web' ? 'Programs are available on Android TV' : status === 'permission' ? 'Open to enable TV listings access'
      : status === 'loading' ? 'Loading your queue…' : status === 'error' || status === 'unavailable' ? 'Currently unavailable' : 'No unfinished programs';
  return <Content id="media" width={width} height={height} title={first?.title || 'Continue watching'} subtitle={detail}
    badge={first ? 'Play Next' : undefined} reserved={showArt ? artHeight - 29 * scale : 0}
    heroArt={showArt ? <WatchPoster uri={first?.posterUri} width={artHeight * 0.75} height={artHeight} /> : undefined}
    extra={progress !== null && height > 100 * scale ? <Progress value={progress} /> : undefined}
    lines={items.slice(1).map((item, index) => ({title: `${index === 0 ? 'Next · ' : ''}${item.title}`, detail: item.appName || undefined,
      posterUri: showArt ? item.posterUri || null : undefined}))} />;
}

/** Height and width both determine how much real information a card can show. */
export default function AdaptiveDashboardCard({ id, width, height }: {id: CardId; width: number; height: number}) {
  const data = useDashboard();
  const theme = useTheme();
  const compact = useCompactTVLayout();
  const props = {id, width, height};
  if (id === 'media') return <MediaContent width={width} height={height} />;
  if (data.isLoading) return <Content {...props} title="Loading…" subtitle="Your dashboard is updating" />;
  if (id === 'schedule') {
    const first = data.schedule[0];
    const following = [...data.schedule.slice(1), ...data.upcomingEvents];
    return <Content {...props} title={first?.title || 'No events today'} subtitle={first ? `${first.time}${first.endTime ? ` – ${first.endTime}` : ''}` : 'A little room in your day'}
      badge={`${data.schedule.length} today`} lines={following.map((event) => ({title: event.title, detail: `${event.date ? `${event.date.slice(5)} · ` : ''}${event.time}`}))} />;
  }
  if (id === 'todo') {
    const pending = data.tasks.filter((task) => !task.completed);
    return <Content {...props} title={pending.length ? `${pending.length} task${pending.length === 1 ? '' : 's'} to do` : 'All caught up'}
      subtitle={pending.length ? undefined : 'Nothing pending'} dense={height < (compact ? 200 : 280)}
      lines={pending.map((task) => ({title: task.title, detail: task.due ? `Due ${task.due.slice(0, 10)}` : undefined, icon: 'checkbox-blank-circle-outline'}))} />;
  }
  if (id === 'meal') {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const meals = data.meals.items.filter((meal) => meal.date >= today).sort((a, b) => a.date.localeCompare(b.date));
    const first = meals[0];
    const details = first ? [first.date === today ? 'Tonight' : first.date, first.servings ? `Serves ${first.servings}` : '', first.cook ? `Cook: ${first.cook}` : ''].filter(Boolean).join(' · ') : 'Open meal planner to check your connection';
    const extraLines: Line[] = first ? [
      ...(first.side ? [{title: first.side, detail: 'On the side'}] : []),
      ...(first.note ? [{title: first.note, icon: 'note-text-outline' as Icon}] : []),
      ...meals.slice(1).map((meal) => ({title: meal.title, detail: meal.date.slice(5)})),
    ] : [];
    return <Content {...props} title={first?.title || (data.meals.status === 'not_connected' ? 'Connect a meal sheet' : data.meals.status === 'unavailable' ? 'Meals unavailable' : 'No dinners planned')}
      subtitle={details} badge={first?.date === today ? 'Tonight' : 'Dinner plan'} lines={extraLines} />;
  }
  if (id === 'weather') {
    const weather = data.weather;
    const temp = weather?.temp || '--';
    const showIcon = height > (compact ? 170 : 240);
    const iconHeight = showIcon ? (compact ? 50 : 75) : 0;
    const details = [data.activeLocation.name, weather?.high !== undefined ? `H ${Math.round(weather.high)}° · L ${Math.round(weather.low ?? weather.high)}°` : ''].filter(Boolean).join(' · ');
    return <Content {...props} title={`${temp.includes('°') ? temp : `${temp}°`} · ${weather?.condition || 'Unavailable'}`} subtitle={details}
      reserved={iconHeight} visual={showIcon ? <MaterialCommunityIcons name={weatherIcon(weather?.condition || '')} size={iconHeight} color={theme.colors.focusRing} /> : undefined}
      lines={[
        ...(weather?.humidity !== undefined ? [{title: `${weather.humidity}% humidity`, icon: 'water-percent' as Icon}] : []),
        ...(weather?.windSpeed !== undefined ? [{title: `${weather.windSpeed} mph wind`, detail: weather.windDirection, icon: 'weather-windy' as Icon}] : []),
        ...(weather?.forecast || []).map((day) => ({title: `${day.day} · ${Math.round(day.high)}° / ${Math.round(day.low)}°`, detail: day.condition, icon: weatherIcon(day.condition)})),
      ]} />;
  }
  const health = data.health;
  if (health?.status !== 'ok') return <Content {...props} title="Activity unavailable" subtitle="Open to check your activity connection" />;
  const progress = health.stepGoal > 0 ? Math.min(1, Math.max(0, health.steps / health.stepGoal)) : 0;
  const scale = compact ? 1 : 1.4;
  const ringSize = height >= 170 * scale && width >= 145 * scale
    ? Math.min(110 * scale, width * 0.34, height * 0.4) : 0;
  return <Content {...props} title={`${health.steps.toLocaleString()} steps`} subtitle={`Goal ${health.stepGoal.toLocaleString()}`}
    reserved={ringSize || 10} extra={ringSize ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 * scale }}>
      <TVProgressRing progress={progress} size={ringSize} strokeWidth={6 * scale} />
      <View style={{flex: 1, minWidth: 0}}><ActivityStats steps={health.steps} distance={health.distance}
        calories={health.calories} activeMinutes={health.activeMinutes} estimatedRestingCalories={health.estimatedRestingCalories} showSteps={false} /></View>
    </View> : height > (compact ? 85 : 120) ? <Progress value={progress} /> : undefined}
    lines={ringSize ? [] : [
      {title: `${health.distance.toFixed(1)} km`, detail: 'Distance', icon: 'map-marker-distance'},
      {title: `${Math.round(health.calories).toLocaleString()} kcal`, detail: 'Calories', icon: 'fire'},
      ...(health.activeMinutes !== null ? [{title: `${health.activeMinutes} min`, detail: 'Active minutes', icon: 'timer-outline' as Icon}] : []),
    ]} />;
}
