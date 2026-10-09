import {useCallback, useMemo, useRef, useState, useEffect} from 'react';
import {Platform, StyleSheet, View} from 'react-native';
import type {Voice} from 'expo-speech';
import Text from '../../shared/ReadingText';
import Pressable from '../../shared/NarratedPressable';
import {useTheme} from '../../../theme/ThemeContext';
import {groupVoices, voiceDisplay, voiceLanguage} from '../../../accessibility/voiceGroups';
import {useDetailBackHandler} from '../../shared/DetailLayout';

const PAGE_SIZE = 6;
export default function VoicePicker({voices, selected, onSelect, onClose}: {
  voices: Voice[]; selected: string | null; onSelect: (voice: string) => void; onClose: () => void;
}) {
  const theme = useTheme();
  const groups = useMemo(() => groupVoices(voices), [voices]);
  const [language, setLanguage] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const group = groups.find((item) => item.id === language);
  const entries = group?.voices || groups;
  const pageCount = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const preferredLanguage = voices.find((voice) => voice.identifier === selected);
  const firstRef = useRef<View>(null);
  const back = useCallback(() => {if (language) {setLanguage(null); setPage(0);} else onClose();}, [language, onClose]);
  // Android Modal routes remote Back through onRequestClose rather than BackHandler.
  useDetailBackHandler(back);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault(); event.stopImmediatePropagation();
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault(); event.stopImmediatePropagation(); back();
    };
    if (Platform.OS === 'web') {window.addEventListener('keydown', onKey, true); window.addEventListener('keyup', onKeyUp, true);}
    return () => {if (Platform.OS === 'web') {window.removeEventListener('keydown', onKey, true); window.removeEventListener('keyup', onKeyUp, true);}};
  }, [back]);
  useEffect(() => {
    const target = firstRef.current as (View & {focus?: () => void; requestTVFocus?: () => void}) | null;
    target?.focus?.(); target?.requestTVFocus?.();
  }, [language, safePage]);
  const tileStyle = (focused: boolean, active: boolean) => [styles.tile, {
    borderColor: focused ? theme.colors.focusRing : active ? theme.colors.glassBorderTop : theme.colors.glassBorder,
    backgroundColor: active || focused ? theme.colors.glassSurfaceFocused : theme.colors.glassSurface,
  }, focused && {borderWidth: 3}];
  return <View style={styles.container} testID='voice-picker'>
    <View style={styles.header}>
      <Text style={styles.title}>{group ? `${group.label} voices` : 'Choose a language'}</Text>
      <Pressable accessibilityLabel={group ? 'Back to languages' : 'Back to spoken navigation'}
        onPress={group ? () => {setLanguage(null); setPage(0);} : onClose}
        style={({focused}) => [styles.action, {borderColor: focused ? theme.colors.focusRing : theme.colors.glassBorder}]}>
        <Text style={styles.actionText}>{group ? 'Languages' : 'Done'}</Text>
      </Pressable>
    </View>
    <View style={styles.grid}>
      {group ? group.voices.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE).map((voice, index) => {
        const display = voiceDisplay(voice, safePage * PAGE_SIZE + index);
        return <Pressable key={voice.identifier} ref={index === 0 ? firstRef : undefined} hasTVPreferredFocus={index === 0}
          accessibilityLabel={`${display.label}. ${display.subtitle}`} accessibilityState={{selected: selected === voice.identifier}}
          onPress={() => onSelect(voice.identifier)} style={({focused}) => tileStyle(focused, selected === voice.identifier)}>
          <Text style={[styles.name, selected === voice.identifier && {color: theme.colors.focusRing}]}>{selected === voice.identifier ? '✓ ' : ''}{display.label}</Text>
          <Text style={[styles.subtitle, {color: theme.colors.textSecondary}]}>{display.subtitle}</Text>
        </Pressable>;
      }) : groups.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE).map((item, index) =>
        <Pressable key={item.id} ref={index === 0 ? firstRef : undefined} hasTVPreferredFocus={index === 0}
          accessibilityLabel={`${item.label}, ${item.voices.length} voices`} accessibilityState={{selected: !!preferredLanguage && voiceLanguage(preferredLanguage) === item.id}}
          onPress={() => {setLanguage(item.id); setPage(0);}} style={({focused}) => tileStyle(focused, !!preferredLanguage && voiceLanguage(preferredLanguage) === item.id)}>
          <Text style={styles.name}>{item.label}</Text>
          <Text style={[styles.subtitle, {color: theme.colors.textSecondary}]}>{item.voices.length} {item.voices.length === 1 ? 'voice' : 'voices'}</Text>
        </Pressable>)}
      {!entries.length && <Text style={styles.subtitle}>No voices are installed. Use Refresh voices or check the TV speech settings.</Text>}
    </View>
    {pageCount > 1 && <View style={styles.pager}>
      <Pressable accessibilityLabel='Previous voice page' disabled={safePage === 0} onPress={() => setPage(safePage - 1)}
        style={({focused}) => [styles.action, {borderColor: focused ? theme.colors.focusRing : theme.colors.glassBorder, opacity: safePage === 0 ? .45 : 1}]}><Text style={styles.actionText}>Previous</Text></Pressable>
      <Text style={styles.subtitle}>{safePage + 1} / {pageCount}</Text>
      <Pressable accessibilityLabel='Next voice page' disabled={safePage === pageCount - 1} onPress={() => setPage(safePage + 1)}
        style={({focused}) => [styles.action, {borderColor: focused ? theme.colors.focusRing : theme.colors.glassBorder, opacity: safePage === pageCount - 1 ? .45 : 1}]}><Text style={styles.actionText}>Next</Text></Pressable>
    </View>}
  </View>;
}
const styles = StyleSheet.create({
  container: {gap: 10}, header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10},
  title: {fontSize: 20, fontWeight: '700', flex: 1}, grid: {flexDirection: 'row', flexWrap: 'wrap', gap: 10},
  tile: {width: '48%', minHeight: 64, padding: 10, borderWidth: 2, borderRadius: 12, justifyContent: 'center'},
  name: {fontSize: 18, fontWeight: '700'}, subtitle: {fontSize: 14, marginTop: 2},
  action: {minHeight: 40, paddingVertical: 7, paddingHorizontal: 12, borderWidth: 2, borderRadius: 10, justifyContent: 'center'},
  actionText: {fontSize: 16, fontWeight: '600'}, pager: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12},
});
