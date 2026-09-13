import React, { createContext, useContext } from 'react';
import { TVTheme, TVThemeType } from './tvTheme';

const ThemeContext = createContext<TVThemeType>(TVTheme);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ThemeContext.Provider value={TVTheme}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook for easy access in functional components
export const useTheme = (): TVThemeType => useContext(ThemeContext);