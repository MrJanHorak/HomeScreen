import Text from '../../shared/ReadingText';
import {useEffect, useRef, useState} from 'react';
import {ScrollView, StyleSheet, useWindowDimensions, View} from 'react-native';
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
import FeedSourcePicker from '../../shared/FeedSourcePicker';

export default function WidgetCardSettings({onOpenPolls}: {onOpenPolls?: () => void}) {
  const theme = useTheme();
  const {user} = useAuth();
  const {rounds} = usePolls();
  const {appearance, ready, setWidgetLayout} = useAppearance();
  const {width} = useWindowDimensions();
  const [editorWidth, setEditorWidth] = useState(width - 280);
  const previewWidth = Math.min(320, editorWidth * 0.46);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<'arrange' | 'add'>('arrange');
  const [openSection, setOpenSection] = useState<string | null>(null);
  const arrangeRef = useRef<View>(null);
  const addRef = useRef<View>(null);
  const scrollRef = useRef<ScrollView>(null);
  const sectionRefs = useRef<Record<string, View | null>>({});
  const [people, setPeople] = useState<PeopleSettings['people']>([]);
  const [polls, setPolls] = useState<AvailablePoll[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [message, setMessage] = useState('');
  const [addMessage, setAddMessage] = useState({text: '', error: false, target: ''});
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
  const visible = layout.widgets.filter((widget) => widget.visible);
  const hidden = layout.widgets.filter((widget) => !widget.visible);
  const visibleCount = visible.length;
  const selected = layout.widgets.find((widget) => widget.id === selectedId && widget.visible);
  useEffect(() => {if (!selected) setSelectedId(null);}, [selected?.id]);
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
  function edit(id: string, action: WidgetAction) {
    run(() => {
      setWidgetLayout(changeWidget(layout, id, action));
      if (action.type === 'visibility' || action.type === 'remove') {
        requestAnimationFrame(() => (mode === 'arrange' ? arrangeRef : addRef).current?.focus());
      }
    });
  }
  function add(widget: Widget) {
    const target = widget.feed?.url || widget.id;
    try {
      setWidgetLayout(addDashboardWidget(layout, widget));
      setAddMessage({text: `Added ${label(widget)}. Find it in Arrange cards above.`, error: false, target});
      if (widget.kind !== 'feed') requestAnimationFrame(() => sectionRefs.current[widget.kind]?.focus());
    } catch (failure) {
      setAddMessage({text: failure instanceof Error ? failure.message : 'Could not add this card.', error: true, target});
    }
  }
  const copy = {color: theme.colors.textSecondary};
  const preview = <View testID='live-dashboard-preview' style={[styles.livePreviewPanel, {alignSelf: 'flex-start', flexShrink: 0, width: previewWidth, borderColor: theme.colors.focusRing, backgroundColor: theme.colors.glassSurface}]}>
    <Text style={[styles.livePreviewTitle, {color: theme.colors.textPrimary}]}>Live dashboard preview</Text>
    <Text style={[styles.livePreviewMeta, copy]}>{visibleCount} of {layout.widgets.length} cards shown</Text>
    <LayoutPreview cards={appearance.cards} appearance={{...appearance, widgetLayout: layout}} label={label} selectedId={selected?.id} large/>
    <Text numberOfLines={2} style={[styles.livePreviewHint, copy]}>{selected ? `Adjusting: ${label(selected)}` : 'Choose a card to adjust.'}</Text>
  </View>;
  const controls = <View style={styles.cardList}>
    {visible.map((widget, index) => {
      const name = label(widget);
      const item = layout.grid?.items.find((entry) => entry.id === widget.id);
      const active = widget.id === selected?.id;
      const action = (title: string, change: WidgetAction, disabled = false, accessibleTitle = title) => {
        // A move into an occupied space should be visibly unavailable before pressing OK.
        let blocked = disabled;
        if (change.type === 'geometry') {
          try {changeWidget(layout, widget.id, change);} catch {blocked = true;}
        }
        return <Option key={title} label={title} compact accessibilityLabel={`${accessibleTitle} ${name}`}
          disabled={!ready || blocked} onPress={() => edit(widget.id, change)}/>;
      };
      return <View key={widget.id} style={[cardStyles.card, {borderColor: active ? theme.colors.focusRing : theme.colors.glassBorder}]}>
        <View style={cardStyles.cardHeader}>
          <View style={cardStyles.cardTitle}>
            <Text style={[styles.cardName, {color: theme.colors.textPrimary}]}>{name}</Text>
            <Text style={[styles.livePreviewMeta, copy]}>{widget.visible ? 'On your dashboard' : 'Hidden from your dashboard'}</Text>
          </View>
          <Option label={widget.visible ? 'Hide card' : 'Show card'} accessibilityLabel={`${widget.visible ? 'Hide' : 'Show'} ${name}`} compact
            disabled={!ready || widget.visible && visibleCount === 1} onPress={() => edit(widget.id, {type: 'visibility'})}/>
          {widget.visible && <Option label='Adjust' selected={active} expanded={active} accessibilityLabel={`Adjust ${name}`} compact
            disabled={!ready} onPress={() => {setSelectedId(active ? null : widget.id); setMessage('');}}/>}
          {(widget.kind === 'feed' || widget.kind === 'poll') && !active && action(widget.kind === 'feed' ? 'Remove feed' : 'Remove poll card', {type: 'remove'}, visibleCount === 1)}
        </View>
        {active && <View style={cardStyles.adjustments}>
          <Text style={[cardStyles.groupTitle, {color: theme.colors.textPrimary}]}>Move</Text>
          {item ? <>
            <Text style={[styles.description, copy]}>Move into an empty space, or swap places with another card.</Text>
            <View style={cardStyles.directionRow}>
              {action('↑ Up', {type: 'geometry', field: 'y', amount: -1}, false, 'Move up')}
            </View>
            <View style={cardStyles.directionRow}>
              {action('← Left', {type: 'geometry', field: 'x', amount: -1}, false, 'Move left')}
              {action('Right →', {type: 'geometry', field: 'x', amount: 1}, false, 'Move right')}
            </View>
            <View style={cardStyles.directionRow}>
              {action('↓ Down', {type: 'geometry', field: 'y', amount: 1}, false, 'Move down')}
            </View>
            <View style={styles.cardActions}>
              {action('Swap previous', {type: 'swap', direction: -1}, positions[0]?.id === widget.id)}
              {action('Swap next', {type: 'swap', direction: 1}, positions[positions.length - 1]?.id === widget.id)}
            </View>
          </> : <View style={styles.cardActions}>
            {action('Move earlier', {type: 'order', direction: -1}, index === 0)}
            {action('Move later', {type: 'order', direction: 1}, index === visible.length - 1)}
          </View>}
          <Text style={[cardStyles.groupTitle, {color: theme.colors.textPrimary}]}>Resize</Text>
          {item ? <>
            <View style={styles.cardActions}>
              {action('Narrower', {type: 'geometry', field: 'width', amount: -1})}
              {action('Wider', {type: 'geometry', field: 'width', amount: 1})}
            </View>
            <View style={styles.cardActions}>
              {action('Shorter', {type: 'geometry', field: 'height', amount: -1})}
              {action('Taller', {type: 'geometry', field: 'height', amount: 1})}
            </View>
          </> : action(widget.size === 'wide' ? 'Make standard width' : 'Make wider', {type: 'size'})}
          {(widget.kind === 'feed' || widget.kind === 'poll') && action(widget.kind === 'feed' ? 'Remove feed' : 'Remove poll card', {type: 'remove'}, visibleCount === 1)}
          {widget.kind === 'poll' && <Text style={[styles.description, copy]}>Removing the card keeps the poll and its votes. Add it again from Add cards.</Text>}
        </View>}
      </View>;
    })}
  </View>;
  const section = (id: string, title: string, subtitle: string, children: React.ReactNode) => <View key={id} testID={`add-${id}-section`} style={cardStyles.addSection}>
    <Option ref={(node) => {sectionRefs.current[id] = node;}} label={`${openSection === id ? '−' : '+'} ${title}`} accessibilityLabel={title} subtitle={subtitle}
      expanded={openSection === id} compact style={cardStyles.addOption} onPress={() => setOpenSection(openSection === id ? null : id)}/>
    {openSection === id && <View style={[cardStyles.sectionBody, {borderColor: theme.colors.glassBorder, backgroundColor: theme.colors.glassSurface}]}>{children}</View>}
  </View>;
  return <View style={cardStyles.editor}
    onLayout={({nativeEvent}) => setEditorWidth(nativeEvent.layout.width)}>
    <View style={cardStyles.controls}>
    <View style={[styles.cardActions, {marginBottom: 14}]}>
      <Option ref={arrangeRef} label={`Arrange cards (${visibleCount})`} accessibilityLabel='Arrange cards' selected={mode === 'arrange'} compact onPress={() => {setMode('arrange'); setMessage(''); scrollRef.current?.scrollTo({y: 0, animated: false});}}/>
      <Option ref={addRef} label='Add cards' accessibilityLabel='Add cards' selected={mode === 'add'} compact onPress={() => {setMode('add'); setSelectedId(null); setMessage(''); scrollRef.current?.scrollTo({y: 0, animated: false});}}/>
    </View>
    <ScrollView ref={scrollRef} testID='card-settings-scroll' style={cardStyles.scroll} contentContainerStyle={cardStyles.scrollContent} showsVerticalScrollIndicator accessibilityLabel='Card settings'>
    {mode === 'arrange' ? <>
    <Text style={[styles.title, {color: theme.colors.textPrimary}]}>On your dashboard</Text>
    <Text style={[styles.description, copy]}>Choose Adjust to move or resize a card. Hide moves a card to Add cards. Use your remote’s arrows and OK; changes appear in the preview.</Text>
    <View style={[styles.options, {marginBottom: 14}]}>
      <Option label='Automatic rows' subtitle='Cards line up for you' selected={!layout.grid} disabled={!ready || visibleCount > 8}
        onPress={() => run(() => setWidgetLayout({...layout, grid: null}))}/>
      <Option label='Free layout' subtitle='Choose where each card goes' selected={Boolean(layout.grid)} disabled={!ready}
        onPress={() => run(() => setWidgetLayout({...layout, grid: layout.grid || widgetGridFromRows(layout.widgets)}))}/>
    </View>
    {visibleCount > 8 && <Text style={[styles.description, copy]}>Hide cards until eight remain to use automatic rows.</Text>}
    {message !== '' && <Text accessibilityRole='alert' style={[styles.description, {color: theme.colors.textPrimary}]}>{message}</Text>}
    {controls}
    </> : <View style={cardStyles.addCards}>
      <View style={cardStyles.sectionIntro}>
        <Text style={[styles.description, copy, {marginBottom: 0}]}>Open a category to browse or set up cards.</Text>
      </View>
      {section('hidden', 'Hidden cards', `${hidden.length} ready to show again`, <>
        {message !== '' && <Text accessibilityRole='alert' style={[styles.description, copy]}>{message}</Text>}
        {hidden.map((widget) => <View key={widget.id} style={cardStyles.hiddenCard}>
          <Text style={[styles.cardName, {color: theme.colors.textPrimary}]}>{label(widget)}</Text>
          <View style={styles.cardActions}>
            <Option label='Show card' accessibilityLabel={`Show ${label(widget)}`} compact disabled={!ready} onPress={() => edit(widget.id, {type: 'visibility'})}/>
            {(widget.kind === 'feed' || widget.kind === 'poll') && <Option label={widget.kind === 'feed' ? 'Remove feed' : 'Remove poll card'}
              accessibilityLabel={`${widget.kind === 'feed' ? 'Remove feed' : 'Remove poll card'} ${label(widget)}`} compact disabled={!ready} onPress={() => edit(widget.id, {type: 'remove'})}/>}
          </View>
        </View>)}
        {!hidden.length && <Text style={[styles.description, copy]}>All your cards are on the dashboard.</Text>}
      </>)}
      {section('feed', 'News & RSS feeds', 'Choose a topic and add a source', <>
        <Text style={[styles.description, copy, {marginBottom: 0}]}>Choose a topic, then add a publisher’s feed. Each source becomes its own card.</Text>
        <FeedSourcePicker adding disabled={!ready} feedback={{url: addMessage.target, text: addMessage.text, error: addMessage.error}}
          onSelect={(feed) => add({id: `feed_${Array.from({length: 32}, () => Math.floor(Math.random() * 16).toString(16)).join('')}`, kind: 'feed', feed: {...feed, itemCount: 5}, visible: true, size: 'standard'})}/>
        <Text style={[styles.description, copy, {marginBottom: 0}]}>Open a feed card to change its source. Use the companion site for custom URLs and titles.</Text>
      </>)}
      {(['activity', 'poll'] as const).map((kind) => {
        const choices = available.filter((widget) => widget.kind === kind);
        return section(kind, kind === 'activity' ? 'Shared activity' : 'Polls', `${choices.length} available to add`, <>
          <Text style={[styles.description, copy, {marginBottom: 0}]}>{kind === 'activity' ? 'Add a card for someone sharing activity with you.' : 'Add a poll so people can join from your TV.'}</Text>
          {addMessage.target.startsWith(`${kind}_`) && <Text accessibilityRole={addMessage.error ? 'alert' : undefined} accessibilityLiveRegion='polite'
            style={[styles.description, {color: theme.colors.textPrimary, marginBottom: 0}]}>{addMessage.text}</Text>}
          {choices.map((widget) => <Option key={widget.id} label={label(widget).replace(/^(Activity|Poll) · /, '')} subtitle={kind === 'activity' ? 'Add activity card' : 'Add poll card'} accessibilityLabel={`Add ${label(widget)}`} compact
            style={cardStyles.addOption} disabled={!ready || loading} onPress={() => add(widget)}/>)}
          {!loading && !loadError && !choices.length && <Text style={[styles.description, copy, {marginBottom: 0}]}>{kind === 'activity' ? 'No more activity cards to add. Find hidden cards above, or invite someone from People settings.' : 'No more polls to add. Find hidden cards above, or create a new poll.'}</Text>}
          {kind === 'poll' && onOpenPolls && <Option label='Create a poll' compact style={cardStyles.addOption} onPress={onOpenPolls}/>}
        </>);
      })}
      <View style={cardStyles.availability}>
        {loading && <Text style={[styles.description, copy]}>Loading available cards…</Text>}
        {loadError !== '' && <Text accessibilityRole='alert' style={[styles.description, copy]}>{loadError}</Text>}
        <Option label='Refresh available cards' disabled={!ready || loading} compact style={cardStyles.addOption} onPress={() => setRefresh((value) => value + 1)}/>
      </View>
    </View>}
    </ScrollView>
    </View>
    {preview}
  </View>;
}

const cardStyles = StyleSheet.create({
  editor: {flex: 1, flexDirection: 'row', minHeight: 0, minWidth: 0, gap: 16, padding: 4},
  controls: {flex: 1, minHeight: 0, minWidth: 0},
  scroll: {flex: 1, minHeight: 0, minWidth: 0},
  scrollContent: {padding: 4, paddingBottom: 24},
  card: {borderWidth: 2, borderRadius: 14, padding: 12, gap: 12},
  cardHeader: {flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8},
  cardTitle: {flexGrow: 1, flexShrink: 1, minWidth: 140},
  adjustments: {gap: 8, width: '100%', maxWidth: 520},
  groupTitle: {fontSize: 16, fontWeight: '700', marginTop: 4},
  directionRow: {flexDirection: 'row', justifyContent: 'center', gap: 12},
  addCards: {gap: 10},
  hiddenCard: {gap: 8, paddingVertical: 8},
  sectionIntro: {gap: 6},
  addSection: {gap: 8},
  sectionBody: {borderWidth: 1, borderRadius: 14, padding: 14, gap: 12},
  addOption: {width: '100%', minHeight: 64},
  availability: {borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.12)', paddingTop: 16},
});
