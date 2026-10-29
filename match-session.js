'use strict';

function create({ initialHistory = [], recordMatch, saveHistory }) {
  if (typeof recordMatch !== 'function' || typeof saveHistory !== 'function') {
    throw new TypeError('MatchSession requires recordMatch and saveHistory functions');
  }

  let history = Array.isArray(initialHistory) ? initialHistory.slice() : [];
  let active = false;
  let recorded = false;

  function startMatch() {
    if (active) return;
    active = true;
    recorded = false;
  }

  function abandonMatch() {
    active = false;
    recorded = false;
  }

  function completeMatch(match) {
    if (!active || recorded) {
      return { recorded: false, persisted: false };
    }

    history = recordMatch(history, match);
    recorded = true;
    active = false;

    return {
      recorded: true,
      persisted: saveHistory(history),
    };
  }

  return {
    startMatch,
    abandonMatch,
    completeMatch,
    getHistory: () => history.slice(),
  };
}

const MatchSession = { create };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = MatchSession;
}
if (typeof window !== 'undefined') {
  window.MatchSession = MatchSession;
}
