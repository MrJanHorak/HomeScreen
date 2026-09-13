import React from 'react';
import { StatusBar } from 'react-native';
import { ThemeProvider } from './src/theme/ThemeContext';
import HomeScreen from './src/screens/HomeScreen';
export default function App() {
  return (
    <ThemeProvider>
      <StatusBar hidden />
      <HomeScreen />
    </ThemeProvider>
  );
}
