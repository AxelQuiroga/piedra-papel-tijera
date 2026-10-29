'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const MatchSession = require('../match-session.js');
const MatchHistory = require('../match-history.js');

const completedMatch = {
  winner: 'player',
  playerScore: 3,
  cpuScore: 2,
  draws: 1,
  playedAt: '2026-10-29T12:00:00.000Z',
};

function createSession({ saveResult = true } = {}) {
  let savedHistory = [];
  let saveCalls = 0;
  const session = MatchSession.create({
    initialHistory: [],
    recordMatch: MatchHistory.recordMatch,
    saveHistory(history) {
      saveCalls += 1;
      if (saveResult) savedHistory = history;
      return saveResult;
    },
  });

  return {
    session,
    getSavedHistory: () => savedHistory,
    getSaveCalls: () => saveCalls,
  };
}

test('records a completed match once even if completion is called repeatedly', () => {
  const harness = createSession();
  harness.session.startMatch();

  const first = harness.session.completeMatch(completedMatch);
  const duplicate = harness.session.completeMatch(completedMatch);

  assert.equal(first.recorded, true);
  assert.equal(first.persisted, true);
  assert.equal(duplicate.recorded, false);
  assert.equal(harness.session.getHistory().length, 1);
  assert.equal(harness.getSavedHistory().length, 1);
  assert.equal(harness.getSaveCalls(), 1);
});

test('does not record an abandoned or reset match', () => {
  const harness = createSession();
  harness.session.startMatch();
  harness.session.abandonMatch();

  const result = harness.session.completeMatch(completedMatch);

  assert.equal(result.recorded, false);
  assert.equal(harness.session.getHistory().length, 0);
  assert.equal(harness.getSaveCalls(), 0);
});

test('allows a new completed match after the previous match ends', () => {
  const harness = createSession();
  harness.session.startMatch();
  harness.session.completeMatch(completedMatch);
  harness.session.startMatch();
  harness.session.completeMatch({ ...completedMatch, winner: 'cpu' });

  assert.equal(harness.session.getHistory().length, 2);
  assert.deepEqual(harness.session.getHistory().map((match) => match.winner), ['cpu', 'player']);
  assert.equal(harness.getSaveCalls(), 2);
});

test('reports a failed persistence attempt without discarding the in-memory result', () => {
  const harness = createSession({ saveResult: false });
  harness.session.startMatch();

  const result = harness.session.completeMatch(completedMatch);

  assert.equal(result.recorded, true);
  assert.equal(result.persisted, false);
  assert.equal(harness.session.getHistory().length, 1);
  assert.equal(harness.getSaveCalls(), 1);
});

test('does not persist a match unless a match was explicitly started', () => {
  const harness = createSession();

  const result = harness.session.completeMatch(completedMatch);

  assert.equal(result.recorded, false);
  assert.equal(harness.session.getHistory().length, 0);
  assert.equal(harness.getSaveCalls(), 0);
});
