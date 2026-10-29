'use strict';

const VALID_MOVES = ['rock', 'paper', 'scissors'];
const BEATS = { rock: 'scissors', paper: 'rock', scissors: 'paper' };

function assertValidMove(move) {
  if (!VALID_MOVES.includes(move)) {
    throw new TypeError(`Invalid move: ${String(move)}`);
  }
}

function getRoundResult(playerMove, cpuMove) {
  assertValidMove(playerMove);
  assertValidMove(cpuMove);

  if (playerMove === cpuMove) return 'draw';
  return BEATS[playerMove] === cpuMove ? 'win' : 'lose';
}

function getMatchWinner(playerScore, cpuScore, targetWins = 3) {
  if (!Number.isInteger(playerScore) || playerScore < 0) {
    throw new TypeError('Player score must be a non-negative integer');
  }
  if (!Number.isInteger(cpuScore) || cpuScore < 0) {
    throw new TypeError('CPU score must be a non-negative integer');
  }
  if (!Number.isInteger(targetWins) || targetWins < 1) {
    throw new TypeError('Target wins must be a positive integer');
  }

  if (playerScore >= targetWins) return 'player';
  if (cpuScore >= targetWins) return 'cpu';
  return null;
}

function randomChoice(random = Math.random) {
  const value = random();
  if (typeof value !== 'number' || value < 0 || value >= 1) {
    throw new RangeError('Random source must return a number in [0, 1)');
  }
  return VALID_MOVES[Math.floor(value * VALID_MOVES.length)];
}

const GameLogic = { VALID_MOVES, getRoundResult, getMatchWinner, randomChoice };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = GameLogic;
}
if (typeof window !== 'undefined') {
  window.GameLogic = GameLogic;
}
