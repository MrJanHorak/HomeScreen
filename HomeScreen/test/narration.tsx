import {createRoot} from 'react-dom/client';
import {ScrollView, View} from 'react-native';
import {NarrationProvider, useNarration} from '../src/accessibility/NarrationContext';
import AccessibilitySettings from '../src/components/settings/accessibility/AccessibilitySettings';
import Pressable from '../src/components/shared/NarratedPressable';
import TextInput from '../src/components/shared/NarratedTextInput';
import Text from '../src/components/shared/ReadingText';
function Fixture() {
  const {preference} = useNarration();
  return <View style={{height: '100%', minHeight: 600, backgroundColor: '#0F172A', padding: 24}}>
    <View style={{flexDirection: 'row', gap: 24, marginBottom: 20}}>
      <Pressable accessibilityLabel='Weather. Open details' style={{padding: 10}}><Text>Weather</Text></Pressable>
      <Pressable accessibilityLabel='Tasks. Open details' style={{padding: 10}}><Text>Tasks</Text></Pressable>
      <Pressable style={{padding: 10}}><Text>Stay in app</Text></Pressable>
      <TextInput accessibilityLabel='Location label, optional' value='Private household detail' style={{color: 'white'}}/>
    </View>
    <ScrollView><AccessibilitySettings/></ScrollView>
    <pre data-narration style={{display: 'none'}}>{JSON.stringify(preference)}</pre>
  </View>;
}
createRoot(document.getElementById('root')!).render(<NarrationProvider><Fixture/></NarrationProvider>);
