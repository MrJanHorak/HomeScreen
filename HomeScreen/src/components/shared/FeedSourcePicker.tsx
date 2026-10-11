import {useState} from 'react';
import {View} from 'react-native';
import Text from './ReadingText';
import Option from '../settings/appearance/AppearanceOption';
import {useTheme} from '../../theme/ThemeContext';
import {FEED_CATALOG, FEED_CATEGORIES} from '../../../../server/functions/src/utils/feedConfig';

type Source = {url: string; title: string};
export default function FeedSourcePicker({selectedUrl, saved = [], disabled, onSelect, adding = false}: {
  selectedUrl?: string; saved?: Source[]; disabled?: boolean; onSelect: (source: Source) => void; adding?: boolean;
}) {
  const theme = useTheme();
  const [category, setCategory] = useState<string>(FEED_CATALOG.find((source) => source.url === selectedUrl)?.category || FEED_CATEGORIES[0]);
  const custom = saved.filter((source, index) => !FEED_CATALOG.some((preset) => preset.url === source.url) && saved.findIndex((other) => other.url === source.url) === index);
  const sources = category === 'Your sources' ? custom : FEED_CATALOG.filter((source) => source.category === category);
  return <View style={{gap: 12}}>
    <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 10}}>{[...FEED_CATEGORIES, ...(custom.length ? ['Your sources'] : [])].map((name) =>
      <Option key={name} label={name} selected={category === name} onPress={() => setCategory(name)} compact/>)}</View>
    {category === 'News & world' && <Text style={{color: theme.colors.textSecondary, fontSize: 16}}>Choose from different publishers and regions. Each widget follows the source you select.</Text>}
    <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 10}}>{sources.map((source) =>
      <Option key={source.url} label={adding ? `Add ${source.title} feed` : source.title} selected={!adding && source.url === selectedUrl} disabled={disabled}
        onPress={() => onSelect({url: source.url, title: source.title})} compact/>)}</View>
  </View>;
}
