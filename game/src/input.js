// Keyboard and mouse, read once per frame. Arrow keys and WASD steer, the
// mouse steers toward the pointer when it moved most recently, Space or a click
// cycles the ship's colour, 1/2/3 pick a colour outright, P pauses, M mutes.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_MUTE = 4;
export const ACTION_CYCLE = 8;

const KEY_ACTIONS = {
  Space: ACTION_CONFIRM | ACTION_CYCLE,
  Enter: ACTION_CONFIRM,
  KeyP: ACTION_PAUSE,
  Escape: ACTION_PAUSE,
  KeyM: ACTION_MUTE,
};

export function createInput(canvas) {
  const keys = new Set();
  let queued = 0;
  let mouse = { x: 0, y: 0, active: false, fresh: false };
  let colorPick = -1;
  let lastPointerWasMouse = false;

  function toGameCoords(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (event.clientX - rect.left) * scaleX, y: (event.clientY - rect.top) * scaleY };
  }

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    keys.add(event.code);
    const action = KEY_ACTIONS[event.code];
    if (action) {
      queued |= action;
      event.preventDefault();
    }
    if (event.code === 'Digit1') colorPick = 0;
    else if (event.code === 'Digit2') colorPick = 1;
    else if (event.code === 'Digit3') colorPick = 2;
  });
  window.addEventListener('keyup', (event) => keys.delete(event.code));
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('pointermove', (event) => {
    mouse = { ...toGameCoords(event), active: true, fresh: true };
    lastPointerWasMouse = true;
  });
  canvas.addEventListener('pointerdown', (event) => {
    mouse = { ...toGameCoords(event), active: true, fresh: true };
    lastPointerWasMouse = true;
    queued |= ACTION_CONFIRM | ACTION_CYCLE;
    event.preventDefault();
  });

  return {
    /** Steering: keyboard vector, or toward the mouse when it steered last. */
    steering() {
      let x = 0;
      let y = 0;
      if (keys.has('ArrowLeft') || keys.has('KeyA')) x -= 1;
      if (keys.has('ArrowRight') || keys.has('KeyD')) x += 1;
      if (keys.has('ArrowUp') || keys.has('KeyW')) y -= 1;
      if (keys.has('ArrowDown') || keys.has('KeyS')) y += 1;
      if (x !== 0 || y !== 0) {
        lastPointerWasMouse = false;
        const length = Math.hypot(x, y);
        return { x: x / length, y: y / length, mouse: null };
      }
      if (mouse.active && lastPointerWasMouse) return { x: 0, y: 0, mouse: { x: mouse.x, y: mouse.y } };
      return { x: 0, y: 0, mouse: null };
    },
    takeActions() {
      const actions = queued;
      queued = 0;
      return actions;
    },
    takeColorPick() {
      const pick = colorPick;
      colorPick = -1;
      return pick;
    },
    consumeMouseFresh() {
      const fresh = mouse.fresh;
      mouse.fresh = false;
      return fresh;
    },
  };
}
