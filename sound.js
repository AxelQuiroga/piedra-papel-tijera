'use strict';

/* ============================================================
 * SoundEngine — sonidos arcade sintetizados con Web Audio API.
 * Sin archivos externos: cada sonido son osciladores (o ruido
 * filtrado) con envolvente de volumen.
 *
 * El AudioContext se crea recién con el primer gesto del
 * usuario (unlock), por la política autoplay de los browsers.
 * ============================================================ */
const SoundEngine = (() => {
  const STORAGE_KEY = 'ppt-muted';
  const AC = window.AudioContext || window.webkitAudioContext;

  let ctx = null;
  let master = null;
  const active = new Set(); // fuentes vivas, para stopAll()

  function readMuted() {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  }

  let muted = readMuted();

  /* Debe llamarse dentro de un gesto del usuario (click/tecla) */
  function unlock() {
    if (!AC) return;
    if (!ctx) {
      try {
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = 0.5; // volumen general moderado
        master.connect(ctx.destination);
      } catch {
        ctx = null;
        return;
      }
    }
    if (ctx.state === 'suspended') ctx.resume();
  }

  function track(node) {
    active.add(node);
    node.onended = () => active.delete(node);
  }

  /* Tono base: oscilador con decaimiento exponencial */
  function tone({ freq, freqEnd = freq, type = 'square', dur = 0.08, vol = 0.14, when = 0 }) {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (freqEnd !== freq) osc.frequency.exponentialRampToValueAtTime(freqEnd, t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(master);
    track(osc);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  /* Whoosh: ruido blanco con bandpass que barre hacia abajo */
  function noise({ dur = 0.22, vol = 0.16, freq = 1000, when = 0 }) {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime + when;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(freq, t0);
    filter.frequency.exponentialRampToValueAtTime(freq * 0.35, t0 + dur);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter).connect(gain).connect(master);
    track(src);
    src.start(t0);
  }

  const sounds = {
    /* Cada número del countdown */
    tick: () => tone({ freq: 620, type: 'square', dur: 0.07, vol: 0.1 }),
    /* ¡YA! — tres notas brillantes ascendentes */
    ya: () => {
      tone({ freq: 880, type: 'sawtooth', dur: 0.09, vol: 0.12 });
      tone({ freq: 1174, type: 'sawtooth', dur: 0.1, vol: 0.12, when: 0.07 });
      tone({ freq: 1568, type: 'sawtooth', dur: 0.16, vol: 0.13, when: 0.14 });
    },
    /* Revelado de las manos */
    reveal: () => noise({ dur: 0.22, vol: 0.16, freq: 1100 }),
    /* Ronda/partida ganada: arpegio mayor ascendente */
    win: () =>
      [523, 659, 784, 1047].forEach((f, i) =>
        tone({ freq: f, type: 'triangle', dur: 0.11, vol: 0.14, when: i * 0.09 })
      ),
    /* Ronda/partida perdida: tres tonos descendentes */
    lose: () =>
      [392, 330, 262].forEach((f, i) =>
        tone({ freq: f, type: 'sine', dur: 0.16, vol: 0.13, when: i * 0.13 })
      ),
    /* Empate: dos blips neutros */
    draw: () => {
      tone({ freq: 440, type: 'triangle', dur: 0.09, vol: 0.12 });
      tone({ freq: 440, type: 'triangle', dur: 0.09, vol: 0.12, when: 0.12 });
    },
  };

  function play(name) {
    if (muted || !ctx) return;
    const fn = sounds[name];
    if (fn) fn();
  }

  function stopAll() {
    active.forEach((node) => {
      try {
        node.stop();
      } catch {
        /* ya terminó */
      }
    });
    active.clear();
  }

  function setMuted(value) {
    muted = Boolean(value);
    try {
      localStorage.setItem(STORAGE_KEY, muted ? '1' : '0');
    } catch {
      /* sin storage disponible */
    }
    if (muted) stopAll();
  }

  return {
    play,
    stopAll,
    unlock,
    setMuted,
    isMuted: () => muted,
  };
})();

/* Export explícito: const/let de tope nivel NO cuelgan de window,
   y sin esto el módulo es inalcanzable desde tests externos */
window.SoundEngine = SoundEngine;
