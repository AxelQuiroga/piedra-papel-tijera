'use strict';

const STORAGE_KEY = 'ppt-match-history-v1';
const VALID_WINNERS = new Set(['player', 'cpu']);

function createEmptyHistory() {
  return [];
}

function isNonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0;
}

function isValidMatch(match) {
  return Boolean(
    match &&
    typeof match === 'object' &&
    VALID_WINNERS.has(match.winner) &&
    isNonNegativeInteger(match.playerScore) &&
    isNonNegativeInteger(match.cpuScore) &&
    isNonNegativeInteger(match.draws) &&
    typeof match.playedAt === 'string' &&
    !Number.isNaN(Date.parse(match.playedAt))
  );
}

function normalizeHistory(value) {
  if (!Array.isArray(value)) return createEmptyHistory();
  return value.filter(isValidMatch).map((match) => ({
    winner: match.winner,
    playerScore: match.playerScore,
    cpuScore: match.cpuScore,
    draws: match.draws,
    playedAt: match.playedAt,
  }));
}

function recordMatch(history, match) {
  if (
    !match ||
    !VALID_WINNERS.has(match.winner) ||
    !isNonNegativeInteger(match.playerScore) ||
    !isNonNegativeInteger(match.cpuScore) ||
    !isNonNegativeInteger(match.draws)
  ) {
    throw new TypeError('Invalid completed match');
  }

  const completedMatch = {
    winner: match.winner,
    playerScore: match.playerScore,
    cpuScore: match.cpuScore,
    draws: match.draws,
    playedAt: match.playedAt ?? new Date().toISOString(),
  };

  if (!isValidMatch(completedMatch)) {
    throw new TypeError('Invalid match timestamp');
  }

  return [completedMatch, ...normalizeHistory(history)];
}

function summarizeHistory(history) {
  const matches = normalizeHistory(history);
  const summary = {
    matchesPlayed: matches.length,
    matchesWon: 0,
    matchesLost: 0,
    winRate: 0,
    currentWinStreak: 0,
    bestWinStreak: 0,
    totalPlayerRoundsWon: 0,
    totalCpuRoundsWon: 0,
    totalDraws: 0,
  };

  let streak = 0;
  for (const match of matches) {
    if (match.winner === 'player') summary.matchesWon += 1;
    else summary.matchesLost += 1;
    summary.totalPlayerRoundsWon += match.playerScore;
    summary.totalCpuRoundsWon += match.cpuScore;
    summary.totalDraws += match.draws;
  }

  summary.matchesLost = summary.matchesPlayed - summary.matchesWon;
  summary.winRate = summary.matchesPlayed
    ? Math.round((summary.matchesWon / summary.matchesPlayed) * 100)
    : 0;

  for (const match of matches) {
    if (match.winner === 'player') streak += 1;
    else break;
  }
  summary.currentWinStreak = streak;

  streak = 0;
  for (const match of [...matches].reverse()) {
    if (match.winner === 'player') {
      streak += 1;
      summary.bestWinStreak = Math.max(summary.bestWinStreak, streak);
    } else {
      streak = 0;
    }
  }

  return summary;
}

function resolveStorage(storage) {
  if (storage) return storage;
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

function loadHistory(storage, key = STORAGE_KEY) {
  const target = resolveStorage(storage);
  if (!target) return createEmptyHistory();

  try {
    const stored = target.getItem(key);
    return stored ? normalizeHistory(JSON.parse(stored)) : createEmptyHistory();
  } catch {
    return createEmptyHistory();
  }
}

function saveHistory(history, storage, key = STORAGE_KEY) {
  const target = resolveStorage(storage);
  if (!target) return false;

  try {
    target.setItem(key, JSON.stringify(normalizeHistory(history)));
    return true;
  } catch {
    return false;
  }
}

const MatchHistory = {
  STORAGE_KEY,
  createEmptyHistory,
  normalizeHistory,
  recordMatch,
  summarizeHistory,
  loadHistory,
  saveHistory,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = MatchHistory;
}
if (typeof window !== 'undefined') {
  window.MatchHistory = MatchHistory;
}
