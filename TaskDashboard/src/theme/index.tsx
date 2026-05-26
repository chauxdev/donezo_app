import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Interface that defines the structure of the theme, including colors, spacing, border radius, and typography.
 */
export interface Theme {
  colors: {
    primary: string;
    primaryDark: string;
    primaryLight: string;
    secondary: string;
    success: string;
    warning: string;
    background: string;
    surface: string;
    surface2: string;
    textPrimary: string;
    textSecondary: string;
    textDisabled: string;
    border: string;
    divider: string;
    shadow: string;
  };
  spacing: typeof spacing;
  borderRadius: typeof borderRadius;
  typography: typeof typography;
}

/**
 * Color palette for the light mode.
 */
export const lightTheme: Theme['colors'] = {
  primary: '#0052CC',
  primaryDark: '#0747A6',
  primaryLight: '#DEEBFF',
  secondary: '#FF5630',
  success: '#36B37E',
  warning: '#FFAB00',
  background: '#F4F5F7',
  surface: '#FFFFFF',
  surface2: '#EBECF0',
  textPrimary: '#172B4D',
  textSecondary: '#5E6C84',
  textDisabled: '#A5ADBA',
  border: '#DFE1E6',
  divider: '#EBECF0',
  shadow: 'rgba(9, 30, 66, 0.13)',
};

/**
 * Color palette for the dark mode.
 */
export const darkTheme: Theme['colors'] = {
  primary: '#4C9AFF',
  primaryDark: '#0052CC',
  primaryLight: '#1D2125',
  secondary: '#FF7452',
  success: '#57D9A3',
  warning: '#FFC400',
  background: '#111217',
  surface: '#1D2125',
  surface2: '#22272B',
  textPrimary: '#B6C2CF',
  textSecondary: '#8C9BAB',
  textDisabled: '#596773',
  border: '#2C333A',
  divider: '#22272B',
  shadow: 'rgba(0,0,0,0.5)',
};

/**
 * Spacing system based on 8px grid.
 */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

/**
 * Border radius system.
 */
export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 20,
  xl: 24,
  full: 9999,
};

/**
 * Typography system.
 */
export const typography = {
  hero: { fontSize: 28, fontWeight: '800' as const, letterSpacing: -0.5 },
  h1: { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.3 },
  h2: { fontSize: 18, fontWeight: '600' as const },
  body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 22 },
  bodyMedium: { fontSize: 15, fontWeight: '500' as const },
  caption: { fontSize: 13, fontWeight: '400' as const },
  small: { fontSize: 11, fontWeight: '600' as const },
};

/**
 * Interface for the value provided by the ThemeContext.
 */
export interface ThemeContextValue {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
}

/**
 * Context that provides the current theme, dark mode status, and a toggle function.
 */
export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

/**
 * Hook to access the current theme context.
 * Must be used within a ThemeProvider.
 */
export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

/**
 * Props for the ThemeProvider component.
 */
export interface ThemeProviderProps {
  children: ReactNode;
}

/**
 * Component that provides the theme context to its children.
 * It manages the current theme based on the system color scheme and user preference stored in AsyncStorage.
 */
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [isDark, setIsDark] = useState<boolean>(systemColorScheme === 'dark');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        const storedPreference = await AsyncStorage.getItem('user_theme_preference');
        if (storedPreference !== null) {
          setIsDark(storedPreference === 'dark');
        } else {
          setIsDark(systemColorScheme === 'dark');
        }
      } catch (error: any) {
        console.error('Failed to load theme preference from AsyncStorage', error?.message || error);
      } finally {
        setIsMounted(true);
      }
    };

    loadThemePreference();
  }, [systemColorScheme]);

  const toggleTheme = async () => {
    const newThemeIsDark = !isDark;
    setIsDark(newThemeIsDark);
    try {
      await AsyncStorage.setItem('user_theme_preference', newThemeIsDark ? 'dark' : 'light');
    } catch (error: any) {
      console.error('Failed to save theme preference to AsyncStorage', error?.message || error);
    }
  };

  const theme: Theme = {
    colors: isDark ? darkTheme : lightTheme,
    spacing,
    borderRadius,
    typography,
  };

  if (!isMounted) {
    return null; // Prevent flash of incorrect theme while loading preference
  }

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
