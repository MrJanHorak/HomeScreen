import React, { useState } from 'react';
import { View, StyleSheet, Text, ScrollView, Pressable, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { mockContinueWatching } from '../../data/mockData';

export default function MediaDetailView() {
  const theme = useTheme();
  const [selectedShow, setSelectedShow] = useState(mockContinueWatching[0]);

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
