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
import {useFeedVisibility} from '../context/FeedsContext';
import { useAppearance, useTheme } from '../theme/ThemeContext';
import useCompactTVLayout from '../hooks/useCompactTVLayout';
import useAmbientMode from '../components/ambient/useAmbientMode';
import AmbientScreen from '../components/ambient/AmbientScreen';
import {useNarration} from '../accessibility/NarrationContext';

function HomeScreen() {
  const { error, lastUpdated } = useDashboard();
  const savedData = lastUpdated ? `Last updated ${new Date(lastUpdated).toLocaleString()}` : '';
  const { appearance, ambientPhotos } = useAppearance();
  const theme = useTheme();
  const compact = useCompactTVLayout();
  const [activeModal, setActiveModal] = useState<DetailTopic | null>(null);
  const {stop} = useNarration();
  const ambient = useAmbientMode(
    appearance.ambient.enabled, appearance.ambient.idleMinutes, activeModal !== null
  );
  const setVisible = usePollVisibility();
  const setFeedsVisible = useFeedVisibility();
  useEffect(() => {setFeedsVisible(!ambient.active);}, [ambient.active, setFeedsVisible]);
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

      <DashboardLayout cards={appearance.cards} grid={appearance.grid} widgetLayout={appearance.widgetLayout} onOpen={setActiveModal} />

      <FavoriteAppsCarousel />

      {/* Reserve a quiet footer so connection changes never move the cards. */}
      <View style={styles.syncStatus} pointerEvents="none">
        {error && <TVText
          text={`Refresh delayed · Retrying automatically${savedData ? ` · ${savedData}` : ''}`}
          typography="caption"
          color="textSecondary"
          numberOfLines={1}
          style={styles.syncText}
        />}
      </View>

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
  syncStatus: { height: 24, paddingTop: 4, alignItems: 'flex-end', justifyContent: 'center' },
  syncText: { fontSize: 14, lineHeight: 18 },
  ambientFrame: { position: 'absolute' },
});
