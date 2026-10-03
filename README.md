# Piedra · Papel · Tijera

Mini juego web contra la CPU, construido con **HTML, CSS y JavaScript vanilla** — sin frameworks, sin librerías, sin build. Diseño tipo arcade moderno: tema oscuro, glassmorphism y animaciones con puro CSS.

![Captura del juego](test-results/v2-win-desktop.png)

## Cómo jugar

No necesita servidor ni instalación: **abrí `index.html` en tu navegador** y listo.

Si preferís servirlo localmente:

```bash
npx serve .
# o
python -m http.server 8000
```

## Funcionalidades

- Jugador vs CPU con elección aleatoria.
- Marcador de rondas: victorias, empates y derrotas.
- Cuenta regresiva **3 · 2 · 1 · ¡YA!** gigante sobre la arena, con las manos bombeando.
- Identidad visual "arena de neón": piso de grilla synthwave y marcos de esquina estilo fighting game (cian para vos, magenta para la CPU).
- Cada resultado tiene su atmósfera: ganar inunda tu lado de verde y tu carta celebra; perder sacude la pantalla y hunde tu carta; empate pulsa ámbar.
- Resultado de cada ronda con frase descriptiva ("Piedra aplasta a Tijera").
- Tu jugada queda resaltada durante la cuenta regresiva; botones táctiles estilo arcade.
- Botón para reiniciar la partida (seguro incluso a mitad de ronda).
- Responsive (desktop y mobile).

## Estructura

```
├── index.html      # Estructura semántica y accesibilidad
├── style.css       # Diseño (tokens CSS, animaciones, responsive)
├── app.js          # Lógica del juego
├── assets/         # Íconos SVG de piedra, papel y tijera
└── test-results/   # Capturas de verificación visual
```

## Decisiones de diseño

- **Lógica pura separada del DOM**: `getRoundResult()` y `randomChoice()` no tocan el documento, así que son triviales de testear.
- **Máquina de estados de ronda**: `idle → countdown → reveal → idle`. Un `roundToken` invalida la ronda en curso si se reinicia a mitad de camino (no hay estados fantasma).
- **Los SVG se usan con `<img>`**: tienen colores fijos (no `currentColor`), así que inline no aportaría nada; con `<img>` son cacheables y el HTML queda limpio.
- **Sin salto de layout**: la zona de resultado reserva su altura, el texto no empuja la interfaz.

## Accesibilidad

- Botones reales (`<button>`): teclado y lectores de pantalla funcionan sin código extra.
- Resultado anunciado con `role="status"` + `aria-live="polite"`.
- Foco visible (`:focus-visible`) en todos los controles.
- Respeta `prefers-reduced-motion`: reduce las animaciones si el usuario lo pidió a nivel sistema.

## Verificación

- `node --check app.js` — sintaxis OK.
- Capturas de flujo real en `test-results/` (ronda completa, layout desktop y mobile 390px sin overflow).

## Próximas iteraciones (ideas)

- Mejor de 5 / fin de partida.
- Historial de rondas.
- Sonido y más "juice" (partículas, shake de pantalla).
