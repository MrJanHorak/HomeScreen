import { useEffect, useState } from 'react';
import { ActivityIndicator, BackHandler, Image, Platform, StatusBar, StyleSheet, Text, View } from 'react-native';
import { ThemeProvider, useAppearance } from './src/theme/ThemeContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { DashboardProvider } from './src/context/DashboardContext';
import TVScreenWrapper from './src/components/layout/TVScreenWrapper';
import HomeScreen from './src/screens/HomeScreen';
import PairingScreen from './src/screens/PairingScreen';
import { WatchNextProvider } from './src/hooks/useWatchNext';
import { FavoriteAppsProvider } from './src/hooks/useFavoriteApps';
import ExitConfirmationModal from './src/components/layout/ExitConfirmationModal';
import {PollsProvider} from './src/context/PollsContext';
import {PeopleProvider} from './src/context/PeopleContext';
import {NarrationProvider} from './src/accessibility/NarrationContext';

import backgroundImage from './assets/media/wp8860764-nasa-4k-wallpapers.jpg';

function StartupScreen() {
  return (
    <View style={styles.startup} accessibilityLabel="HomeScreen is loading">
      <Image source={require('./assets/homescreen-splash.png')} style={styles.startupMark} />
      <Text style={styles.startupTitle}>HomeScreen</Text>
      <ActivityIndicator size="large" color="#38BDF8" style={styles.startupSpinner} />
    </View>
  );
}

function Root() {
  const { user, initializing } = useAuth();
  const { ready } = useAppearance();
  if (initializing || (user && !ready)) return <StartupScreen />;

  // DashboardProvider only mounts once signed in, so it never fetches anonymously
  return user ? (
    <DashboardProvider key={user.uid}>
      <WatchNextProvider>
        <FavoriteAppsProvider>
          <PeopleProvider><PollsProvider><HomeScreen /></PollsProvider></PeopleProvider>
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
      <TVScreenWrapper backgroundImage={selectedBackground} backgroundZoom={appearance.backgroundZoom}>
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
        <NarrationProvider><ThemedScreen /></NarrationProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  startup: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  startupMark: { width: 150, height: 150 },
  startupTitle: { marginTop: 8, color: '#F0F9FF', fontSize: 28, fontWeight: '700' },
  startupSpinner: { marginTop: 28 },
});
