'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');

test('every ID queried by the game controller exists in the HTML', () => {
  const queriedIds = [...app.matchAll(/getElementById\(['"]([^'"]+)['"]\)/g)]
    .map((match) => match[1]);
  const htmlIds = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]));
  const missingIds = [...new Set(queriedIds)].filter((id) => !htmlIds.has(id));

  assert.deepEqual(missingIds, []);
});

test('history module loads before the app controller', () => {
  const historyScript = html.indexOf('<script src="match-history.js" defer></script>');
  const appScript = html.indexOf('<script src="app.js" defer></script>');

  assert.notEqual(historyScript, -1);
  assert.notEqual(appScript, -1);
  assert.ok(historyScript < appScript);
});

test('only the start menu is visible on first load', () => {
  assert.match(html, /<main class="menu screen" id="main-menu"/);
  assert.match(html, /<main class="game screen" id="game-screen" hidden>/);
  assert.match(html, /<section class="ranking screen" id="ranking-screen"[^>]*hidden/);
});

test('match lifecycle is wired to history persistence and storage warning UI', () => {
  const sessionScript = html.indexOf('<script src="match-session.js" defer></script>');
  const appScript = html.indexOf('<script src="app.js" defer></script>');

  assert.notEqual(sessionScript, -1);
  assert.ok(sessionScript < appScript);
  assert.match(html, /id="storage-warning"[^>]*role="status"[^>]*aria-live="polite"[^>]*hidden/);
  assert.match(app, /matchSession\.startMatch\(\)/);
  assert.match(app, /matchSession\.abandonMatch\(\)/);
  assert.match(app, /matchSession\.completeMatch\(/);
  assert.match(app, /setStorageWarning\(!recordResult\.persisted\)/);
});
