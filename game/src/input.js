// input.js — keyboard and mouse input for Ember & Anvil.
// One job: turn key presses and clicks into game actions. Nothing here
// knows what a stage or a day is; it only reports what the player did.
export function createInput(canvas, onAction) {
  const keys = new Set();
  let spaceHeld = false;
  // Clickable rectangles registered by the renderer each frame:
  // { id, x, y, w, h }. Clicks hit-test against the latest frame's list.
  let buttons = [];

  function keyName(e) {
    if (e.code === 'Space') return 'space';
    if (e.code === 'Enter') return 'enter';
    if (e.code === 'KeyR') return 'r';
    if (e.code === 'KeyM') return 'm';
    if (e.code === 'KeyP') return 'p';
    if (e.code >= 'Digit1' && e.code <= 'Digit4') return e.code.slice(5);
    return null;
  }

  function onKeyDown(e) {
    const name = keyName(e);
    if (!name) return;
    if (name === 'space' || name === 'enter') e.preventDefault();
    if (name === 'space') spaceHeld = true;
    // Ignore key auto-repeat: one action per physical press.
    if (e.repeat) return;
    keys.add(name);
    onAction({ kind: 'key', key: name });
  }

  function onKeyUp(e) {
    const name = keyName(e);
    if (!name) return;
    if (name === 'space') spaceHeld = false;
    keys.delete(name);
  }

  function onMouseDown(e) {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    onAction({ kind: 'pointerDown', x, y });
    for (const b of buttons) {
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
        onAction({ kind: 'button', id: b.id });
        return;
      }
    }
    // A click anywhere else is a stage action (strike / quench / pump tap).
    onAction({ kind: 'tap', x, y });
  }

  function onMouseUp() {
    onAction({ kind: 'pointerUp' });
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);

  return {
    isSpaceHeld() { return spaceHeld; },
    setButtons(list) { buttons = list; },
    destroy() {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
    },
  };
}
