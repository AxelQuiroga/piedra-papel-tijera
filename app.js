'use strict';

/* ============================================================
 * Piedra · Papel · Tijera — lógica del juego
 *
 * La lógica pura (randomChoice, getRoundResult) vive separada
 * del DOM: se puede razonar y testear sin navegador.
 * El flujo de la ronda es una máquina de estados:
 *   idle → shaking (suspenso) → reveal (resultado) → idle
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

/* Debe coincidir con la animación "pump" del CSS (0.4s × 3 vueltas) */
const SHAKE_MS = 1200;
const SHAKE_REDUCED_MS = 150;

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

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Referencias al DOM ---------- */
const els = {
  arena: document.getElementById('arena'),
  handPlayer: document.getElementById('hand-player'),
  handCpu: document.getElementById('hand-cpu'),
  imgPlayer: document.getElementById('hand-player-img'),
  imgCpu: document.getElementById('hand-cpu-img'),
  choicePlayer: document.getElementById('hand-player-choice'),
  choiceCpu: document.getElementById('hand-cpu-choice'),
  scorePlayer: document.getElementById('score-player'),
  scoreCpu: document.getElementById('score-cpu'),
  scoreDraws: document.getElementById('score-draws'),
  result: document.getElementById('result'),
  resultTitle: document.getElementById('result-title'),
  resultDetail: document.getElementById('result-detail'),
  choiceButtons: Array.from(document.querySelectorAll('.choice')),
  reset: document.getElementById('reset'),
};

/* ---------- Render ---------- */
function renderScores() {
  els.scorePlayer.textContent = state.player;
  els.scoreCpu.textContent = state.cpu;
  els.scoreDraws.textContent = state.draws;
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

function clearRoundMarks() {
  [els.handPlayer, els.handCpu].forEach((hand) =>
    hand.classList.remove('is-winner', 'is-loser', 'is-revealed')
  );
}

function setChoicesEnabled(enabled) {
  els.choiceButtons.forEach((btn) => {
    btn.disabled = !enabled;
  });
}

/* ---------- Ronda ---------- */
async function playRound(playerChoice) {
  if (state.playing) return;
  state.playing = true;
  const token = ++roundToken;
  setChoicesEnabled(false);

  const cpuChoice = randomChoice();

  /* Fase 1 — suspenso: ambos bombean mostrando piedra */
  clearRoundMarks();
  setHandImage('player', 'rock');
  setHandImage('cpu', 'rock');
  setHandCaption('player', '?');
  setHandCaption('cpu', '?');
  showResult('idle', 'Piedra… papel…', '¡tijera!');
  els.arena.classList.add('is-shaking');

  await wait(reducedMotion ? SHAKE_REDUCED_MS : SHAKE_MS);
  if (token !== roundToken) return; // la partida se reinició en el medio

  /* Fase 2 — revelar jugadas y resolver */
  els.arena.classList.remove('is-shaking');
  setHandImage('player', playerChoice);
  setHandImage('cpu', cpuChoice);
  setHandCaption('player', LABELS[playerChoice]);
  setHandCaption('cpu', LABELS[cpuChoice]);
  els.handPlayer.classList.add('is-revealed');
  els.handCpu.classList.add('is-revealed');

  const outcome = getRoundResult(playerChoice, cpuChoice);

  if (outcome === 'draw') {
    state.draws += 1;
    showResult('draw', 'Empate', `Ambos eligieron ${LABELS[playerChoice]}.`);
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
  }

  renderScores();
  state.playing = false;
  setChoicesEnabled(true);
}

/* ---------- Reinicio ---------- */
function resetGame() {
  roundToken += 1; // cancela cualquier ronda en curso
  state.player = 0;
  state.cpu = 0;
  state.draws = 0;
  state.playing = false;

  els.arena.classList.remove('is-shaking');
  clearRoundMarks();
  setHandImage('player', 'rock');
  setHandImage('cpu', 'rock');
  setHandCaption('player', '?');
  setHandCaption('cpu', '?');
  renderScores();
  showResult('idle', '¿Listo?', 'Elegí tu jugada para empezar la ronda.');
  setChoicesEnabled(true);
}

/* ---------- Init ---------- */
els.choiceButtons.forEach((btn) =>
  btn.addEventListener('click', () => playRound(btn.dataset.choice))
);
els.reset.addEventListener('click', resetGame);
renderScores();
