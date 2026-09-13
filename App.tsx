import { StatusBar } from 'react-native';
import { ThemeProvider } from './src/theme/ThemeContext';
import TVScreenWrapper from './src/components/layout/TVScreenWrapper';
import HomeScreen from './src/screens/HomeScreen';

import backgroundImage from './assets/media/wp8860764-nasa-4k-wallpapers.jpg';

export default function App() {
  return (
    <ThemeProvider>
      <StatusBar hidden />
      <TVScreenWrapper backgroundImage={backgroundImage}>
        <HomeScreen />
      </TVScreenWrapper>
    </ThemeProvider>
  );
}