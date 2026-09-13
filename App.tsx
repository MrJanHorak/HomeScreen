import { StatusBar } from 'react-native';
import { ThemeProvider } from './src/theme/ThemeContext';
import TVScreenWrapper from './src/components/layout/TVScreenWrapper';
import HomeScreen from './src/screens/HomeScreen';

export default function App() {
  return (
    <ThemeProvider>
      <StatusBar hidden />
      <TVScreenWrapper>
        <HomeScreen />
      </TVScreenWrapper>
    </ThemeProvider>
  );
}
