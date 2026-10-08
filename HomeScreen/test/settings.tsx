import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {ScrollView, View, Text} from 'react-native';
import {ThemeProvider, useAppearance} from '../src/theme/ThemeContext';
import WidgetCardSettings from '../src/components/settings/appearance/WidgetCardSettings';
import SavedLayoutSettings from '../src/components/settings/appearance/SavedLayoutSettings';
function Settings() {
  const [section, setSection] = useState('cards');
  const {appearance} = useAppearance();
  return <View style={{padding: 25, backgroundColor: '#0F172A', height: '100%', minHeight: 650}}>
    <Text style={{color: 'white', fontSize: 28, marginBottom: 12}}>Settings</Text>
    <View style={{flexDirection: 'row', gap: 12, marginBottom: 20}}>
      <button onClick={() => setSection('cards')}>Cards tab</button><button onClick={() => setSection('layout')}>Layout tab</button>
    </View>
    <ScrollView style={{maxHeight: 560}}>
      {section === 'cards' ? <WidgetCardSettings/> : <SavedLayoutSettings/>}
    </ScrollView>
    <pre data-appearance style={{display: 'none'}}>{JSON.stringify(appearance)}</pre>
  </View>;
}
createRoot(document.getElementById('root')!).render(<ThemeProvider><Settings/></ThemeProvider>);
