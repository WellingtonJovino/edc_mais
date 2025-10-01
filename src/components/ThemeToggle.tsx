'use client';

import { useTheme } from '@/contexts/ThemeContext';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`
        flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-300 transform hover:scale-105
        ${isDarkMode
          ? 'bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 hover:text-yellow-300'
          : 'bg-gray-200/80 hover:bg-gray-300/80 text-gray-700 hover:text-gray-900'
        }
        backdrop-blur-sm border
        ${isDarkMode ? 'border-yellow-500/30' : 'border-gray-300/50'}
      `}
      title={isDarkMode ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
    >
      {isDarkMode ? (
        <Sun className="w-5 h-5 transition-transform duration-300" />
      ) : (
        <Moon className="w-5 h-5 transition-transform duration-300" />
      )}
    </button>
  );
}