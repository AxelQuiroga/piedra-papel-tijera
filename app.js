'use strict';

/* ============================================================
 * Piedra · Papel · Tijera — lógica del juego (V3)
 *
 * Dos niveles claramente separados:
 *   - Nivel RONDA:   idle → countdown → reveal → idle
 *   - Nivel PARTIDA: se juega hasta que alguien llega a 3
 *                    victorias de ronda (mejor de 5).
 * El ganador de la partida es estado DERIVADO de los scores
 * (getMatchWinner): no hay nada que sincronizar a mano.
 *
 * El sonido vive en sound.js (SoundEngine): acá solo se dice
 * QUÉ suena, nunca CÓMO.
 * ============================================================ */

/* ---------- Configuración ---------- */
const ASSETS = {
  rock: 'assets/rock-svgrepo-com.svg',
  paper: 'assets/paper-svgrepo-com.svg',
  scissors: 'assets/scissors-part-2-svgrepo-com.svg',
};

const LABELS = { rock: 'Piedra', paper: 'Papel', scissors: 'Tijera' };

/* BEATS[x] = a quién le gana x */
const BEATS = { rock: 'scissors', paper: 'rock', scissors: 'paper' };

const ACTION_VERBS = { rock: 'aplasta a', paper: 'envuelve a', scissors: 'corta a' };

/* Mejor de 5 = el primero en llegar a 3 victorias de ronda */
const TARGET_WINS = 3;

/* Cuenta regresiva; el pump del CSS es infinito y no necesita sincronización */
const COUNTDOWN_STEPS = ['3', '2', '1', '¡YA!'];
const COUNTDOWN_STEP_MS = 480;
const COUNTDOWN_STEP_REDUCED_MS = 200;

/* Pausa dramática entre el whoosh del revelado y el veredicto */
const REVEAL_PAUSE_MS = 320;
const REVEAL_PAUSE_REDUCED_MS = 100;

/* ---------- Estado ---------- */
const state = { player: 0, cpu: 0, draws: 0, playing: false };
let roundToken = 0; // invalida una ronda en curso si se reinicia la partida

/* ---------- Utilidades y lógica pura ---------- */
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const randomChoice = () => {
  const keys = Object.keys(ASSETS);
  return keys[Math.floor(Math.random() * keys.length)];
};

/* 'win' | 'lose' | 'draw' desde la perspectiva del jugador */
const getRoundResult = (player, cpu) => {
  if (player === cpu) return 'draw';
  return BEATS[player] === cpu ? 'win' : 'lose';
};

/* 'player' | 'cpu' | null — la partida se DERIVA de los scores */
const getMatchWinner = () => {
  if (state.player >= TARGET_WINS) return 'player';
  if (state.cpu >= TARGET_WINS) return 'cpu';
  return null;
};

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Referencias al DOM ---------- */
const els = {
  game: document.querySelector('.game'),
  arena: document.getElementById('arena'),
  countdown: document.getElementById('countdown'),
  handPlayer: document.getElementById('hand-player'),
  handCpu: document.getElementById('hand-cpu'),
  imgPlayer: document.getElementById('hand-player-img'),
  imgCpu: document.getElementById('hand-cpu-img'),
  choicePlayer: document.getElementById('hand-player-choice'),
  choiceCpu: document.getElementById('hand-cpu-choice'),
  scorePlayer: document.getElementById('score-player'),
  scoreCpu: document.getElementById('score-cpu'),
  scoreDraws: document.getElementById('score-draws'),
  pipsPlayer: document.getElementById('pips-player'),
  pipsCpu: document.getElementById('pips-cpu'),
  result: document.getElementById('result'),
  resultTitle: document.getElementById('result-title'),
  resultDetail: document.getElementById('result-detail'),
  choiceButtons: Array.from(document.querySelectorAll('.choice')),
  reset: document.getElementById('reset'),
  mute: document.getElementById('mute'),
  matchEnd: document.getElementById('match-end'),
  matchEndTitle: document.getElementById('match-end-title'),
  matchEndDetail: document.getElementById('match-end-detail'),
  matchAgain: document.getElementById('match-end-again'),
  statsMatches: document.getElementById('stats-matches'),
  statsWins: document.getElementById('stats-wins'),
  statsWinRate: document.getElementById('stats-win-rate'),
  statsRoundWins: document.getElementById('stats-round-wins'),
  statsBestStreak: document.getElementById('stats-best-streak'),
  statsFavoriteMove: document.getElementById('stats-favorite-move'),
  themeSelect: document.getElementById('theme-select'),
};

let personalStats = Statistics.loadStats();

/* ---------- Render ---------- */
function renderScores() {
  els.scorePlayer.textContent = state.player;
  els.scoreCpu.textContent = state.cpu;
  els.scoreDraws.textContent = state.draws;
}

