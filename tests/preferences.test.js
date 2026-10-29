const test = require('node:test');
const assert = require('node:assert/strict');

const { DEFAULT_THEME, THEMES, loadTheme, saveTheme } = require('../preferences.js');

function createStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

test('uses the neon theme by default', () => {
  assert.equal(DEFAULT_THEME, 'neon');
  assert.equal(loadTheme(createStorage()), DEFAULT_THEME);
});

test('accepts and persists supported themes', () => {
  const storage = createStorage();

  assert.equal(saveTheme('ember', storage), true);
  assert.equal(loadTheme(storage), 'ember');
  assert.equal(saveTheme('matrix', storage), true);
  assert.equal(loadTheme(storage), 'matrix');
});

test('rejects unsupported themes without overwriting the saved preference', () => {
  const storage = createStorage({ 'ppt-theme': 'ember' });

  assert.equal(saveTheme('unknown-theme', storage), false);
  assert.equal(loadTheme(storage), 'ember');
});

test('falls back safely when stored theme data is invalid or storage fails', () => {
  assert.equal(loadTheme(createStorage({ 'ppt-theme': 'not-a-theme' })), DEFAULT_THEME);
  assert.equal(loadTheme({ getItem: () => { throw new Error('storage blocked'); } }), DEFAULT_THEME);
  assert.equal(saveTheme('ember', { setItem: () => { throw new Error('storage blocked'); } }), false);
});

test('exposes only the supported theme identifiers', () => {
  assert.deepEqual(THEMES, ['neon', 'ember', 'matrix']);
});
