import { StatusBar } from 'react-native';
import { ThemeProvider } from './src/theme/ThemeContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { DashboardProvider } from './src/context/DashboardContext';
import TVScreenWrapper from './src/components/layout/TVScreenWrapper';
import HomeScreen from './src/screens/HomeScreen';
import PairingScreen from './src/screens/PairingScreen';

import backgroundImage from './assets/media/wp8860764-nasa-4k-wallpapers.jpg';

function Root() {
  const { user, initializing } = useAuth();
  if (initializing) return null;

  // DashboardProvider only mounts once signed in, so it never fetches anonymously
  return user ? (
    <DashboardProvider>
      <HomeScreen />
    </DashboardProvider>
  ) : (
    <PairingScreen />
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <StatusBar hidden />
        <TVScreenWrapper backgroundImage={backgroundImage}>
          <Root />
        </TVScreenWrapper>
      </AuthProvider>
    </ThemeProvider>
  );
}
