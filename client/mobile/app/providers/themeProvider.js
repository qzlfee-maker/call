import darkTheme from '../../theme/themes/darkTheme.json' assert { type: 'json' };
import lightTheme from '../../theme/themes/lightTheme.json' assert { type: 'json' };
import telegramTheme from '../../theme/themes/telegramTheme.json' assert { type: 'json' };
import colors from '../../theme/colors.json' assert { type: 'json' };
import typography from '../../theme/typography.json' assert { type: 'json' };
import spacing from '../../theme/spacing.json' assert { type: 'json' };

const THEME_KEY = 'crane_theme';

const THEMES = {
  dark: darkTheme,
  light: lightTheme,
  telegram: telegramTheme,
};

export class ThemeProvider {
  constructor() {
    this.currentThemeName = 'dark';
    this.currentTheme = null;
    this.listeners = new Set();
  }

  async init() {
    const saved = localStorage.getItem(THEME_KEY) || 'dark';
    await this.setTheme(saved);
  }

  async setTheme(themeName) {
    const theme = THEMES[themeName];
    if (!theme) {
      console.warn(`[ThemeProvider] unknown theme: ${themeName}`);
      return;
    }

    this.currentThemeName = themeName;
    this.currentTheme = { ...theme, colors, typography, spacing };

    this._applyCSSVariables(this.currentTheme);
    localStorage.setItem(THEME_KEY, themeName);
    this._notifyListeners(themeName);
  }

  _applyCSSVariables(theme) {
    const root = document.documentElement;

    const vars = {
      '--color-bg': theme.background || '#0f0f18',
      '--color-panel': theme.panel || '#1a1a2e',
      '--color-primary': theme.primary || '#7a5cff',
      '--color-accent': theme.accent || '#ff5ad6',
      '--color-success': theme.success || '#00e676',
      '--color-danger': theme.danger || '#ff5252',
      '--color-text': theme.text || '#ffffff',
      '--color-text-secondary': theme.textSecondary || '#8a8a9a',
      '--color-border': theme.border || '#2a2a3e',
      '--color-bubble-out': theme.bubbleOut || '#7a5cff',
      '--color-bubble-in': theme.bubbleIn || '#1e1e30',
      '--color-input-bg': theme.inputBg || '#1e1e30',
      '--color-hover': theme.hover || '#ffffff14',
      '--color-active': theme.active || '#ffffff22',
      '--font-family': theme.typography?.fontFamily || "'Inter', sans-serif",
      '--font-size-xs': theme.typography?.xs || '11px',
      '--font-size-sm': theme.typography?.sm || '13px',
      '--font-size-md': theme.typography?.md || '15px',
      '--font-size-lg': theme.typography?.lg || '17px',
      '--font-size-xl': theme.typography?.xl || '20px',
      '--radius-sm': theme.spacing?.radiusSm || '6px',
      '--radius-md': theme.spacing?.radiusMd || '12px',
      '--radius-lg': theme.spacing?.radiusLg || '18px',
      '--radius-full': '9999px',
      '--transition': '0.2s ease',
    };

    for (const [key, value] of Object.entries(vars)) {
      root.style.setProperty(key, value);
    }

    document.body.setAttribute('data-theme', this.currentThemeName);
  }

  getTheme() {
    return this.currentTheme;
  }

  getThemeName() {
    return this.currentThemeName;
  }

  getAvailableThemes() {
    return Object.keys(THEMES);
  }

  onThemeChange(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  _notifyListeners(themeName) {
    this.listeners.forEach((fn) => fn(themeName));
  }
}
