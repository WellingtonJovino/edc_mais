'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  isDarkMode: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const [theme, setTheme] = useState<Theme>('light');
  const [isLoaded, setIsLoaded] = useState(false);

  // Detectar preferência do sistema e do localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('edc-theme') as Theme;
    const systemPreference = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

    const initialTheme = savedTheme || systemPreference;
    setTheme(initialTheme);
    setIsLoaded(true);
  }, []);

  // Salvar tema no localStorage quando mudar
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('edc-theme', theme);
    }
  }, [theme, isLoaded]);

  // Aplicar background no body baseado no tema
  useEffect(() => {
    if (isLoaded) {
      if (theme === 'dark') {
        document.body.style.backgroundColor = '#000618';
      } else {
        document.body.style.backgroundColor = '#eff6ff'; // blue-50
      }
    }
  }, [theme, isLoaded]);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  const value = {
    theme,
    toggleTheme,
    isDarkMode: theme === 'dark',
  };

  // Não renderizar até carregar o tema para evitar flash
  if (!isLoaded) {
    return null;
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};