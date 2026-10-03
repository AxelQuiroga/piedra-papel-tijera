'use strict';

/* ============================================================
 * Piedra · Papel · Tijera — lógica del juego (V2)
 *
 * La lógica pura (randomChoice, getRoundResult) vive separada
 * del DOM: se puede razonar y testear sin navegador.
 * El flujo de la ronda es una máquina de estados:
 *   idle → countdown (3·2·1·¡YA! + pump) → reveal → idle
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

/* Cuenta regresiva; el pump del CSS es infinito y no necesita sincronización */
const COUNTDOWN_STEPS = ['3', '2', '1', '¡YA!'];
const COUNTDOWN_STEP_MS = 480;
const COUNTDOWN_STEP_REDUCED_MS = 200;

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

/* ---------- Ronda ---------- */
async function playRound(playerChoice) {
  if (state.playing) return;
  state.playing = true;
  const token = ++roundToken;
  setChoicesEnabled(false);

  const cpuChoice = randomChoice();

  /* Fase 1 — cuenta regresiva: ambos bombean mostrando piedra */
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
    await wait(stepMs);
    if (token !== roundToken) {
      hideCountdown();
      return; // la partida se reinició en el medio
    }
  }

  /* Fase 2 — revelar jugadas y resolver */
  hideCountdown();
  els.arena.classList.remove('is-shaking');
  setHandImage('player', playerChoice);
  setHandImage('cpu', cpuChoice);
  setHandCaption('player', LABELS[playerChoice]);
  setHandCaption('cpu', LABELS[cpuChoice]);
  els.handPlayer.classList.add('is-revealed');
  els.handCpu.classList.add('is-revealed');

  const outcome = getRoundResult(playerChoice, cpuChoice);
  els.arena.classList.add(`arena--${outcome}`);
  els.choiceButtons.forEach((btn) => btn.classList.remove('is-selected'));

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
    replayAnimation(els.game, 'game--shake');
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

  hideCountdown();
  els.arena.classList.remove('is-shaking');
  els.game.classList.remove('game--shake');
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