function renderPersonalStats() {
  els.statsMatches.textContent = personalStats.matchesPlayed;
  els.statsWins.textContent = personalStats.matchesWon;
  els.statsWinRate.textContent = `${Statistics.calculateWinRate(personalStats)}%`;
  els.statsRoundWins.textContent = personalStats.roundWins;
  els.statsBestStreak.textContent = personalStats.bestStreak;

  const playedMoves = Object.entries(personalStats.moves).filter(([, count]) => count > 0);
  if (playedMoves.length === 0) {
    els.statsFavoriteMove.textContent = '—';
    return;
  }

  const highestCount = Math.max(...playedMoves.map(([, count]) => count));
  const mostUsed = playedMoves.filter(([, count]) => count === highestCount);
  els.statsFavoriteMove.textContent = mostUsed.length === 1
    ? LABELS[mostUsed[0][0]]
    : 'Empate';
}

function applySavedTheme() {
  const theme = Preferences.loadTheme();
  document.documentElement.dataset.theme = theme;
  els.themeSelect.value = theme;
}

function renderPips() {
  const fill = (container, wins) =>
    Array.from(container.children).forEach((pip, i) =>
      pip.classList.toggle('pip--filled', i < wins)
    );
  fill(els.pipsPlayer, state.player);
  fill(els.pipsCpu, state.cpu);
}

/* Quita y repone una clase para reiniciar su animación CSS */
function replayAnimation(el, className) {
  el.classList.remove(className);
  void el.offsetWidth; // fuerza reflow: sin esto la animación no se repite
  el.classList.add(className);
}

function bumpScore(el) {
  replayAnimation(el, 'score__value--bump');
}

function bumpPip(side) {
  const container = side === 'player' ? els.pipsPlayer : els.pipsCpu;
  const wins = side === 'player' ? state.player : state.cpu;
  const pip = container.children[wins - 1];
  if (pip) replayAnimation(pip, 'pip--pop');
}

function showResult(kind, title, detail) {
  els.result.className = `result result--${kind}`;
  els.resultTitle.textContent = title;
  els.resultDetail.textContent = detail;
  replayAnimation(els.resultTitle, 'result__title--in');
}

function setHandImage(side, choice) {
  const img = side === 'player' ? els.imgPlayer : els.imgCpu;
  img.src = ASSETS[choice];
}

function setHandCaption(side, text) {
  const caption = side === 'player' ? els.choicePlayer : els.choiceCpu;
  caption.textContent = text;
}

function showCountdownStep(text) {
  els.countdown.textContent = text;
  els.countdown.classList.toggle('countdown--ya', text === '¡YA!');
  replayAnimation(els.countdown, 'is-live');
}

function hideCountdown() {
  els.countdown.classList.remove('is-live', 'countdown--ya');
  els.countdown.textContent = '';
}

function clearRoundMarks() {
  [els.handPlayer, els.handCpu].forEach((hand) =>
    hand.classList.remove('is-winner', 'is-loser', 'is-revealed')
  );
  els.arena.classList.remove('arena--win', 'arena--lose', 'arena--draw');
  els.choiceButtons.forEach((btn) => btn.classList.remove('is-selected'));
}

function setChoicesEnabled(enabled) {
  els.choiceButtons.forEach((btn) => {
    btn.disabled = !enabled;
  });
}

function markSelectedButton(playerChoice) {
  const btn = els.choiceButtons.find((b) => b.dataset.choice === playerChoice);
  if (btn) btn.classList.add('is-selected');
}

function renderMuteButton() {
  const muted = SoundEngine.isMuted();
  els.mute.classList.toggle('mute--off', muted);
  els.mute.setAttribute('aria-pressed', String(muted));
  els.mute.setAttribute('aria-label', muted ? 'Activar sonido' : 'Silenciar');
}

/* ============================================================
 * Nivel RONDA
 * ============================================================ */
