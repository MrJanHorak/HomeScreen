import {useEffect, useRef, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import Text from '../../shared/ReadingText';
import TextInput from '../../shared/NarratedTextInput';
import Option from '../appearance/AppearanceOption';
import SettingsPanel from '../shared/SettingsPanel';
import {useAuth} from '../../../context/AuthContext';
import {useAppearance, useTheme} from '../../../theme/ThemeContext';
import {createDashboardPoll, getAvailableDashboardPolls} from '../../../services/api';
import type {AvailablePoll} from '../../../services/api';
import {parsePollDefinition} from '../../../../../server/functions/src/utils/polls';
import {addDashboardWidget, changeWidget, editableWidgetLayout} from '../appearance/widgetControls';

export default function PollSettings() {
  const theme = useTheme();
  const {user} = useAuth();
  const {appearance, ready, setWidgetLayout} = useAppearance();
  const [question, setQuestion] = useState('');
  const [choices, setChoices] = useState(['', '']);
  const [duration, setDuration] = useState<number | null>(60);
  const [results, setResults] = useState<'live' | 'closed'>('live');
  const [focusedInput, setFocusedInput] = useState('');
  const [polls, setPolls] = useState<AvailablePoll[]>([]);
  const [created, setCreated] = useState<AvailablePoll | null>(null);
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const request = useRef<{key: string; id: string} | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [message, setMessage] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [formOpen, setFormOpen] = useState(true);
  const createRef = useRef<View>(null);
  const formRef = useRef<View>(null);
  const pollRefs = useRef<Record<string, View | null>>({});
  const titleColor = {color: theme.colors.textPrimary};
  const copyColor = {color: theme.colors.textSecondary};
  const layout = editableWidgetLayout(appearance);
  useEffect(() => {
    let active = true;
    setLoading(true); setLoadError('');
    void getAvailableDashboardPolls().then((next) => {if (active) setPolls(next);})
      .catch((error) => {if (active) setLoadError(error instanceof Error ? error.message : 'Could not load polls.');})
      .finally(() => {if (active) setLoading(false);});
    return () => {active = false;};
  }, [user?.uid, refresh]);

  async function create() {
    if (submitting.current) return;
    const definition = parsePollDefinition({question, description: '', answerMode: 'choices',
      options: choices.map((label, index) => ({id: `choice_${index + 1}`, label})),
      resultsVisibility: results, protection: 'browser', moderate: true, defaultDurationMinutes: duration});
    if (!definition) {setMessage('Enter a question and fill in every choice. Use at least two different choices.'); return;}
    const key = JSON.stringify(definition);
    // Reuse the request after a lost response; retrying must not open another round.
    if (request.current?.key !== key) request.current = {key, id: Array.from({length: 32}, () => Math.floor(Math.random() * 16).toString(16)).join('')};
    submitting.current = true; setBusy(true); setMessage('');
    try {
      const round = await createDashboardPoll(definition, request.current.id);
      const poll = {id: round.id, question: round.question};
      setCreated(poll); setPolls((current) => [poll, ...current.filter((item) => item.id !== poll.id)]);
      setMessage('Poll created. Add its card below so people can scan and vote.');
      requestAnimationFrame(() => createRef.current?.focus());
    } catch (error) {setMessage(error instanceof Error ? error.message : 'Could not create the poll. Retry to check your poll.');}
    finally {submitting.current = false; setBusy(false);}
  }

  function updateCard(poll: AvailablePoll, remove = false) {
    try {
      const widget = layout.widgets.find((item) => item.kind === 'poll' && item.roundId === poll.id);
      setWidgetLayout(widget ? changeWidget(layout, widget.id, {type: remove ? 'remove' : 'visibility'}) :
        addDashboardWidget(layout, {id: `poll_${poll.id}`, kind: 'poll', roundId: poll.id, visible: true, size: 'standard', presentation: 'auto'}));
      setMessage(remove ? 'Poll card removed. The poll and its votes are saved; you can add it again.' : widget?.visible ? 'Poll card hidden. Find it in Cards → Add cards → Hidden cards.' : 'Poll card added. Move or resize it in Cards → Arrange cards.');
      requestAnimationFrame(() => pollRefs.current[poll.id]?.focus());
    } catch (error) {setMessage(error instanceof Error ? error.message : 'Could not update the card.');}
  }
  const input = (name: string, value: string, onChangeText: (text: string) => void, maxLength: number) => <View style={styles.field}>
    <Text style={[styles.label, titleColor]}>{name}</Text>
    <TextInput accessibilityLabel={name} value={value} onChangeText={onChangeText} maxLength={maxLength} editable={!busy}
      onFocus={() => setFocusedInput(name)} onBlur={() => setFocusedInput('')}
      style={[styles.input, titleColor, {borderColor: focusedInput === name ? theme.colors.focusRing : theme.colors.glassBorder, backgroundColor: theme.colors.glassSurface}]}/>
  </View>;
  return <SettingsPanel>
    <Text style={[styles.title, titleColor]}>Polls</Text>
    <Text style={[styles.copy, copyColor]}>Create a multiple-choice poll with your remote. Add its card to let people scan and vote on their phones. Polls are shared across your linked TVs.</Text>
    <Option ref={formRef} label={created ? 'Create another poll' : 'Create a poll'} accessibilityLabel='Create a poll' expanded={formOpen && !created} compact disabled={busy || !ready}
      onPress={() => {
        if (created) {setCreated(null); setQuestion(''); setChoices(['', '']); request.current = null; setFormOpen(true); setMessage('');}
        else setFormOpen(!formOpen);
      }}/>
    {formOpen && !created && <View style={styles.form}>
      {input('Question', question, setQuestion, 160)}
      {choices.map((choice, index) => <View key={index}>{input(`Choice ${index + 1}`, choice, (value) => setChoices((current) => current.map((entry, i) => i === index ? value : entry)), 80)}</View>)}
      <View style={styles.actions}>
        <Option label='Add choice' compact disabled={busy || choices.length >= 6} onPress={() => setChoices([...choices, ''])}/>
        <Option label='Remove last choice' compact disabled={busy || choices.length <= 2} onPress={() => {setChoices(choices.slice(0, -1)); requestAnimationFrame(() => formRef.current?.focus());}}/>
      </View>
      <Text style={[styles.label, titleColor]}>Voting closes after</Text>
      <View style={styles.actions}>{([[15, '15 minutes'], [60, '1 hour'], [1440, '1 day'], [null, 'No deadline']] as const).map(([value, label]) =>
        <Option key={label} label={label} selected={duration === value} compact disabled={busy} onPress={() => setDuration(value)}/>)}</View>
      <Text style={[styles.label, titleColor]}>Show results</Text>
      <View style={styles.actions}>
        <Option label='As votes arrive' selected={results === 'live'} compact disabled={busy} onPress={() => setResults('live')}/>
        <Option label='After voting closes' selected={results === 'closed'} compact disabled={busy} onPress={() => setResults('closed')}/>
      </View>
      <Text style={[styles.copy, copyColor]}>Anyone with the QR link can vote once per browser. Use the companion site for invitation codes, written answers, and closing or deleting polls.</Text>
      <Option label={busy ? 'Creating poll…' : 'Create poll'} compact disabled={busy || !ready} onPress={() => void create()}/>
    </View>}
    {message !== '' && <Text accessibilityRole='alert' accessibilityLiveRegion='polite' style={[styles.copy, titleColor]}>{message}</Text>}
    {created && <Option ref={createRef} label='Add created poll card' compact disabled={!ready || layout.widgets.some((widget) => widget.roundId === created.id && widget.visible)} onPress={() => updateCard(created)}/>}
    <Text style={[styles.title, titleColor]}>Available polls</Text>
    <Text style={[styles.copy, copyColor]}>Hide keeps a card ready to show again. Remove takes it out of the layout and keeps the poll’s votes.</Text>
    {loading && <Text style={[styles.copy, copyColor]}>Loading polls…</Text>}
    {loadError !== '' && <Text accessibilityRole='alert' style={[styles.copy, titleColor]}>{loadError}</Text>}
    {polls.map((poll) => {
      const widget = layout.widgets.find((item) => item.kind === 'poll' && item.roundId === poll.id);
      const last = widget?.visible && layout.widgets.filter((item) => item.visible).length === 1;
      return <View key={poll.id} style={[styles.poll, {borderColor: theme.colors.glassBorder}]}>
        <Text style={[styles.label, titleColor]}>{poll.question}</Text>
        <Text style={[styles.copy, copyColor]}>{widget?.visible ? 'On your dashboard' : widget ? 'Hidden from your dashboard' : 'Ready to add'}</Text>
        <View style={styles.actions}>
          <Option ref={(node) => {pollRefs.current[poll.id] = node;}} label={widget?.visible ? 'Hide card' : widget ? 'Show card' : 'Add card'} accessibilityLabel={`${widget?.visible ? 'Hide' : widget ? 'Show' : 'Add'} poll ${poll.question}`} compact
            disabled={!ready || busy || Boolean(last)} onPress={() => updateCard(poll)}/>
          {widget && <Option label='Remove poll card' accessibilityLabel={`Remove poll card ${poll.question}`} compact disabled={!ready || busy || Boolean(last)} onPress={() => updateCard(poll, true)}/>}
        </View>
      </View>;
    })}
    {!loading && !loadError && !polls.length && <Text style={[styles.copy, copyColor]}>No polls yet. Create your first one above.</Text>}
    <Option label='Refresh polls' compact disabled={loading || busy} onPress={() => setRefresh((value) => value + 1)}/>
  </SettingsPanel>;
}

const styles = StyleSheet.create({
  title: {fontSize: 24, fontWeight: '700', marginTop: 12, marginBottom: 8},
  copy: {fontSize: 16, lineHeight: 23, marginBottom: 12},
  label: {fontSize: 18, fontWeight: '700'},
  form: {gap: 14, marginVertical: 16, maxWidth: 720},
  field: {gap: 6},
  input: {borderWidth: 2, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, minHeight: 52, fontSize: 20},
  actions: {flexDirection: 'row', flexWrap: 'wrap', gap: 10},
  poll: {borderWidth: 1, borderRadius: 14, padding: 14, gap: 8, marginBottom: 12},
});
