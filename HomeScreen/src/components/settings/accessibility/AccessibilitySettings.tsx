import {useEffect, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import Text from '../../shared/ReadingText';
import Option from '../appearance/AppearanceOption';
import {useNarration} from '../../../accessibility/NarrationContext';
import VoicePicker from './VoicePicker';
import {groupVoices, languageName, voiceDisplay, voiceLanguage} from '../../../accessibility/voiceGroups';

export default function AccessibilitySettings() {
  const {preference, ready, screenReader, canDetectScreenReader, voices, voicesLoading, error, setPreference, announce, stop, refreshVoices} = useNarration();
  const [showVoices, setShowVoices] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  useEffect(() => {refreshVoices();}, [refreshVoices]);
  const selectedVoice = voices.find((voice) => voice.identifier === preference.voice);
  const selectedGroup = selectedVoice && groupVoices(voices).find((group) => group.id === voiceLanguage(selectedVoice));
  const selectedDisplay = selectedVoice && voiceDisplay(selectedVoice, selectedGroup?.voices.findIndex((voice) => voice.identifier === selectedVoice.identifier) ?? 0);
  return <View style={styles.section}>
    {!showVoices && <><Text style={styles.title} accessibilityRole='header'>Spoken navigation</Text>
    <Text style={styles.description}>Hear selections as you navigate. Saved on this TV.</Text>
    <Text style={styles.label}>Read selections aloud</Text>
    <View style={styles.options}>
      <Option compact label='On' accessibilityLabel='Read selections aloud, on' selected={preference.enabled} disabled={!ready}
        onPress={() => setPreference({enabled: true})}/>
      <Option compact label='Off' accessibilityLabel='Read selections aloud, off' selected={!preference.enabled} disabled={!ready}
        onPress={() => setPreference({enabled: false})}/>
    </View>
    <Text style={styles.label}>Speaking speed</Text>
    <View style={styles.options}>{[{label: 'Slower', rate: 0.75}, {label: 'Normal', rate: 1}, {label: 'Faster', rate: 1.25}].map(({label, rate}) =>
      <Option compact key={rate} label={label} accessibilityLabel={`${label} speaking speed`} selected={preference.rate === rate} disabled={!ready}
        onPress={() => setPreference({rate})}/>)}</View>
    <Text style={styles.label}>Voice and language</Text>
    <View style={styles.options}>
      <Option compact label='Device default voice' selected={!selectedVoice} disabled={!ready}
        onPress={() => setPreference({voice: null})}/>
      <Option compact label='Choose a voice' accessibilityLabel='Choose a voice' disabled={!ready || voicesLoading}
        onPress={() => setShowVoices(true)}/>
    </View>
    <Text style={styles.description}>{selectedVoice && selectedDisplay ? `${languageName(voiceLanguage(selectedVoice))} · ${selectedDisplay.label} · ${selectedDisplay.subtitle}` : voicesLoading ? 'Loading voices…' : 'Using the device default voice'}</Text>
    </>}
    {showVoices && <VoicePicker voices={voices} selected={preference.voice}
      onSelect={(voice) => setPreference({voice})} onClose={() => setShowVoices(false)}/>}
    <View style={styles.options}>
      <Option compact label='Preview voice' disabled={!ready || screenReader !== false || voicesLoading}
        onPress={() => announce('This is your dashboard voice. Weather. Open details. High contrast. Selected.', undefined, true)}/>
      <Option compact label='Stop speaking' onPress={stop}/>
      {!showVoices && <Option compact label='Refresh voices' disabled={voicesLoading} onPress={refreshVoices}/>}
    </View>
    {screenReader === true && <Text style={styles.description} accessibilityLiveRegion='polite'>Your screen reader is active. The dashboard voice is paused.</Text>}
    {screenReader === null && <Text style={styles.description}>Checking screen reader settings…</Text>}
    {error && <Text style={styles.description} accessibilityRole='alert'>{error}</Text>}
    {!showVoices && <Option compact label={showHelp ? 'Hide speech help' : 'Speech help'} onPress={() => setShowHelp((value) => !value)}/>}
    {showHelp && !showVoices && <>
      {!canDetectScreenReader && <Text style={styles.description}>Browsers cannot detect screen readers. If you use one, leave reading selections off to avoid hearing two voices.</Text>}
      <Text style={styles.description}>Preview works even when reading selections is off. Voice availability depends on this device. Text-to-speech settings may offer additional languages or voice downloads.</Text>
      <Text style={styles.description}>Dashboard cards announce their names. Controls inside an opened detail view may include personal information. Background updates stay silent. Fonts, spacing and contrast are in Fonts &amp; reading.</Text>
    </>}
  </View>;
}

const styles = StyleSheet.create({
  section: {gap: 8, paddingBottom: 12}, title: {fontSize: 22, fontWeight: '700'},
  label: {fontSize: 18, fontWeight: '600', marginTop: 2},
  description: {fontSize: 15, lineHeight: 21}, options: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
});