async function playRound(playerChoice) {
  if (state.playing || getMatchWinner()) return;
  state.playing = true;
  const token = ++roundToken;
  setChoicesEnabled(false);

  const cpuChoice = randomChoice();

  /* Fase 1 — cuenta regresiva con sonido por paso */
  clearRoundMarks();
  markSelectedButton(playerChoice);
  setHandImage('player', 'rock');
  setHandImage('cpu', 'rock');
  setHandCaption('player', '?');
  setHandCaption('cpu', '?');
  showResult('idle', 'Piedra… papel…', '¡tijera!');
  els.arena.classList.add('is-shaking');

  const stepMs = reducedMotion ? COUNTDOWN_STEP_REDUCED_MS : COUNTDOWN_STEP_MS;
  for (const step of COUNTDOWN_STEPS) {
    showCountdownStep(step);
    SoundEngine.play(step === '¡YA!' ? 'ya' : 'tick');
    await wait(stepMs);
    if (token !== roundToken) {
      hideCountdown();
      return; // la partida se reinició en el medio
    }
  }

  /* Fase 2 — revelar jugadas (whoosh) y pausa dramática */
  hideCountdown();
  els.arena.classList.remove('is-shaking');
  setHandImage('player', playerChoice);
  setHandImage('cpu', cpuChoice);
  setHandCaption('player', LABELS[playerChoice]);
  setHandCaption('cpu', LABELS[cpuChoice]);
  els.handPlayer.classList.add('is-revealed');
  els.handCpu.classList.add('is-revealed');
  els.choiceButtons.forEach((btn) => btn.classList.remove('is-selected'));

  SoundEngine.play('reveal');
  await wait(reducedMotion ? REVEAL_PAUSE_REDUCED_MS : REVEAL_PAUSE_MS);
  if (token !== roundToken) return;

  /* Fase 3 — veredicto de la ronda */
  const outcome = getRoundResult(playerChoice, cpuChoice);
  els.arena.classList.add(`arena--${outcome}`);

  if (outcome === 'draw') {
    state.draws += 1;
    showResult('draw', 'Empate', `Ambos eligieron ${LABELS[playerChoice]}. Se repite la ronda.`);
    bumpScore(els.scoreDraws);
  } else if (outcome === 'win') {
    state.player += 1;
    els.handPlayer.classList.add('is-winner');
    els.handCpu.classList.add('is-loser');
    showResult(
      'win',
      '¡Ganaste la ronda!',
      `${LABELS[playerChoice]} ${ACTION_VERBS[playerChoice]} ${LABELS[cpuChoice]}.`
    );
    bumpScore(els.scorePlayer);
    bumpPip('player');
  } else {
    state.cpu += 1;
    els.handCpu.classList.add('is-winner');
    els.handPlayer.classList.add('is-loser');
    showResult(
      'lose',
      'Perdiste la ronda',
      `${LABELS[cpuChoice]} ${ACTION_VERBS[cpuChoice]} ${LABELS[playerChoice]}.`
    );
    bumpScore(els.scoreCpu);
    bumpPip('cpu');
    replayAnimation(els.game, 'game--shake');
  }

  personalStats = Statistics.recordRound(personalStats, playerChoice, outcome);
  Statistics.saveStats(personalStats);
  renderPersonalStats();

  renderScores();
  renderPips();

  /* Si la ronda cierra la partida, el nivel PARTIDA toma el control */
  const winner = getMatchWinner();
  if (winner) {
    endMatch(winner);
    return;
  }

  SoundEngine.play(outcome);
  state.playing = false;
  setChoicesEnabled(true);
}

/* ============================================================
 * Nivel PARTIDA
 * ============================================================ */
function endMatch(winner) {
  state.playing = false;
  personalStats = Statistics.recordMatch(personalStats, winner);
  Statistics.saveStats(personalStats);
  renderPersonalStats();
  const playerWon = winner === 'player';

  SoundEngine.play(playerWon ? 'win' : 'lose');

  showResult(
    playerWon ? 'win' : 'lose',
    playerWon ? '¡Ganaste la partida!' : 'Perdiste la partida',
    `Resultado final: ${state.player} a ${state.cpu}.`
  );

  els.matchEnd.classList.toggle('match-end--win', playerWon);
  els.matchEnd.classList.toggle('match-end--lose', !playerWon);
  els.matchEndTitle.textContent = playerWon ? '¡GANASTE LA PARTIDA!' : 'LA CPU GANA LA PARTIDA';
  els.matchEndDetail.textContent = `${state.player} a ${state.cpu} — ${
    playerWon ? 'la máquina cayó.' : 'la próxima va en serio.'
  }`;
  els.matchEnd.hidden = false;

  /* Las jugadas quedan bloqueadas (no se rehabilitan); la única
     salida es empezar una partida nueva */
  els.reset.textContent = 'Jugar de nuevo';
  els.matchAgain.focus();
}

function resetGame() {
  roundToken += 1; // cancela cualquier ronda en curso
  state.player = 0;
  state.cpu = 0;
  state.draws = 0;
  state.playing = false;

  SoundEngine.stopAll(); // no quedan sonidos colgados
  hideCountdown();
  els.arena.classList.remove('is-shaking');
  els.game.classList.remove('game--shake');
  clearRoundMarks();
  setHandImage('player', 'rock');
  setHandImage('cpu', 'rock');
  setHandCaption('player', '?');
  setHandCaption('cpu', '?');
  renderScores();
  renderPips();
  showResult('idle', '¿Listo?', 'Elegí tu jugada para empezar la ronda.');
  setChoicesEnabled(true);

  els.matchEnd.hidden = true;
  els.reset.textContent = 'Reiniciar partida';

  /* Si el foco quedó en el botón del overlay (ahora oculto), se perdería
     al body: lo devolvemos a las jugadas para seguir con teclado */
  els.choiceButtons[0].focus({ preventScroll: true });
}

/* ---------- Init ---------- */
els.choiceButtons.forEach((btn) =>
  btn.addEventListener('click', () => {
    SoundEngine.unlock(); // gesto del usuario: habilita el AudioContext
    playRound(btn.dataset.choice);
  })
);
els.reset.addEventListener('click', resetGame);
els.matchAgain.addEventListener('click', resetGame);
els.mute.addEventListener('click', () => {
  SoundEngine.unlock();
  SoundEngine.setMuted(!SoundEngine.isMuted());
  renderMuteButton();
});
els.themeSelect.addEventListener('change', () => {
  const theme = els.themeSelect.value;
  if (Preferences.saveTheme(theme)) {
    document.documentElement.dataset.theme = theme;
  }
});
applySavedTheme();
renderPersonalStats();
renderMuteButton();
renderScores();
renderPips();
