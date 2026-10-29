const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createInitialStats,
  recordRound,
  recordMatch,
  calculateWinRate,
  loadStats,
  saveStats,
} = require('../statistics.js');

test('starts with empty personal statistics', () => {
  assert.deepEqual(createInitialStats(), {
    roundsPlayed: 0,
    roundWins: 0,
    roundLosses: 0,
    roundDraws: 0,
    matchesPlayed: 0,
    matchesWon: 0,
    matchesLost: 0,
    currentStreak: 0,
    bestStreak: 0,
    moves: { rock: 0, paper: 0, scissors: 0 },
  });
});

test('records a round result and the selected move', () => {
  const stats = recordRound(createInitialStats(), 'paper', 'win');

  assert.equal(stats.roundsPlayed, 1);
  assert.equal(stats.roundWins, 1);
  assert.equal(stats.moves.paper, 1);
  assert.equal(stats.currentStreak, 1);
  assert.equal(stats.bestStreak, 1);
});

test('tracks the best winning streak and resets the current streak after a loss', () => {
  let stats = createInitialStats();
  stats = recordRound(stats, 'rock', 'win');
  stats = recordRound(stats, 'paper', 'win');
  stats = recordRound(stats, 'scissors', 'lose');

  assert.equal(stats.currentStreak, 0);
  assert.equal(stats.bestStreak, 2);
  assert.equal(stats.roundLosses, 1);
});

test('a draw is counted and breaks a consecutive-win streak', () => {
  let stats = createInitialStats();
  stats = recordRound(stats, 'rock', 'win');
  stats = recordRound(stats, 'rock', 'draw');

  assert.equal(stats.roundDraws, 1);
  assert.equal(stats.currentStreak, 0);
  assert.equal(stats.bestStreak, 1);
});

test('records match outcomes separately from round outcomes', () => {
  let stats = createInitialStats();
  stats = recordMatch(stats, 'player');
  stats = recordMatch(stats, 'cpu');

  assert.equal(stats.matchesPlayed, 2);
  assert.equal(stats.matchesWon, 1);
  assert.equal(stats.matchesLost, 1);
});

test('calculates the match win rate without dividing by zero', () => {
  assert.equal(calculateWinRate(createInitialStats()), 0);

  let stats = recordMatch(createInitialStats(), 'player');
  stats = recordMatch(stats, 'cpu');
  stats = recordMatch(stats, 'player');

  assert.equal(calculateWinRate(stats), 67);
});

test('persists and restores statistics', () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  const original = recordRound(createInitialStats(), 'scissors', 'win');

  saveStats(original, storage);
  assert.deepEqual(loadStats(storage), original);
});

test('recovers safely from invalid stored JSON', () => {
  const storage = { getItem: () => '{invalid json' };

  assert.deepEqual(loadStats(storage), createInitialStats());
});

test('handles unavailable storage without throwing', () => {
  const storage = {
    getItem: () => { throw new Error('storage blocked'); },
    setItem: () => { throw new Error('storage blocked'); },
  };

  assert.deepEqual(loadStats(storage), createInitialStats());
  assert.doesNotThrow(() => saveStats(createInitialStats(), storage));
});
