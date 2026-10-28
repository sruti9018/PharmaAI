"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

interface ThemeContextType {
  isDarkMode: boolean;
  mounted: boolean;
  toggleDarkMode: () => void;
  setDarkMode: (val: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  isDarkMode: false,
  mounted: false,
  toggleDarkMode: () => {},
  setDarkMode: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    setIsDarkMode(false);
    document.documentElement.classList.remove("dark");
    localStorage.removeItem("pharmalink_theme");
  }, []);

  const toggleDarkMode = () => {
    // Dark mode removed per user request: maintain clean white medical theme
    setIsDarkMode(false);
    document.documentElement.classList.remove("dark");
  };

  const setDarkMode = () => {
    setIsDarkMode(false);
    document.documentElement.classList.remove("dark");
  };

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleDarkMode, setDarkMode, mounted }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

