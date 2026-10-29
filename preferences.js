'use strict';

const STORAGE_KEY = 'ppt-theme';
const DEFAULT_THEME = 'neon';
const THEMES = ['neon', 'ember', 'matrix'];

function resolveStorage(storage) {
  if (storage) return storage;
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

function isSupportedTheme(theme) {
  return THEMES.includes(theme);
}

function loadTheme(storage, key = STORAGE_KEY) {
  const target = resolveStorage(storage);
  if (!target) return DEFAULT_THEME;

  try {
    const theme = target.getItem(key);
    return isSupportedTheme(theme) ? theme : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

function saveTheme(theme, storage, key = STORAGE_KEY) {
  if (!isSupportedTheme(theme)) return false;
  const target = resolveStorage(storage);
  if (!target) return false;

  try {
    target.setItem(key, theme);
    return true;
  } catch {
    return false;
  }
}

const Preferences = {
  STORAGE_KEY,
  DEFAULT_THEME,
  THEMES,
  isSupportedTheme,
  loadTheme,
  saveTheme,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Preferences;
}
if (typeof window !== 'undefined') {
  window.Preferences = Preferences;
}
