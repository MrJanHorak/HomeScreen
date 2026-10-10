import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import TVText from '../components/shared/TVText';
import HeaderBar from '../components/dashboard/header/HeaderBar';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import FavoriteAppsCarousel from '../components/dashboard/favorites/FavoriteAppsCarousel';
import DashboardDetailModal from '../components/details/DashboardDetailModal';
import type {DetailTopic} from '../components/details/DashboardDetailModal';

import { useDashboard } from '../context/DashboardContext';
import {usePollVisibility} from '../context/PollsContext';
import { useAppearance, useTheme } from '../theme/ThemeContext';
import useCompactTVLayout from '../hooks/useCompactTVLayout';
import useAmbientMode from '../components/ambient/useAmbientMode';
import AmbientScreen from '../components/ambient/AmbientScreen';
import {useNarration} from '../accessibility/NarrationContext';

function HomeScreen() {
  const { error, isCached, lastUpdated } = useDashboard();
  const savedData = lastUpdated ? `Saved dashboard from ${new Date(lastUpdated).toLocaleString()}` : '';
  const { appearance, ambientPhotos } = useAppearance();
  const theme = useTheme();
  const compact = useCompactTVLayout();
  const [activeModal, setActiveModal] = useState<DetailTopic | null>(null);
  const {stop} = useNarration();
  const ambient = useAmbientMode(
    appearance.ambient.enabled, appearance.ambient.idleMinutes, activeModal !== null
  );
  const setVisible = usePollVisibility();
  useEffect(() => {setVisible(!ambient.active);}, [ambient.active, setVisible]);
  useEffect(() => {if (ambient.active) stop();}, [ambient.active, stop]);
  const closeModal = useCallback(() => {stop(); setActiveModal(null);}, [stop]);
  const previewAmbient = () => {
    setActiveModal(null);
    ambient.preview();
  };

  if (ambient.active) {
    return (
      <View style={styles.container}>
        <View style={[styles.ambientFrame, {
          top: compact ? -16 : -theme.spacing.safeVertical,
          bottom: compact ? -16 : -theme.spacing.safeVertical,
          left: compact ? -30 : -theme.spacing.safeHorizontal,
          right: compact ? -30 : -theme.spacing.safeHorizontal,
        }]}>
          <AmbientScreen preference={appearance.ambient} selectedPhotos={ambientPhotos} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <HeaderBar onOpenSettings={() => setActiveModal('settings')} />

      {(error || isCached) && (
        <View style={styles.errorBanner}>
          <TVText
            text={isCached
              ? `${savedData}. ${error ? 'Refresh unavailable; will retry.' : 'Refreshing…'}`
              : `Live data unavailable: ${error}${savedData ? `. ${savedData}` : ''}`}
            typography="caption"
            color="accent"
          />
        </View>
      )}

      <DashboardLayout cards={appearance.cards} grid={appearance.grid} widgetLayout={appearance.widgetLayout} onOpen={setActiveModal} />

      <FavoriteAppsCarousel />

      <DashboardDetailModal topic={activeModal} onClose={closeModal} onPreviewAmbient={previewAmbient} />
    </View>
  );
}

export default HomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  errorBanner: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  ambientFrame: { position: 'absolute' },
});
