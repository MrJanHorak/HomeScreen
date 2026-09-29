import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import useCompactTVLayout from '../../hooks/useCompactTVLayout';

interface MediaCardProps {
  title?: string;
  subtitle?: string;
  progress?: number;
  duration?: string;
}

export default function MediaCard({
  title = 'Severance',
  subtitle = 'S2 · E4: "The Grim"',
  progress = 0.65,
  duration = '24 min left',
}: MediaCardProps) {
  const theme = useTheme();
  const compact = useCompactTVLayout();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.headerRow, compact && styles.compactHeaderRow]}>
        <View style={styles.titleWithIcon}>
          <MaterialCommunityIcons
            name="movie-play-outline"
            size={compact ? 17 : 22}
            color={theme.colors.focusRing}
          />
          <Text style={[styles.headerTitle, compact && styles.compactTitle, { color: theme.colors.textPrimary }]}>
            UP NEXT
          </Text>
        </View>
        <View style={styles.liveBadge}>
          <Text style={[styles.liveBadgeText, compact && styles.compactBadgeText, { color: theme.colors.focusRing }]}>
            Preview
          </Text>
        </View>
      </View>

      {/* Media Content */}
      <View style={[styles.mediaBox, compact && styles.compactMediaBox]}>
        <View style={[styles.playIconCircle, compact && styles.compactPlayCircle]}>
          <MaterialCommunityIcons
            name="play"
            size={compact ? 18 : 24}
            color="#FFFFFF"
            style={{ marginLeft: 2 }}
          />
        </View>

        <View style={styles.metaColumn}>
          <Text
            numberOfLines={1}
            style={[styles.mediaTitle, compact && styles.compactMediaTitle, { color: theme.colors.textPrimary }]}
          >
            {title}
          </Text>
          <Text
            numberOfLines={1}
            style={[styles.mediaSubtitle, compact && styles.compactMediaSubtitle, { color: theme.colors.textSecondary }]}
          >
            {subtitle}
          </Text>
        </View>
      </View>

      {/* Progress Bar & Time */}
      <View style={styles.progressSection}>
        <View style={styles.progressBarTrack}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${progress * 100}%`, backgroundColor: theme.colors.focusRing },
            ]}
          />
        </View>
        <Text style={[styles.durationText, compact && styles.compactDuration, { color: theme.colors.textSecondary }]}>
          {duration}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    justifyContent: 'center',
    height: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
  },
  liveBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
  },
  liveBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  mediaBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    gap: 12,
    marginBottom: 10,
  },
  playIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(56, 189, 248, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaColumn: {
    flex: 1,
    justifyContent: 'center',
  },
  mediaTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  mediaSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  progressSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  progressBarTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  durationText: {
    fontSize: 12,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  compactHeaderRow: { marginBottom: 6 },
  compactTitle: { fontSize: 14 },
  compactBadgeText: { fontSize: 10 },
  compactMediaBox: { paddingVertical: 5, paddingHorizontal: 7, gap: 7, marginBottom: 6 },
  compactPlayCircle: { width: 30, height: 30, borderRadius: 15 },
  compactMediaTitle: { fontSize: 13 },
  compactMediaSubtitle: { fontSize: 10 },
  compactDuration: { fontSize: 10 },
});
