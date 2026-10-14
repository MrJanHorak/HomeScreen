import {useState} from 'react';
import {StyleSheet, View} from 'react-native';
import Text from './ReadingText';
import Option from '../settings/appearance/AppearanceOption';
import {useTheme} from '../../theme/ThemeContext';
import {FEED_CATALOG, FEED_CATEGORIES} from '../../../../server/functions/src/utils/feedConfig';

type Source = {url: string; title: string};
export default function FeedSourcePicker({selectedUrl, saved = [], disabled, onSelect, adding = false, feedback}: {
  selectedUrl?: string; saved?: Source[]; disabled?: boolean; onSelect: (source: Source) => void; adding?: boolean;
  feedback?: {url: string; text: string; error: boolean};
}) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const [category, setCategory] = useState<string>(FEED_CATALOG.find((source) => source.url === selectedUrl)?.category || FEED_CATEGORIES[0]);
  const custom = saved.filter((source, index) => !FEED_CATALOG.some((preset) => preset.url === source.url) && saved.findIndex((other) => other.url === source.url) === index);
  const sources = category === 'Your sources' ? custom : FEED_CATALOG.filter((source) => source.category === category);
  return <View style={styles.picker} onLayout={({nativeEvent}) => setWidth(nativeEvent.layout.width)}>
    <View style={styles.step}>
      <Text style={[styles.heading, {color: theme.colors.textPrimary}]}>1 · Choose a topic</Text>
      <View testID='feed-topics' style={styles.topics}>{[...FEED_CATEGORIES, ...(custom.length ? ['Your sources'] : [])].map((name) =>
        <Option key={name} label={name} selected={category === name} disabled={disabled} onPress={() => setCategory(name)} compact
          style={[styles.topic, {width: width >= 280 ? (width - 10) / 2 : '100%'}]}/>)}</View>
    </View>
    <View testID='feed-sources' style={[styles.step, styles.sources, {borderColor: theme.colors.glassBorder}]}>
      <Text style={[styles.heading, {color: theme.colors.textPrimary}]}>2 · {adding ? 'Add a feed source' : 'Choose a source'}</Text>
      <Text style={[styles.context, {color: theme.colors.textSecondary}]}>{category} · {sources.length} {sources.length === 1 ? 'source' : 'sources'}</Text>
      {sources.map((source) => <View key={source.url} style={{gap: 6}}>
        <Option label={source.title} subtitle={adding ? 'Add feed card' : undefined}
          accessibilityLabel={adding ? `Add ${source.title} feed` : source.title} selected={!adding && source.url === selectedUrl} disabled={disabled}
          onPress={() => onSelect({url: source.url, title: source.title})} compact style={styles.source}/>
        {feedback?.url === source.url && <Text accessibilityRole={feedback.error ? 'alert' : undefined} accessibilityLiveRegion='polite'
          style={[styles.context, {color: theme.colors.textPrimary}]}>{feedback.text}</Text>}
      </View>)}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  picker: {gap: 18},
  step: {gap: 10},
  heading: {fontSize: 15, fontWeight: '700'},
  context: {fontSize: 13, lineHeight: 18},
  topics: {flexDirection: 'row', flexWrap: 'wrap', gap: 10},
  topic: {minHeight: 64},
  sources: {borderTopWidth: 1, paddingTop: 16},
  source: {width: '100%', minHeight: 64},
});
