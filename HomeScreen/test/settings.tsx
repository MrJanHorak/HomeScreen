import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {ScrollView, View, Text} from 'react-native';
import {ThemeProvider, useAppearance} from '../src/theme/ThemeContext';
import WidgetCardSettings from '../src/components/settings/appearance/WidgetCardSettings';
import SavedLayoutSettings from '../src/components/settings/appearance/SavedLayoutSettings';
import ReadingSettings from '../src/components/settings/appearance/ReadingSettings';
import AmbientSettings from '../src/components/settings/ambient/AmbientSettings';
import AmbientBackdrop from '../src/components/ambient/AmbientBackdrop';
function Settings() {
  const [section, setSection] = useState('cards');
  const [previewAmbient, setPreviewAmbient] = useState(false);
  const {appearance, ambientPhotos} = useAppearance();
  const tvSidebar = new URLSearchParams(window.location.search).has('tv');
  return <View style={{padding: 25, backgroundColor: '#0F172A', height: '100%', minHeight: 0}}>
    <Text style={{color: 'white', fontSize: 28, marginBottom: 12}}>Settings</Text>
    <View style={{flexDirection: 'row', gap: 12, marginBottom: 20}}>
      <button onClick={() => setSection('cards')}>Cards tab</button><button onClick={() => setSection('layout')}>Layout tab</button>
      <button onClick={() => setSection('reading')}>Fonts & reading tab</button>
      <button onClick={() => setSection('ambient')}>Ambient tab</button>
    </View>
    {section === 'cards' ? <View style={{flex: 1, minHeight: 0, flexDirection: 'row', gap: 18}}>
      {tvSidebar && <View style={{width: 190, padding: 12, borderRightWidth: 1, borderRightColor: '#ffffff18'}}>
        <Text style={{color: 'white'}}>Settings sections</Text>
      </View>}
      <WidgetCardSettings/>
    </View> : (
      <ScrollView style={{maxHeight: 560}}>
        {section === 'ambient' ? <AmbientSettings onPreview={() => setPreviewAmbient(true)}/> : section === 'reading' ? <ReadingSettings/> : <SavedLayoutSettings/>}
      </ScrollView>
    )}
    <pre data-appearance style={{display: 'none'}}>{JSON.stringify(appearance)}</pre>
    {previewAmbient && <View testID='ambient-full-preview' style={{position: 'absolute', inset: 0}}>
      <AmbientBackdrop preference={appearance.ambient} selectedPhotos={ambientPhotos}/>
      <button style={{position: 'absolute', top: 20, right: 20}} onClick={() => setPreviewAmbient(false)}>Close ambient preview</button>
    </View>}
  </View>;
}
createRoot(document.getElementById('root')!).render(<ThemeProvider><Settings/></ThemeProvider>);
