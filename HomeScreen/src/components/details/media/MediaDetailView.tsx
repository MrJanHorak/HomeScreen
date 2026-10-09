import Pressable from '../../shared/NarratedPressable';
import Text from '../../shared/ReadingText';
import React, { useState } from 'react';
import {View, StyleSheet, ScrollView, Platform, Modal} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../../theme/ThemeContext';
import { mockContinueWatching } from '../../../data/mockData';
import { useWatchNext } from '../../../hooks/useWatchNext';
import type { WatchNextItem } from '../../../hooks/useWatchNext';
import WatchPoster from '../../shared/WatchPoster';
import {useDetailLayout} from '../../shared/DetailLayout';

export default function MediaDetailView() {
  const theme = useTheme();
  const [selectedShow, setSelectedShow] = useState(mockContinueWatching[0]);

  if (Platform.OS === 'android') return <AndroidWatchDetail />;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Featured Selected Hero Banner */}
      <View style={styles.heroBanner}>
        <View style={styles.heroContent}>
          <View style={styles.tagRow}>
            <View style={styles.typeBadge}>
              <Text style={styles.typeBadgeText}>{selectedShow.type.toUpperCase()}</Text>
            </View>
            <Text style={[styles.remainingText, { color: theme.colors.focusRing }]}>
              {selectedShow.remaining} remaining
            </Text>
          </View>

          <Text style={[styles.showTitle, { color: theme.colors.textPrimary }]}>
            {selectedShow.title}
          </Text>

          {selectedShow.season && (
            <Text style={[styles.episodeTitle, { color: theme.colors.textSecondary }]}>
              Season {selectedShow.season} • Episode {selectedShow.episode}: "{selectedShow.episodeTitle}"
            </Text>
          )}

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${selectedShow.progress * 100}%`, backgroundColor: theme.colors.focusRing },
                ]}
              />
            </View>
            <Text style={[styles.progressPercent, { color: theme.colors.textSecondary }]}>
              {Math.round(selectedShow.progress * 100)}% watched
            </Text>
          </View>

          {/* The queue is a design preview until a media source is connected. */}
          <View style={styles.playButton}>
            <MaterialCommunityIcons name="play" size={24} color="#FFFFFF" />
            <Text style={styles.playButtonText}>Sample queue</Text>
          </View>
        </View>
      </View>

      {/* Continue Watching Carousel */}
      <View style={styles.carouselSection}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
          Sample Watch Queue ({mockContinueWatching.length})
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.showsRow}>
          {mockContinueWatching.map((item) => {
            const isSelected = item.id === selectedShow.id;
            return (
              <Pressable
                key={item.id}
                onPress={() => setSelectedShow(item)}
                style={[
                  styles.showCard,
                  isSelected && [
                    styles.showCardSelected,
                    { borderColor: theme.colors.focusRing },
                  ],
                ]}
              >
                <View style={styles.cardHeader}>
                  <MaterialCommunityIcons
                    name={item.type === 'Movie' ? 'movie' : 'television-classic'}
                    size={22}
                    color={theme.colors.focusRing}
                  />
                  <Text style={[styles.cardDuration, { color: theme.colors.textSecondary }]}>
                    {item.duration}
                  </Text>
                </View>

                <Text
                  numberOfLines={1}
                  style={[styles.cardTitle, { color: theme.colors.textPrimary }]}
                >
                  {item.title}
                </Text>

                <Text
                  numberOfLines={1}
                  style={[styles.cardSub, { color: theme.colors.textSecondary }]}
                >
                  {item.episodeTitle || item.type}
                </Text>

                {/* Progress bar on thumbnail */}
                <View style={styles.thumbProgressTrack}>
                  <View
                    style={[
                      styles.thumbProgressFill,
                      { width: `${item.progress * 100}%`, backgroundColor: theme.colors.focusRing },
                    ]}
                  />
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </ScrollView>
  );
}

export function AndroidWatchDetail() {
  const theme = useTheme();
  const {compact} = useDetailLayout();
  const { items, hidden, status, refresh, requestAccess, openProgram, feature, hide, restore } = useWatchNext();
  const [focusedId, setFocusedId] = useState<number | null>(null);
  const [pendingHide, setPendingHide] = useState<WatchNextItem | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  const [launchError, setLaunchError] = useState(false);
  const selected = items[0];
  const progress = selected?.positionMs != null && selected.durationMs && selected.durationMs > 0
    ? Math.min(1, selected.positionMs / selected.durationMs) : null;
  const closeActions = () => { setPendingHide(null); setShowHidden(false); };
  const hiddenButton = hidden.length > 0 && (
    <Pressable onPress={() => setShowHidden(true)} style={({ focused }) => [styles.hiddenButton, focused && styles.hiddenButtonFocused]}>
      <Text style={[styles.hiddenButtonText, { color: theme.colors.textPrimary }]}>Hidden titles ({hidden.length})</Text>
    </Pressable>
  );
  const actions = (
    <Modal transparent visible={!!pendingHide || showHidden} animationType="fade" onRequestClose={closeActions}>
      <View style={styles.actionsScrim}>
        <View style={styles.actionsPanel}>
          {pendingHide ? (
            <>
              <Text style={[styles.actionsTitle, { color: theme.colors.textPrimary }]}>Hide {pendingHide.title}?</Text>
              <Text style={[styles.actionsDescription, { color: theme.colors.textSecondary }]}>
                It will stay off this dashboard, including when the app publishes another episode. You can restore it from Hidden titles.
              </Text>
              <Pressable hasTVPreferredFocus onPress={() => { void hide(pendingHide); closeActions(); }}
                style={({ focused }) => [styles.actionOption, focused && styles.actionOptionFocused]}>
                <MaterialCommunityIcons name="eye-off-outline" size={22} color="#FFFFFF" />
                <Text style={styles.actionOptionText}>Hide from Continue Watching</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={[styles.actionsTitle, { color: theme.colors.textPrimary }]}>Hidden titles</Text>
              <ScrollView style={styles.hiddenList}>
                {hidden.map((entry, index) => (
                  <Pressable key={entry.key} hasTVPreferredFocus={index === 0}
                    onPress={() => { void restore(entry.key); if (hidden.length === 1) closeActions(); }}
                    style={({ focused }) => [styles.actionOption, focused && styles.actionOptionFocused]}>
                    <MaterialCommunityIcons name="restore" size={22} color="#FFFFFF" />
                    <Text numberOfLines={1} style={styles.actionOptionText}>Restore {entry.title} · {entry.appName}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </>
          )}
          <Pressable onPress={closeActions} style={({ focused }) => [styles.actionOption, styles.cancelOption, focused && styles.actionOptionFocused]}>
            <Text style={styles.actionOptionText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );

  if (status !== 'ready' || items.length === 0) {
    const message = status === 'permission'
      ? 'Allow TV listings access to show unfinished titles from apps that publish to Play Next.'
      : status === 'unavailable'
        ? 'The Android Watch Next reader is unavailable. Rebuild and reinstall the Android app.'
        : status === 'error'
          ? 'The TV did not allow this app to read Play Next. Check TV listings permission and try again.'
          : status === 'ready'
            ? hidden.length > 0
              ? 'All current Play Next titles are hidden. Open Hidden titles to restore one.'
              : 'No unfinished titles are currently published to Play Next on this TV.'
            : 'Checking TV Play Next…';
    return (<>
      <View style={styles.heroBanner}>
        <Text style={[styles.showTitle, { color: theme.colors.textPrimary }]}>TV Continue Watching</Text>
        <Text style={[styles.episodeTitle, { color: theme.colors.textSecondary }]}>{message}</Text>
        {(status === 'permission' || status === 'ready' || status === 'error') && (
          <Pressable onPress={status === 'permission' ? requestAccess : refresh} style={styles.playButton}>
            <MaterialCommunityIcons name={status === 'permission' ? 'lock-open-outline' : 'refresh'} size={24} color="#FFFFFF" />
            <Text style={styles.playButtonText}>{status === 'permission' ? 'Enable TV access' : 'Refresh'}</Text>
          </Pressable>
        )}
        {hiddenButton}
      </View>
      {actions}
    </>);
  }

  return (
    <>
    <ScrollView style={styles.container} showsVerticalScrollIndicator>
      <View style={[styles.heroBanner, styles.androidHero, compact && {padding: 12, gap: 16, marginBottom: 12}]}>
        <WatchPoster uri={selected.posterUri} width={compact ? 90 : 130} height={compact ? 135 : 195} />
        <View style={styles.androidHeroBody}>
          <Text style={[styles.sourceText, { color: theme.colors.focusRing }]}>
            {selected.appName || selected.packageName || 'TV app'}
          </Text>
          <Text style={[styles.showTitle, compact && {fontSize: 24}, { color: theme.colors.textPrimary }]}>{selected.title}</Text>
          <Text style={[styles.episodeTitle, { color: theme.colors.textSecondary }]}>
            {[selected.season && `Season ${selected.season}`, selected.episode && `Episode ${selected.episode}`, selected.episodeTitle].filter(Boolean).join(' · ') || 'From TV Play Next'}
          </Text>
          {progress != null && (
            <View style={styles.progressContainer}>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: theme.colors.focusRing }]} />
              </View>
              <Text style={[styles.progressPercent, { color: theme.colors.textSecondary }]}>{Math.round(progress * 100)}% watched</Text>
            </View>
          )}
          <Pressable
            onPress={async () => setLaunchError(!(await openProgram(selected.id)))}
            style={styles.playButton}
          >
            <MaterialCommunityIcons name="play" size={24} color="#FFFFFF" />
            <Text style={styles.playButtonText}>Resume in app</Text>
          </Pressable>
          {launchError && <Text style={[styles.episodeTitle, { color: theme.colors.textSecondary }]}>This title could not be opened by its app.</Text>}
        </View>
      </View>
      <View style={styles.carouselSection}>
        <View style={styles.sectionHeadingRow}>
          <View>
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>From TV Play Next ({items.length})</Text>
            <Text style={[styles.sectionHint, { color: theme.colors.textSecondary }]}>Select to move to Up Next · Hold to hide</Text>
          </View>
          {hiddenButton}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.showsRow}>
          {items.map(item => (
            <Pressable
              key={item.id}
              onFocus={() => setFocusedId(item.id)}
              onBlur={() => setFocusedId(current => current === item.id ? null : current)}
              onPress={() => { void feature(item); setLaunchError(false); }}
              onLongPress={() => setPendingHide(item)}
              delayLongPress={600}
              accessibilityLabel={`${item.title}, ${item.appName || item.packageName || 'TV app'}${selected.id === item.id ? ', up next' : ''}. Select to make up next. Hold to hide.`}
              style={[styles.showCard, styles.androidShowCard,
                compact && {height: 136, padding: 10},
                selected.id === item.id && styles.androidCardFeatured,
                focusedId === item.id && [styles.androidCardFocused, { borderColor: theme.colors.focusRing }]]}
            >
              <View style={styles.androidCardRow}>
                <WatchPoster uri={item.posterUri} width={58} height={82} />
                <View style={styles.androidCardText}>
                  <Text numberOfLines={2} style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>{item.title}</Text>
                  <Text numberOfLines={1} style={[styles.androidCardSub, { color: theme.colors.focusRing }]}>
                    {item.appName || item.packageName || 'TV app'}
                  </Text>
                  <Text numberOfLines={1} style={[styles.androidCardSub, { color: theme.colors.textSecondary }]}>
                    {item.episodeTitle || (item.season && item.episode ? `Season ${item.season} · Episode ${item.episode}` : 'Ready to resume')}
                  </Text>
                </View>
              </View>
              <View style={styles.androidCardFooter}>
                <Text style={[styles.featuredLabel, { color: selected.id === item.id ? theme.colors.focusRing : theme.colors.textSecondary }]}>
                  {selected.id === item.id ? 'UP NEXT' : ' '}
                </Text>
                <View style={styles.thumbProgressTrack}>
                  {item.positionMs != null && item.durationMs != null && item.durationMs > 0 && (
                    <View style={[styles.thumbProgressFill, {
                      width: `${Math.min(100, item.positionMs / item.durationMs * 100)}%`,
                      backgroundColor: theme.colors.focusRing,
                    }]} />
                  )}
                </View>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </ScrollView>
    {actions}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heroBanner: {
    padding: 24,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 24,
  },
  androidHero: { flexDirection: 'row', gap: 24, alignItems: 'flex-start' },
  androidHeroBody: { flex: 1 },
  sourceText: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  androidCardRow: { flexDirection: 'row', gap: 10, height: 82 },
  androidCardText: { flex: 1, justifyContent: 'space-between' },
  androidCardSub: { fontSize: 13, fontWeight: '500' },
  androidCardFooter: { marginTop: 'auto', gap: 8, minHeight: 26, justifyContent: 'flex-end' },
  featuredLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  androidShowCard: { height: 166, justifyContent: 'flex-start' },
  androidCardFeatured: { backgroundColor: 'rgba(56, 189, 248, 0.10)', borderColor: 'rgba(56, 189, 248, 0.4)' },
  androidCardFocused: {
    backgroundColor: 'rgba(56, 189, 248, 0.22)',
    borderWidth: 3,
    transform: [{ scale: 1.04 }],
    elevation: 12,
    shadowColor: '#38BDF8',
    shadowOpacity: 0.8,
    shadowRadius: 16,
  },
  sectionHeadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionHint: { fontSize: 12, fontWeight: '500' },
  hiddenButton: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)' },
  hiddenButtonFocused: { backgroundColor: 'rgba(56, 189, 248, 0.22)', borderColor: '#38BDF8' },
  hiddenButtonText: { fontSize: 13, fontWeight: '700' },
  actionsScrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.76)', alignItems: 'center', justifyContent: 'center' },
  actionsPanel: { width: 560, maxWidth: '90%', maxHeight: '75%', padding: 26, borderRadius: 20, backgroundColor: '#101C31', borderWidth: 1, borderColor: '#37506D', gap: 14 },
  actionsTitle: { fontSize: 26, fontWeight: '800' },
  actionsDescription: { fontSize: 15, lineHeight: 22 },
  actionOption: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 12, borderWidth: 2, borderColor: 'rgba(255,255,255,0.16)', backgroundColor: 'rgba(255,255,255,0.06)' },
  actionOptionFocused: { borderColor: '#38BDF8', backgroundColor: 'rgba(56, 189, 248, 0.25)' },
  actionOptionText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', flexShrink: 1 },
  cancelOption: { justifyContent: 'center' },
  hiddenList: { maxHeight: 300 },
  heroContent: {
    maxWidth: 700,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F8FAFC',
    letterSpacing: 0.5,
  },
  remainingText: {
    fontSize: 14,
    fontWeight: '600',
  },
  showTitle: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 4,
  },
  episodeTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 16,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 18,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressPercent: {
    fontSize: 13,
    fontWeight: '600',
    minWidth: 80,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 14,
    backgroundColor: '#0284C7',
    gap: 8,
    borderWidth: 1.5,
    borderColor: 'transparent',
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.15s ease',
      } as any,
    }),
  },
  playButtonFocused: {
    transform: [{ scale: 1.05 }],
    ...Platform.select({
      web: {
        boxShadow: '0 0 20px rgba(56, 189, 248, 0.5)',
      } as any,
    }),
  },
  playButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  carouselSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 14,
  },
  showsRow: {
    flexDirection: 'row',
  },
  showCard: {
    width: 200,
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginRight: 14,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.15s ease',
      } as any,
    }),
  },
  showCardSelected: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardDuration: {
    fontSize: 12,
    fontWeight: '500',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardSub: {
    fontSize: 13,
    marginBottom: 14,
  },
  thumbProgressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  thumbProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
});
