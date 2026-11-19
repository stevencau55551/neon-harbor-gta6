// Keyboard + mouse input. Keys are tracked by code; actions are edge-triggered
// flags the world consumes once per frame.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_ENTER_CAR = 4;
export const ACTION_PUNCH = 8;
export const ACTION_SHOOT = 16;
export const ACTION_BUY = 32;

export function createInput(canvas) {
  const keys = new Set();
  const pressed = new Set();
  let mouseX = 0;
  let mouseY = 0;
  let mouseDown = false;
  let mouseClicked = false;

  function keyDown(e) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    if (!e.repeat) pressed.add(e.code);
    keys.add(e.code);
  }
  function keyUp(e) {
    keys.delete(e.code);
  }
  function onMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
  }
  function onMouseDown(e) {
    mouseDown = true;
    mouseClicked = true;
    onMouseMove(e);
  }
  function onMouseUp() {
    mouseDown = false;
  }

  window.addEventListener('keydown', keyDown);
  window.addEventListener('keyup', keyUp);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);

  function down(...codes) {
    return codes.some((c) => keys.has(c));
  }

  return {
    // -1..1 steering / throttle axes for on-foot movement and driving.
    moveX() {
      return (down('KeyD', 'ArrowRight') ? 1 : 0) - (down('KeyA', 'ArrowLeft') ? 1 : 0);
    },
    moveY() {
      return (down('KeyS', 'ArrowDown') ? 1 : 0) - (down('KeyW', 'ArrowUp') ? 1 : 0);
    },
    run() {
      return down('ShiftLeft', 'ShiftRight');
    },
    mouse() {
      return { x: mouseX, y: mouseY, down: mouseDown, clicked: mouseClicked };
    },
    takeActions() {
      let actions = 0;
      if (pressed.has('Enter') || pressed.has('Space') || mouseClicked) actions |= ACTION_CONFIRM;
      if (pressed.has('Escape') || pressed.has('KeyP')) actions |= ACTION_PAUSE;
      if (pressed.has('KeyE')) actions |= ACTION_ENTER_CAR;
      if (pressed.has('KeyF')) actions |= ACTION_PUNCH;
      if (pressed.has('KeyB')) actions |= ACTION_BUY;
      if (mouseClicked || pressed.has('Space')) actions |= ACTION_SHOOT;
      pressed.clear();
      mouseClicked = false;
      return actions;
    },
  };
}
