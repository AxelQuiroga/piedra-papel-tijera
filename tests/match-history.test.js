'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  STORAGE_KEY,
  createEmptyHistory,
  recordMatch,
  summarizeHistory,
  loadHistory,
  saveHistory,
} = require('../match-history.js');

function createStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, value),
    values,
  };
}

test('starts with an empty match history and zeroed personal summary', () => {
  assert.deepEqual(createEmptyHistory(), []);
  assert.deepEqual(summarizeHistory([]), {
    matchesPlayed: 0,
    matchesWon: 0,
    matchesLost: 0,
    winRate: 0,
    currentWinStreak: 0,
    bestWinStreak: 0,
    totalPlayerRoundsWon: 0,
    totalCpuRoundsWon: 0,
    totalDraws: 0,
  });
});

test('stores each completed match with its score and timestamp', () => {
  const history = recordMatch([], {
    winner: 'player',
    playerScore: 3,
    cpuScore: 2,
    draws: 1,
    playedAt: '2026-10-29T12:00:00.000Z',
  });

  assert.deepEqual(history, [{
    winner: 'player',
    playerScore: 3,
    cpuScore: 2,
    draws: 1,
    playedAt: '2026-10-29T12:00:00.000Z',
  }]);
});

test('calculates lifetime stats and winning streaks from match history', () => {
  const history = [
    { winner: 'player', playerScore: 3, cpuScore: 1, draws: 0, playedAt: '2026-10-03T00:00:00.000Z' },
    { winner: 'cpu', playerScore: 0, cpuScore: 3, draws: 2, playedAt: '2026-10-02T00:00:00.000Z' },
    { winner: 'player', playerScore: 3, cpuScore: 2, draws: 1, playedAt: '2026-10-01T00:00:00.000Z' },
    { winner: 'player', playerScore: 3, cpuScore: 0, draws: 0, playedAt: '2026-09-30T00:00:00.000Z' },
  ];

  assert.deepEqual(summarizeHistory(history), {
    matchesPlayed: 4,
    matchesWon: 3,
    matchesLost: 1,
    winRate: 75,
    currentWinStreak: 1,
    bestWinStreak: 2,
    totalPlayerRoundsWon: 9,
    totalCpuRoundsWon: 6,
    totalDraws: 3,
  });
});

test('does not mutate existing history when recording a new match', () => {
  const history = [{ winner: 'cpu', playerScore: 1, cpuScore: 3, draws: 0, playedAt: '2026-10-01T00:00:00.000Z' }];
  const next = recordMatch(history, {
    winner: 'player', playerScore: 3, cpuScore: 0, draws: 0, playedAt: '2026-10-02T00:00:00.000Z',
  });

  assert.equal(history.length, 1);
  assert.equal(next.length, 2);
  assert.equal(next[0].winner, 'player');
});

test('rejects invalid match data', () => {
  assert.throws(() => recordMatch([], { winner: 'draw', playerScore: 3, cpuScore: 0, draws: 0 }), TypeError);
  assert.throws(() => recordMatch([], { winner: 'player', playerScore: -1, cpuScore: 0, draws: 0 }), TypeError);
});

test('persists and reloads the full match history', () => {
  const storage = createStorage();
  const history = recordMatch([], {
    winner: 'player', playerScore: 3, cpuScore: 1, draws: 0, playedAt: '2026-10-29T12:00:00.000Z',
  });

  assert.equal(saveHistory(history, storage), true);
  assert.deepEqual(loadHistory(storage), history);
  assert.equal(storage.values.has(STORAGE_KEY), true);
});

test('handles invalid stored data and unavailable storage safely', () => {
  assert.deepEqual(loadHistory(createStorage({ [STORAGE_KEY]: '{invalid' })), []);
  assert.deepEqual(loadHistory({ getItem: () => { throw new Error('blocked'); } }), []);
  assert.equal(saveHistory([], { setItem: () => { throw new Error('blocked'); } }), false);
});
