import { useEffect, useState } from 'react';
import { BackHandler, Platform, StatusBar } from 'react-native';
import { ThemeProvider, useAppearance } from './src/theme/ThemeContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { DashboardProvider } from './src/context/DashboardContext';
import TVScreenWrapper from './src/components/layout/TVScreenWrapper';
import HomeScreen from './src/screens/HomeScreen';
import PairingScreen from './src/screens/PairingScreen';
import { WatchNextProvider } from './src/hooks/useWatchNext';
import { FavoriteAppsProvider } from './src/hooks/useFavoriteApps';
import ExitConfirmationModal from './src/components/ExitConfirmationModal';

import backgroundImage from './assets/media/wp8860764-nasa-4k-wallpapers.jpg';

function Root() {
  const { user, initializing } = useAuth();
  const { ready } = useAppearance();
  if (initializing || (user && !ready)) return null;

  // DashboardProvider only mounts once signed in, so it never fetches anonymously
  return user ? (
    <DashboardProvider>
      <WatchNextProvider>
        <FavoriteAppsProvider>
          <HomeScreen />
        </FavoriteAppsProvider>
      </WatchNextProvider>
    </DashboardProvider>
  ) : (
    <PairingScreen />
  );
}

function ThemedScreen() {
  const { appearance, photoDataUrl } = useAppearance();
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      setShowExitConfirmation(true);
      return true;
    });
    return () => subscription.remove();
  }, []);

  const selectedBackground = appearance.background === 'google-photo' && photoDataUrl
    ? { uri: photoDataUrl }
    : appearance.background === 'photo' ? backgroundImage : undefined;
  return (
    <>
      <StatusBar hidden />
      <TVScreenWrapper backgroundImage={selectedBackground}>
        <Root />
      </TVScreenWrapper>
      {Platform.OS === 'android' && (
        <ExitConfirmationModal
          visible={showExitConfirmation}
          onCancel={() => setShowExitConfirmation(false)}
          onExit={() => BackHandler.exitApp()}
        />
      )}
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <ThemedScreen />
      </ThemeProvider>
    </AuthProvider>
  );
}
