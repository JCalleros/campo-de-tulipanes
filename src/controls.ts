import type { Walker } from './walk';

export function bindControls(surface: HTMLElement, joystick: HTMLElement, knob: HTMLElement) {
  const actions = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
  const pressed = new Set<string>();
  let active = false;
  let lookPointer: number | undefined;
  let stickPointer: number | undefined;
  let lookX = 0;
  let lookY = 0;
  let yaw = 0;
  let pitch = 0;
  let side = 0;
  let forward = 0;
  let originX = 0;
  let originY = 0;

  function releaseStick(): void {
    stickPointer = undefined;
    side = forward = 0;
    knob.style.transform = '';
  }

  function reset(): void {
    const capturedLook = lookPointer;
    const capturedStick = stickPointer;
    pressed.clear();
    lookPointer = undefined;
    yaw = pitch = 0;
    releaseStick();
    if (capturedLook !== undefined && surface.hasPointerCapture(capturedLook)) {
      surface.releasePointerCapture(capturedLook);
    }
    if (capturedStick !== undefined && joystick.hasPointerCapture(capturedStick)) {
      joystick.releasePointerCapture(capturedStick);
    }
  }

  surface.addEventListener('keydown', event => {
    if (!active || !actions.has(event.code) || event.altKey || event.ctrlKey || event.metaKey) return;
    event.preventDefault();
    pressed.add(event.code);
  });
  window.addEventListener('keyup', event => pressed.delete(event.code));
  window.addEventListener('blur', reset);
  surface.addEventListener('blur', reset);
  document.addEventListener('visibilitychange', reset);

  surface.addEventListener('pointerdown', event => {
    if (!active || lookPointer !== undefined || event.button !== 0) return;
    surface.focus({ preventScroll: true });
    lookPointer = event.pointerId;
    lookX = event.clientX;
    lookY = event.clientY;
    surface.setPointerCapture(event.pointerId);
  });
  surface.addEventListener('pointermove', event => {
    if (event.pointerId !== lookPointer) return;
    yaw -= (event.clientX - lookX) * .004;
    pitch -= (event.clientY - lookY) * .004;
    lookX = event.clientX;
    lookY = event.clientY;
  });
  surface.addEventListener('lostpointercapture', event => {
    if (lookPointer === event.pointerId) lookPointer = undefined;
  });
  surface.addEventListener('pointercancel', reset);

  function moveStick(event: PointerEvent): void {
    if (event.pointerId !== stickPointer) return;
    const x = event.clientX - originX;
    const y = event.clientY - originY;
    const limit = Math.max(34, Math.hypot(x, y));
    side = x / limit;
    forward = -y / limit;
    knob.style.transform = `translate(${side * 25}px, ${-forward * 25}px)`;
  }

  joystick.addEventListener('pointerdown', event => {
    if (!active || stickPointer !== undefined || event.button !== 0) return;
    event.preventDefault();
    const bounds = joystick.getBoundingClientRect();
    originX = bounds.x + bounds.width / 2;
    originY = bounds.y + bounds.height / 2;
    stickPointer = event.pointerId;
    joystick.setPointerCapture(stickPointer);
    moveStick(event);
  });
  joystick.addEventListener('pointermove', moveStick);
  joystick.addEventListener('lostpointercapture', event => {
    if (stickPointer === event.pointerId) releaseStick();
  });
  joystick.addEventListener('pointercancel', reset);

  return {
    activate(enabled: boolean): void {
      active = enabled;
      reset();
    },
    reset,
    update(walker: Walker, elapsed: number): void {
      const turning = Number(pressed.has('ArrowLeft')) - Number(pressed.has('ArrowRight'));
      walker.look(yaw + turning * elapsed * 1.55, pitch);
      yaw = pitch = 0;
      const advance = Number(pressed.has('KeyW') || pressed.has('ArrowUp'))
        - Number(pressed.has('KeyS') || pressed.has('ArrowDown'));
      const strafe = Number(pressed.has('KeyD')) - Number(pressed.has('KeyA'));
      walker.walk(advance + forward, strafe + side, elapsed);
    },
  };
}
