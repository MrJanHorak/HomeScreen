import Pressable from '../../shared/NarratedPressable';
import Text from '../../shared/ReadingText';
import {useEffect, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import type {PeopleSettings as PeopleData, PeopleInvitation} from '../../../../../shared/src/people';
import {createPeopleInvitation, getPeopleSettings, peopleAction, getDeviceConnectionInfo} from '../../../services/api';
import {companionSiteUrl} from '../../../services/companionSite';
import {useAppearance, useTheme} from '../../../theme/ThemeContext';
import {addPersonWidget, freeWidgetSpace, validWidgetLayout, widgetsFromLegacy} from '../../../../../server/functions/src/utils/widgets';
import {useControlFocus} from '../../../hooks/useControlFocus';
import SettingsPanel from '../shared/SettingsPanel';

export default function PeopleSettings() {
  const theme = useTheme(); const {appearance, ready, setWidgetLayout} = useAppearance();
  const {focusProps, focusStyle} = useControlFocus();
  const [data, setData] = useState<PeopleData | null>(null);
  const [invitation, setInvitation] = useState<PeopleInvitation | null>(null);
  const [url, setUrl] = useState(() => companionSiteUrl('/people'));
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState('');
  const [confirm, setConfirm] = useState('');
  useEffect(() => {
    let active = true;
    const load = () => void getPeopleSettings().then((next) => {if (active) setData(next);})
      .catch(() => {if (active) setMessage('Could not load people. Check your connection.');});
    load(); const timer = setInterval(load, 30000);
    void getDeviceConnectionInfo().then((info) => {if (active && info.companionUrl) setUrl(companionSiteUrl('/people', info.companionUrl));}).catch(() => undefined);
    return () => {active = false; clearInterval(timer);};
  }, []);
  useEffect(() => {
    if (!invitation) return;
    const timer = setTimeout(() => {setInvitation(null); setMessage('Invitation expired. Choose Add person for a new one.');}, Math.max(0, invitation.expiresAtMs - Date.now()));
    return () => clearTimeout(timer);
  }, [invitation]);
  async function run(action: () => Promise<void>) {
    setBusy(true); setMessage('');
    try {await action();} catch (error) {setMessage(error instanceof Error ? error.message : 'Could not update people.');}
    finally {setBusy(false);}
  }
  function togglePerson(id: string) {
    try {
      const layout = appearance.widgetLayout || widgetsFromLegacy(appearance.cards, appearance.grid, appearance.cardStyles);
      const widget = layout.widgets.find((w) => w.personId === id);
      if (!widget) {setWidgetLayout(addPersonWidget(layout, id)); return;}
      let grid = layout.grid;
      if (grid) {
        if (widget.visible) grid = {...grid, items: grid.items.filter((item) => item.id !== widget.id)};
        else {
          const space = freeWidgetSpace(grid, widget.id);
          if (!space) throw new Error('Make room on the canvas using Dashboard Studio first.');
          grid = {...grid, items: [...grid.items, space]};
        }
      }
      const next = {...layout, grid, widgets: layout.widgets.map((w) => w.id === widget.id ? {...w, visible: !w.visible} : w)};
      if (!validWidgetLayout(next)) throw new Error('Keep one widget visible and make room before adding another.');
      setWidgetLayout(next); setMessage('Activity widget updated. Arrange and style it in Dashboard Studio.');
    } catch (error) {setMessage(error instanceof Error ? error.message : 'Could not update this widget.');}
  }
  const button = (id: string, label: string, action: () => void) => <Pressable key={id} accessibilityRole="button"
    disabled={busy || !ready} accessibilityState={{disabled: busy || !ready}} onPress={action} {...focusProps(id)}
    style={[styles.button, {borderColor: theme.colors.focusRing, opacity: busy ? .5 : 1}, focusStyle(id)]}>
    <Text style={{color: theme.colors.textPrimary, fontSize: 17, fontWeight: '700'}}>{label}</Text>
  </Pressable>;
  return <SettingsPanel>
    <Text style={[styles.title, {color: theme.colors.textPrimary}]}>People</Text>
    <Text style={[styles.copy, {color: theme.colors.textSecondary}]}>Invite someone to share activity with the dashboard on all your linked TVs. They sign in and approve sharing on their own phone. Each person has an optional activity widget.</Text>
    <View style={styles.actions}>{button('add-person', 'Add person', () => void run(async () => {
      if (invitation) await peopleAction('cancelInvitation', invitation.id);
      setInvitation(await createPeopleInvitation());
    }))}</View>
    {invitation && <View style={styles.qrRow}>
      <View style={styles.qr}><QRCode value={invitation.url} size={180} quietZone={8}/></View>
      <View style={styles.instructions}><Text style={[styles.title, {color: theme.colors.textPrimary}]}>Scan with the other person’s phone</Text>
        <Text style={[styles.copy, {color: theme.colors.textSecondary}]}>One person can use this invitation. Expires at {new Date(invitation.expiresAtMs).toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'})}. Anyone with the link can accept it.</Text>
        {button('cancel-invite', 'Cancel invitation', () => void run(async () => {await peopleAction('cancelInvitation', invitation.id); setInvitation(null);}))}
      </View>
    </View>}
    {!data ? <Text style={[styles.copy, {color: theme.colors.textSecondary}]}>Loading people…</Text> : !data.people.length ?
      <Text style={[styles.copy, {color: theme.colors.textSecondary}]}>No other people are sharing activity yet.</Text> : data.people.map((person) => {
        const visible = appearance.widgetLayout?.widgets.some((w) => w.personId === person.id && w.visible);
        return <View key={person.id} style={[styles.person, {borderColor: theme.colors.glassBorder}]}>
          <Text style={[styles.title, {color: theme.colors.textPrimary}]}>{person.name}</Text>
          <View style={styles.actions}>{button(`widget-${person.id}`, visible ? 'Hide activity widget' : 'Show activity widget', () => togglePerson(person.id))}
            {button(`remove-${person.id}`, confirm === person.id ? 'Confirm removal' : 'Remove person', () => {
              if (confirm !== person.id) {setConfirm(person.id); return;}
              void run(async () => {await peopleAction('remove', person.id); setData(await getPeopleSettings()); setConfirm(''); setMessage('Person removed. Their shared activity will clear within 45 seconds.');});
            })}{confirm === person.id && button(`keep-${person.id}`, 'Keep person', () => setConfirm(''))}</View>
        </View>;
      })}
    {message && <Text accessibilityRole="alert" style={[styles.copy, {color: theme.colors.textPrimary}]}>{message}</Text>}
    {url && <View style={styles.qrRow}><View style={styles.qr}><QRCode value={url} size={130} quietZone={8}/></View>
      <View style={styles.instructions}><Text style={[styles.title, {color: theme.colors.textPrimary}]}>Manage People on your phone</Text>
        <Text selectable style={[styles.copy, {color: theme.colors.textSecondary}]}>{url}</Text></View></View>}
  </SettingsPanel>;
}
const styles = StyleSheet.create({title: {fontSize: 22, fontWeight: '700'}, copy: {fontSize: 16, lineHeight: 24, marginTop: 12},
  actions: {flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 14}, button: {minHeight: 48, paddingHorizontal: 18, paddingVertical: 12, borderWidth: 2, borderRadius: 12},
  qrRow: {flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 24, marginTop: 22}, qr: {backgroundColor: '#FFFFFF', padding: 8, borderRadius: 10},
  instructions: {flexShrink: 1, maxWidth: 550, gap: 12}, person: {borderTopWidth: 1, marginTop: 20, paddingTop: 18}});
