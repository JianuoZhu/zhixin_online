import { createContext, useEffect, useMemo, useState } from "react";

export type ThemeName = "blue" | "green" | "orange" | "rose";

interface ThemeContextType {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
}

interface ThemePalette {
  accent: Record<string, string>;
  /** Gradient start color */
  gradientFrom: string;
  /** Gradient end color */
  gradientTo: string;
  /** Page background tint */
  bg: string;
  /** Preview swatch */
  swatch: string;
}

const themes: Record<ThemeName, ThemePalette> = {
  blue: {
    accent: {
      50: "#eff6ff", 100: "#dbeafe", 200: "#bfdbfe", 300: "#93c5fd",
      400: "#60a5fa", 500: "#3b82f6", 600: "#2563eb", 700: "#1d4ed8",
      800: "#1e40af", 900: "#1e3a8a", 950: "#172554",
    },
    gradientFrom: "#2563eb",
    gradientTo: "#7c3aed",
    bg: "#f0f4ff",
    swatch: "#3b82f6",
  },
  green: {
    accent: {
      50: "#ecfdf5", 100: "#d1fae5", 200: "#a7f3d0", 300: "#6ee7b7",
      400: "#34d399", 500: "#10b981", 600: "#059669", 700: "#047857",
      800: "#065f46", 900: "#064e3b", 950: "#022c22",
    },
    gradientFrom: "#059669",
    gradientTo: "#0d9488",
    bg: "#f0fdf6",
    swatch: "#10b981",
  },
  orange: {
    accent: {
      50: "#fff7ed", 100: "#ffedd5", 200: "#fed7aa", 300: "#fdba74",
      400: "#fb923c", 500: "#f97316", 600: "#ea580c", 700: "#c2410c",
      800: "#9a3412", 900: "#7c2d12", 950: "#431407",
    },
    gradientFrom: "#ea580c",
    gradientTo: "#dc2626",
    bg: "#fff8f0",
    swatch: "#f97316",
  },
  rose: {
    accent: {
      50: "#fff1f2", 100: "#ffe4e6", 200: "#fecdd3", 300: "#fda4af",
      400: "#fb7185", 500: "#f43f5e", 600: "#e11d48", 700: "#be123c",
      800: "#9f1239", 900: "#881337", 950: "#4c0519",
    },
    gradientFrom: "#e11d48",
    gradientTo: "#9333ea",
    bg: "#fff5f6",
    swatch: "#f43f5e",
  },
};

const VALID_THEMES = Object.keys(themes) as ThemeName[];

const defaultContextValue: ThemeContextType = {
  theme: "blue",
  setTheme: () => {},
};

export const ThemeContext = createContext<ThemeContextType>(defaultContextValue);

export const ThemeProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeName>(() => {
    const stored = localStorage.getItem("theme");
    return VALID_THEMES.includes(stored as ThemeName) ? (stored as ThemeName) : "blue";
  });

  useEffect(() => {
    const root = window.document.documentElement;
    const t = themes[theme];

    // Set accent color CSS variables
    Object.entries(t.accent).forEach(([key, value]) => {
      root.style.setProperty(`--color-primary-${key}`, value);
    });

    // Set gradient and background colors
    root.style.setProperty("--color-gradient-from", t.gradientFrom);
    root.style.setProperty("--color-gradient-to", t.gradientTo);
    root.style.setProperty("--color-page-bg", t.bg);

    root.dataset.theme = theme;
    localStorage.setItem("theme", theme);
  }, [theme]);

  const value = useMemo(() => ({ theme, setTheme: setThemeState }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export { themes };
