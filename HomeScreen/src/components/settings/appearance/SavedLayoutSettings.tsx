import Text from '../../shared/ReadingText';
import {useEffect, useState} from 'react';
import { View} from 'react-native';
import {useAuth} from '../../../context/AuthContext';
import {getSavedDashboardLayouts} from '../../../services/api';
import {useAppearance, useTheme} from '../../../theme/ThemeContext';
import {LAYOUTS, normalizeAppearance} from '../../../theme/appearance';
import type {SavedDesign} from '../../../../../server/functions/src/utils/appearanceLibrary';
import Option from './AppearanceOption';
import LayoutPreview from './LayoutPreview';
import {styles} from './appearanceStyles';

export default function SavedLayoutSettings() {
  const theme = useTheme();
  const {user} = useAuth();
  const {appearance, ready, selectLayout, applySavedLayout} = useAppearance();
  const [designs, setDesigns] = useState<SavedDesign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let active = true;
    setDesigns([]); setError(''); setLoading(true);
    if (!ready) return () => {active = false;};
    void getSavedDashboardLayouts().then((next) => {if (active) setDesigns(next);})
      .catch((failure) => {if (active) setError(failure instanceof Error ? failure.message : 'Could not load saved layouts.');})
      .finally(() => {if (active) setLoading(false);});
    return () => {active = false;};
  }, [ready, user?.uid, refresh]);
  const copy = {color: theme.colors.textSecondary};
  return <>
    <View style={styles.options}>
      {Object.entries(LAYOUTS).map(([id, preset]) => <Option key={id} label={preset.label} subtitle={preset.description}
        preview={<LayoutPreview cards={preset.cards} appearance={{...appearance, widgetLayout: null, grid: null}}/>}
        selected={appearance.layout === id && !appearance.widgetLayout?.grid && !appearance.grid}
        disabled={!ready} onPress={() => selectLayout(id as keyof typeof LAYOUTS)}/>) }
    </View>
    <Text style={[styles.heading, {color: theme.colors.textPrimary}]}>Saved companion layouts</Text>
    <Text style={[styles.description, copy]}>Saved designs from Dashboard Studio. Selecting one applies its cards, placement, colors, and background to your linked TVs.</Text>
    <View style={styles.options}>
      {designs.map((design) => {
        const normalized = normalizeAppearance(design.appearance);
        const saved = {...normalized, widgetLayout: normalized.widgetLayout || null};
        const current = {...appearance, widgetLayout: appearance.widgetLayout || null};
        return <Option key={design.id} label={design.name} accessibilityLabel={`Apply saved layout ${design.name}`}
          selected={JSON.stringify(current) === JSON.stringify(saved)} disabled={!ready || loading}
          preview={<LayoutPreview cards={saved.cards} appearance={saved}/>}
          onPress={() => applySavedLayout(design.appearance)}/>;
      })}
    </View>
    {loading && <Text style={[styles.description, copy]}>Loading saved layouts…</Text>}
    {!loading && !error && !designs.length && <Text style={[styles.description, copy]}>No saved layouts yet. Use Save design on the companion site to add one.</Text>}
    {error && <Text accessibilityRole='alert' style={[styles.description, copy]}>{error}</Text>}
    <Option label='Refresh saved layouts' disabled={!ready || loading} onPress={() => setRefresh((value) => value + 1)}/>
  </>;
}
