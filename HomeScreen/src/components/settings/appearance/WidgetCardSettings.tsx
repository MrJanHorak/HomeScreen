import Text from '../../shared/ReadingText';
import {useEffect, useState} from 'react';
import { useWindowDimensions, View} from 'react-native';
import {useAuth} from '../../../context/AuthContext';
import {usePolls} from '../../../context/PollsContext';
import {getAvailableDashboardPolls, getPeopleSettings} from '../../../services/api';
import type {AvailablePoll} from '../../../services/api';
import type {PeopleSettings} from '../../../../../shared/src/people';
import {useAppearance, useTheme} from '../../../theme/ThemeContext';
import {widgetGridFromRows} from '../../../../../server/functions/src/utils/widgets';
import type {Widget} from '../../../../../server/functions/src/utils/widgets';
import {addDashboardWidget, changeWidget, editableWidgetLayout, widgetLabel} from './widgetControls';
import type {WidgetAction} from './widgetControls';
import Option from './AppearanceOption';
import LayoutPreview from './LayoutPreview';
import {styles} from './appearanceStyles';

export default function WidgetCardSettings() {
  const theme = useTheme();
  const {user} = useAuth();
  const {rounds} = usePolls();
  const {appearance, ready, setWidgetLayout, resetAppearance} = useAppearance();
  const sideBySide = useWindowDimensions().width >= 900;
  const [people, setPeople] = useState<PeopleSettings['people']>([]);
  const [polls, setPolls] = useState<AvailablePoll[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [message, setMessage] = useState('');
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let active = true;
    setPeople([]); setPolls([]); setLoadError(''); setLoading(true);
    if (!ready) return () => {active = false;};
    void Promise.allSettled([getPeopleSettings(), getAvailableDashboardPolls()]).then(([peopleResult, pollResult]) => {
      if (!active) return;
      if (peopleResult.status === 'fulfilled') setPeople(peopleResult.value.people);
      if (pollResult.status === 'fulfilled') setPolls(pollResult.value);
      if (peopleResult.status === 'rejected' || pollResult.status === 'rejected') setLoadError('Some available cards could not load. Refresh to try again.');
      setLoading(false);
    });
    return () => {active = false;};
  }, [ready, user?.uid, refresh]);
  const layout = editableWidgetLayout(appearance);
  const labels = [...polls, ...Object.values(rounds).filter((round) => !polls.some((poll) => poll.id === round.id))];
  const label = (widget: Widget) => widgetLabel(widget, people, labels);
  const visibleCount = layout.widgets.filter((widget) => widget.visible).length;
  const positions = [...layout.grid?.items || []].sort((a, b) => a.y - b.y || a.x - b.x);
  const available: Widget[] = [
    ...people.filter((person) => !layout.widgets.some((widget) => widget.personId === person.id))
      .map((person): Widget => ({id: `activity_${person.id}`, kind: 'activity', personId: person.id, visible: true, size: 'standard'})),
    ...polls.filter((poll) => !layout.widgets.some((widget) => widget.roundId === poll.id))
      .map((poll): Widget => ({id: `poll_${poll.id}`, kind: 'poll', roundId: poll.id, visible: true, size: 'standard', presentation: 'auto'})),
  ];
  function run(action: () => void) {
    try {action(); setMessage('');} catch (failure) {setMessage(failure instanceof Error ? failure.message : 'Could not update this card.');}
  }
  function edit(id: string, action: WidgetAction) {run(() => setWidgetLayout(changeWidget(layout, id, action)));}
  const copy = {color: theme.colors.textSecondary};
  const preview = <View style={[styles.livePreviewPanel, {width: sideBySide ? 320 : '100%', borderColor: theme.colors.focusRing, backgroundColor: theme.colors.glassSurface}]}>
    <Text style={[styles.livePreviewTitle, {color: theme.colors.textPrimary}]}>Live dashboard preview</Text>
    <Text style={[styles.livePreviewMeta, copy]}>{visibleCount} of {layout.widgets.length} cards shown</Text>
    <LayoutPreview cards={appearance.cards} appearance={{...appearance, widgetLayout: layout}} label={label} large/>
    <Text style={[styles.livePreviewHint, copy]}>{layout.grid ? 'Positions and sizes use the dashboard’s 12 × 6 grid.' : 'Move, show, or resize a card to update the layout.'}</Text>
  </View>;
  const controls = <View style={[styles.cardList, {flex: sideBySide ? 1 : undefined, width: sideBySide ? undefined : '100%'}]}>
    {layout.widgets.map((widget, index) => {
      const name = label(widget);
      const item = layout.grid?.items.find((entry) => entry.id === widget.id);
      const action = (title: string, change: WidgetAction, disabled = false) => <Option key={title} label={title}
        accessibilityLabel={`${title} ${name}`} disabled={!ready || disabled} onPress={() => edit(widget.id, change)}/>;
      return <View key={widget.id} style={[styles.cardRow, {borderColor: theme.colors.glassBorder}]}>
        <Text style={[styles.cardName, {color: theme.colors.textPrimary}]}>{index + 1}. {name}</Text>
        <View style={styles.cardActions}>
          {!layout.grid && <>{action('Up', {type: 'order', direction: -1}, index === 0)}{action('Down', {type: 'order', direction: 1}, index === layout.widgets.length - 1)}</>}
          <Option label={widget.visible ? 'Shown' : 'Hidden'} selected={widget.visible} accessibilityLabel={`${name} ${widget.visible ? 'shown' : 'hidden'}`}
            disabled={!ready || widget.visible && visibleCount === 1} onPress={() => edit(widget.id, {type: 'visibility'})}/>
          {!layout.grid && action(widget.size === 'wide' ? 'Wide' : 'Standard', {type: 'size'})}
          {item && <>
            {action('Previous spot', {type: 'swap', direction: -1}, positions[0]?.id === widget.id)}
            {action('Next spot', {type: 'swap', direction: 1}, positions[positions.length - 1]?.id === widget.id)}
            {action('Left', {type: 'geometry', field: 'x', amount: -1}, item.x === 0)}
            {action('Right', {type: 'geometry', field: 'x', amount: 1}, item.x + item.width === 12)}
            {action('Up', {type: 'geometry', field: 'y', amount: -1}, item.y === 0)}
            {action('Down', {type: 'geometry', field: 'y', amount: 1}, item.y + item.height === 6)}
            <Text style={copy}>{item.width} × {item.height}</Text>
            {action('Narrower', {type: 'geometry', field: 'width', amount: -1}, item.width === 3)}
            {action('Wider', {type: 'geometry', field: 'width', amount: 1}, item.x + item.width === 12)}
            {action('Shorter', {type: 'geometry', field: 'height', amount: -1}, item.height === 2)}
            {action('Taller', {type: 'geometry', field: 'height', amount: 1}, item.y + item.height === 6)}
          </>}
        </View>
      </View>;
    })}
  </View>;
  return <>
    <Text style={[styles.description, copy]}>Arrange all your dashboard widgets here. Hide a card to keep it available for later.{layout.grid ? ' Use Previous spot or Next spot to swap cards, or the arrows to move into empty space.' : ''}</Text>
    <View style={[styles.options, {marginBottom: 14}]}>
      <Option label='Automatic rows' selected={!layout.grid} disabled={!ready || visibleCount > 8}
        onPress={() => setWidgetLayout({...layout, grid: null})}/>
      <Option label='Free layout' selected={Boolean(layout.grid)} disabled={!ready}
        onPress={() => setWidgetLayout({...layout, grid: layout.grid || widgetGridFromRows(layout.widgets)})}/>
    </View>
    {message && <Text accessibilityRole='alert' style={[styles.description, {color: theme.colors.textPrimary}]}>{message}</Text>}
    <View style={[styles.cardEditor, {flexDirection: sideBySide ? 'row' : 'column'}]}>
      {sideBySide ? <>{controls}{preview}</> : <>{preview}{controls}</>}
    </View>
    <Text style={[styles.heading, {color: theme.colors.textPrimary}]}>Add cards</Text>
    <View style={styles.options}>{available.map((widget) => <Option key={widget.id} label={`Add ${label(widget)}`} disabled={!ready || loading}
      onPress={() => run(() => setWidgetLayout(addDashboardWidget(layout, widget)))}/>)}</View>
    {loading && <Text style={[styles.description, copy]}>Loading available cards…</Text>}
    {loadError && <Text accessibilityRole='alert' style={[styles.description, copy]}>{loadError}</Text>}
    {!loading && !loadError && !available.length && <Text style={[styles.description, copy]}>All available cards are listed above. Add people or create polls on the companion site to make more available.</Text>}
    <Option label='Refresh available cards' disabled={!ready || loading} onPress={() => setRefresh((value) => value + 1)}/>
    <View style={styles.reset}><Option label='Restore default colors and background' disabled={!ready} onPress={resetAppearance}/></View>
  </>;
}
