import {useEffect, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import Text from '../../shared/ReadingText';
import Option from '../appearance/AppearanceOption';
import {useNarration} from '../../../accessibility/NarrationContext';

export default function AccessibilitySettings() {
  const {preference, ready, screenReader, canDetectScreenReader, voices, voicesLoading, error, setPreference, announce, stop, refreshVoices} = useNarration();
  const [showVoices, setShowVoices] = useState(false);
  useEffect(() => {refreshVoices();}, [refreshVoices]);
  const selectedVoice = voices.find((voice) => voice.identifier === preference.voice);
  return <View style={styles.section}>
    <Text style={styles.title} accessibilityRole='header'>Accessibility</Text>
    <Text style={styles.description}>Hear the highlighted menu, card or app as you move with the remote. These preferences are saved on this device.</Text>
    <Text style={styles.label}>Read selections aloud</Text>
    <View style={styles.options}>
      <Option large label='On' accessibilityLabel='Read selections aloud, on' selected={preference.enabled} disabled={!ready}
        onPress={() => setPreference({enabled: true})}/>
      <Option large label='Off' accessibilityLabel='Read selections aloud, off' selected={!preference.enabled} disabled={!ready}
        onPress={() => setPreference({enabled: false})}/>
    </View>
    {screenReader === true && <Text style={styles.description} accessibilityLiveRegion='polite'>Your screen reader is active. It will read controls; the dashboard voice is paused to avoid speaking twice.</Text>}
    {screenReader === null && <Text style={styles.description}>Checking screen reader settings. Spoken navigation will wait until this check finishes.</Text>}
    {!canDetectScreenReader && <Text style={styles.description}>Browsers cannot detect screen readers. If you use one, leave reading selections off to avoid hearing two voices.</Text>}
    <Text style={styles.label}>Speaking speed</Text>
    <View style={styles.options}>{[{label: 'Slower', rate: 0.75}, {label: 'Normal', rate: 1}, {label: 'Faster', rate: 1.25}].map(({label, rate}) =>
      <Option large key={rate} label={label} accessibilityLabel={`${label} speaking speed`} selected={preference.rate === rate} disabled={!ready}
        onPress={() => setPreference({rate})}/>)}</View>
    <Text style={styles.label}>Voice and language</Text>
    <Option large label='Device default voice' selected={!selectedVoice} disabled={!ready}
      subtitle='Use the voice chosen in your device settings.' onPress={() => setPreference({voice: null})}/>
    <Option large label={showVoices ? 'Hide available voices' : 'Choose a voice'} disabled={!ready || voicesLoading}
      subtitle={selectedVoice ? `${selectedVoice.name} · ${selectedVoice.language}` : voicesLoading ? 'Loading voices…' : `${voices.length} available voices`}
      onPress={() => setShowVoices((value) => !value)}/>
    {showVoices && voices.map((voice) => <Option large key={voice.identifier} label={voice.name} subtitle={voice.language}
      selected={preference.voice === voice.identifier} onPress={() => setPreference({voice: voice.identifier})}/>)}
    <View style={styles.options}>
      <Option large label='Preview voice' disabled={!ready || screenReader !== false || voicesLoading}
        onPress={() => announce('This is your dashboard voice. Weather. Open details. High contrast. Selected.', undefined, true)}/>
      <Option large label='Stop speaking' onPress={stop}/>
      <Option large label='Refresh voices' disabled={voicesLoading} onPress={refreshVoices}/>
    </View>
    {error && <Text style={styles.description} accessibilityRole='alert'>{error}</Text>}
    <Text style={styles.description}>Preview works even when reading selections is off. Voice availability depends on this device. Text-to-speech settings may offer additional languages or voice downloads.</Text>
    <Text style={styles.description}>Dashboard cards announce their names. Controls inside an opened detail view may include personal information. Background updates stay silent. Fonts, spacing and contrast are in Fonts &amp; reading.</Text>
  </View>;
}

const styles = StyleSheet.create({
  section: {gap: 14, paddingBottom: 24}, title: {fontSize: 28, fontWeight: '700'},
  label: {fontSize: 22, fontWeight: '600', marginTop: 6},
  description: {fontSize: 20, lineHeight: 28}, options: {flexDirection: 'row', flexWrap: 'wrap', gap: 12},
});
