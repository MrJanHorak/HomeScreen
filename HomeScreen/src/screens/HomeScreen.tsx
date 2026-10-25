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
import AmbientWakeControl from '../components/ambient/AmbientWakeControl';
import {useNarration} from '../accessibility/NarrationContext';
import {ScreenFocusProvider, ScreenFocusRestorer} from '../navigation/ScreenFocus';
import DashboardFocusFrame from '../navigation/DashboardFocusFrame';

function HomeScreenContent() {
  const { error, lastUpdated, isCached } = useDashboard();
  const savedData = lastUpdated ? `Last updated ${new Date(lastUpdated).toLocaleString()}` : '';
  const syncMessage = error
    ? `Refresh delayed · Retrying automatically${savedData ? ` · ${savedData}` : ''}`
    : isCached && lastUpdated
      ? `Showing saved data · ${savedData} · Updating…`
      : null;
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

  return (
    <View style={styles.container}>
      <ScreenFocusRestorer active={activeModal === null && !ambient.active}/>
      <DashboardFocusFrame hidden={ambient.active} style={styles.container}>
        <HeaderBar onOpenSettings={() => setActiveModal('settings')} />

        <DashboardLayout cards={appearance.cards} grid={appearance.grid} widgetLayout={appearance.widgetLayout} onOpen={setActiveModal} />

        <FavoriteAppsCarousel />

        {/* Reserve a quiet footer so connection changes never move the cards. */}
        <View style={styles.syncStatus} pointerEvents="none">
          {syncMessage && <TVText
            text={syncMessage}
            typography="caption"
            color="textSecondary"
            numberOfLines={1}
            style={styles.syncText}
          />}
        </View>
      </DashboardFocusFrame>

      {ambient.active && <View style={[styles.ambientFrame, {
        top: compact ? -16 : -theme.spacing.safeVertical,
        bottom: compact ? -16 : -theme.spacing.safeVertical,
        left: compact ? -30 : -theme.spacing.safeHorizontal,
        right: compact ? -30 : -theme.spacing.safeHorizontal,
      }]}>
        <AmbientScreen preference={appearance.ambient} selectedPhotos={ambientPhotos} />
        <AmbientWakeControl onWake={ambient.wake}/>
      </View>}

      <DashboardDetailModal topic={activeModal} onClose={closeModal} onPreviewAmbient={previewAmbient} />
    </View>
  );
}

export default function HomeScreen() {
  return <ScreenFocusProvider><HomeScreenContent /></ScreenFocusProvider>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  syncStatus: { height: 24, paddingTop: 4, alignItems: 'flex-end', justifyContent: 'center' },
  syncText: { fontSize: 14, lineHeight: 18 },
  ambientFrame: { position: 'absolute' },
});
