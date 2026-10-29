const test = require('node:test');
const assert = require('node:assert/strict');

const { VALID_MOVES, getRoundResult, getMatchWinner, randomChoice } = require('../game-logic.js');

test('determines every winning matchup correctly', () => {
  assert.equal(getRoundResult('rock', 'scissors'), 'win');
  assert.equal(getRoundResult('paper', 'rock'), 'win');
  assert.equal(getRoundResult('scissors', 'paper'), 'win');
});

test('determines every losing matchup correctly', () => {
  assert.equal(getRoundResult('rock', 'paper'), 'lose');
  assert.equal(getRoundResult('paper', 'scissors'), 'lose');
  assert.equal(getRoundResult('scissors', 'rock'), 'lose');
});

test('returns a draw when both moves match', () => {
  for (const move of VALID_MOVES) {
    assert.equal(getRoundResult(move, move), 'draw');
  }
});

test('rejects unknown moves instead of silently treating them as losses', () => {
  assert.throws(() => getRoundResult('lizard', 'rock'), TypeError);
  assert.throws(() => getRoundResult('rock', 'spock'), TypeError);
});

test('derives the match winner from the score threshold', () => {
  assert.equal(getMatchWinner(2, 1), null);
  assert.equal(getMatchWinner(3, 1), 'player');
  assert.equal(getMatchWinner(1, 3), 'cpu');
  assert.equal(getMatchWinner(2, 2, 2), 'player');
});

test('selects a move using the injected random source', () => {
  assert.equal(randomChoice(() => 0), 'rock');
  assert.equal(randomChoice(() => 0.34), 'paper');
  assert.equal(randomChoice(() => 0.99), 'scissors');
});

test('rejects invalid random source values', () => {
  assert.throws(() => randomChoice(() => -0.1), RangeError);
  assert.throws(() => randomChoice(() => 1), RangeError);
});
