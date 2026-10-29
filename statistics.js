'use strict';

const STORAGE_KEY = 'ppt-personal-statistics';
const VALID_MOVES = ['rock', 'paper', 'scissors'];
const VALID_ROUND_OUTCOMES = ['win', 'lose', 'draw'];
const VALID_MATCH_WINNERS = ['player', 'cpu'];

function createInitialStats() {
  return {
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
  };
}

function isNonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0;
}

function normalizeStats(value) {
  const initial = createInitialStats();
  if (!value || typeof value !== 'object' || Array.isArray(value)) return initial;

  const normalized = { ...initial };
  for (const key of Object.keys(initial)) {
    if (key === 'moves') continue;
    if (isNonNegativeInteger(value[key])) normalized[key] = value[key];
  }

  if (value.moves && typeof value.moves === 'object' && !Array.isArray(value.moves)) {
    for (const move of VALID_MOVES) {
      if (isNonNegativeInteger(value.moves[move])) normalized.moves[move] = value.moves[move];
    }
  }

  normalized.bestStreak = Math.max(normalized.bestStreak, normalized.currentStreak);
  return normalized;
}

function assertValidChoice(choice) {
  if (!VALID_MOVES.includes(choice)) {
    throw new TypeError(`Invalid move: ${String(choice)}`);
  }
}

function assertValidOutcome(outcome) {
  if (!VALID_ROUND_OUTCOMES.includes(outcome)) {
    throw new TypeError(`Invalid round outcome: ${String(outcome)}`);
  }
}

function recordRound(currentStats, choice, outcome) {
  assertValidChoice(choice);
  assertValidOutcome(outcome);

  const stats = normalizeStats(currentStats);
  stats.roundsPlayed += 1;
  stats.moves[choice] += 1;

  if (outcome === 'win') {
    stats.roundWins += 1;
    stats.currentStreak += 1;
    stats.bestStreak = Math.max(stats.bestStreak, stats.currentStreak);
  } else if (outcome === 'lose') {
    stats.roundLosses += 1;
    stats.currentStreak = 0;
  } else {
    stats.roundDraws += 1;
    stats.currentStreak = 0;
  }

  return stats;
}

function recordMatch(currentStats, winner) {
  if (!VALID_MATCH_WINNERS.includes(winner)) {
    throw new TypeError(`Invalid match winner: ${String(winner)}`);
  }

  const stats = normalizeStats(currentStats);
  stats.matchesPlayed += 1;
  if (winner === 'player') stats.matchesWon += 1;
  else stats.matchesLost += 1;
  return stats;
}

function calculateWinRate(currentStats) {
  const stats = normalizeStats(currentStats);
  if (stats.matchesPlayed === 0) return 0;
  return Math.round((stats.matchesWon / stats.matchesPlayed) * 100);
}

function resolveStorage(storage) {
  if (storage) return storage;
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

function loadStats(storage, key = STORAGE_KEY) {
  const target = resolveStorage(storage);
  if (!target) return createInitialStats();

  try {
    const raw = target.getItem(key);
    if (!raw) return createInitialStats();
    return normalizeStats(JSON.parse(raw));
  } catch {
    return createInitialStats();
  }
}

function saveStats(currentStats, storage, key = STORAGE_KEY) {
  const target = resolveStorage(storage);
  if (!target) return false;

  try {
    target.setItem(key, JSON.stringify(normalizeStats(currentStats)));
    return true;
  } catch {
    return false;
  }
}

const Statistics = {
  STORAGE_KEY,
  createInitialStats,
  normalizeStats,
  recordRound,
  recordMatch,
  calculateWinRate,
  loadStats,
  saveStats,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Statistics;
}
if (typeof window !== 'undefined') {
  window.Statistics = Statistics;
}
