import { create } from 'zustand';

type Theme = 'light' | 'dark';
const THEME_KEY = 'kpi_theme';

function initialTheme(): Theme {
  const saved = localStorage.getItem(THEME_KEY) as Theme | null;
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** <html data-theme> に反映 */
function apply(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#0b0f17' : '#f5f6f8');
}

interface ThemeState {
  theme: Theme;
  toggle: () => void;
  set: (theme: Theme) => void;
}

export const useThemeStore = create<ThemeState>((set, get) => {
  const theme = initialTheme();
  apply(theme);
  return {
    theme,
    toggle: () => {
      const next = get().theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem(THEME_KEY, next);
      apply(next);
      set({ theme: next });
    },
    set: (t) => {
      localStorage.setItem(THEME_KEY, t);
      apply(t);
      set({ theme: t });
    },
  };
});
