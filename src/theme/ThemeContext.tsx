import React, { createContext, useContext } from 'react';
import { TVTheme, TVThemeType } from './tvTheme';

const ThemeContext = createContext<TVThemeType>(TVTheme);

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  return (
    <ThemeContext.Provider value={TVTheme}>{children}</ThemeContext.Provider>
  );
};

export const useTheme = (): TVThemeType => useContext(ThemeContext);
