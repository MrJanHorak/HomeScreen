import {View, StyleSheet} from 'react-native';
import Text from '../../shared/ReadingText';
import {useAppearance, useTheme} from '../../../theme/ThemeContext';
import {DEFAULT_READING, DYSLEXIA_READING, normalizeReading} from '../../../../../server/functions/src/utils/reading';
import Option from './AppearanceOption';

export default function ReadingSettings() {
  const {appearance, ready, setReadingPreference} = useAppearance();
  const theme = useTheme();
  const reading = normalizeReading(appearance.reading);
  const preset = (Object.keys(DYSLEXIA_READING) as Array<keyof typeof reading>).every((key) => reading[key] === DYSLEXIA_READING[key]);
  return <View style={styles.section}>
    <Text style={styles.title}>Fonts & reading</Text>
    <Option large label='Dyslexia-friendly' accessibilityLabel='Apply dyslexia-friendly reading preset' selected={preset} disabled={!ready}
      subtitle='OpenDyslexic · warm text · gentle spacing' onPress={() => setReadingPreference(DYSLEXIA_READING)}/>
    <Text style={styles.label}>Font</Text>
    <View style={styles.options}>
      <Option large label='System font' selected={reading.font === 'system'} disabled={!ready} onPress={() => setReadingPreference({...reading, font: 'system'})}/>
      <Option large label='OpenDyslexic' selected={reading.font === 'opendyslexic'} disabled={!ready} onPress={() => setReadingPreference({...reading, font: 'opendyslexic'})}/>
    </View>
    <Text style={styles.label}>Reading colors</Text>
    <View style={styles.options}>{(['theme', 'warm', 'contrast'] as const).map((colors) =>
      <Option large key={colors} label={{theme: 'Theme colors', warm: 'Warm cream', contrast: 'High contrast'}[colors]}
        selected={reading.colors === colors} disabled={!ready} onPress={() => setReadingPreference({...reading, colors, textColor: null})}/>)}</View>
    <View style={[styles.sample, {backgroundColor: theme.colors.surface}]}>
      <Text style={styles.sampleTitle}>Weather, plans and tasks</Text>
      <Text style={[styles.sampleBody, {color: theme.colors.textSecondary}]}>Today at 10:30 · Dinner at 6:00</Text>
    </View>
    {reading.font === 'opendyslexic' && !theme.fontsReady && <Text style={styles.hint} accessibilityRole='alert'>
      {theme.fontError ? 'OpenDyslexic could not load. Using the system font; restart the app to retry.' : 'Loading OpenDyslexic… Using the system font while it loads.'}
    </Text>}
    <Text style={[styles.hint, {color: theme.colors.textSecondary}]}>Choose what feels easiest to read. For text color, weight and spacing, open Dashboard Studio on the companion site.</Text>
    <Option large label='Reset reading settings' disabled={!ready} onPress={() => setReadingPreference(DEFAULT_READING)}/>
  </View>;
}
const styles = StyleSheet.create({
  section: {gap: 14, paddingBottom: 24}, title: {fontSize: 28, fontWeight: '700'},
  label: {fontSize: 22, fontWeight: '600', marginTop: 6}, options: {flexDirection: 'row', flexWrap: 'wrap', gap: 12},
  sample: {padding: 20, borderRadius: 14, gap: 8}, sampleTitle: {fontSize: 28, fontWeight: '600'},
  sampleBody: {fontSize: 24}, hint: {fontSize: 20, lineHeight: 28},
});
