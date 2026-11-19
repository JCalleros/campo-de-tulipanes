import '@fontsource-variable/playfair-display';
import '@fontsource-variable/quicksand';
import './style.css';
import { bindControls } from './controls';
import type { createExperience } from './experience';

const field = document.querySelector<HTMLElement>('.field')!;
const canvas = document.querySelector<HTMLCanvasElement>('canvas')!;
const welcome = document.querySelector<HTMLElement>('.welcome')!;
const enter = document.querySelector<HTMLButtonElement>('.enter')!;
const status = document.querySelector<HTMLElement>('.status')!;
const retry = document.querySelector<HTMLButtonElement>('.retry')!;
const hud = document.querySelector<HTMLElement>('.hud')!;
const back = document.querySelector<HTMLButtonElement>('.back')!;
const guide = document.querySelector<HTMLButtonElement>('.guide')!;
const panel = document.querySelector<HTMLElement>('.guide-panel')!;
const hint = document.querySelector<HTMLElement>('.hint')!;

const readFlower = document.querySelector<HTMLButtonElement>('.read-flower')!;
const staticRead = document.querySelector<HTMLButtonElement>('.static-read')!;
const dialog = document.querySelector<HTMLDialogElement>('.dedication')!;
const dismiss = document.querySelector<HTMLButtonElement>('.continue')!;

let experience: ReturnType<typeof createExperience> | undefined;
let hintTimer: number | undefined;
let loading = false;
const controls = bindControls(canvas, document.querySelector<HTMLElement>('.joystick')!,
  document.querySelector<HTMLElement>('.knob')!);

function unavailable(): void {
  if (dialog.open) dialog.close();
  experience?.dispose();
  experience = undefined;
  window.clearTimeout(hintTimer);
  field.dataset.state = 'unavailable';
  welcome.inert = false;
  canvas.tabIndex = -1;
  enter.hidden = true;
  hud.hidden = true;
  status.hidden = false;
  status.textContent = 'El recorrido 3D no está disponible. Puedes leer la dedicatoria desde aquí.';
  readFlower.hidden = true;
  staticRead.hidden = false;
  dismiss.textContent = 'Volver al jardín';
  retry.hidden = false;
  retry.focus({ preventScroll: true });
}

async function load(): Promise<void> {
  if (loading) return;
  loading = true;
  try {
    const { createExperience } = await import('./experience');
    experience = createExperience(canvas, controls, visible => {
      readFlower.hidden = !visible;
    });
    field.dataset.state = 'ready';
    enter.disabled = false;
    status.hidden = true;
  } catch {
    unavailable();
  } finally {
    loading = false;
  }
}

enter.addEventListener('click', () => {
  if (!experience) return;
  field.dataset.state = 'walking';
  welcome.inert = true;
  hud.hidden = false;
  canvas.tabIndex = 0;
  canvas.focus({ preventScroll: true });
  experience.enter();
  hintTimer = window.setTimeout(() => { hint.hidden = true; }, 7000);
});

back.addEventListener('click', () => {
  experience?.reset();
  canvas.focus({ preventScroll: true });
});

guide.addEventListener('click', () => {
  panel.hidden = !panel.hidden;
  guide.setAttribute('aria-expanded', String(!panel.hidden));
});
retry.addEventListener('click', () => location.reload());
canvas.addEventListener('webglcontextlost', event => {
  event.preventDefault();
  unavailable();
});
window.addEventListener('pageshow', () => {
  if (field.dataset.state === 'loading') void load();
}, { once: true });

function openDedication(): void {
  if (dialog.open) return;
  experience?.pause(true);
  dialog.showModal();
  dismiss.focus({ preventScroll: true });
}

let flowerTouch: Touch | undefined;
readFlower.addEventListener('touchstart', event => {
  flowerTouch = event.targetTouches.length === 1 ? event.targetTouches[0] : undefined;
}, { passive: true });
readFlower.addEventListener('touchcancel', () => { flowerTouch = undefined; });
readFlower.addEventListener('touchend', event => {
  const start = flowerTouch;
  const end = event.changedTouches[0];
  flowerTouch = undefined;
  if (!start || start.identifier !== end.identifier || readFlower.hidden) return;
  if (Math.hypot(end.clientX - start.clientX, end.clientY - start.clientY) > 10) return;
  if (!readFlower.contains(document.elementFromPoint(end.clientX, end.clientY))) return;
  event.preventDefault();
  openDedication();
}, { passive: false });
readFlower.addEventListener('click', openDedication);
staticRead.addEventListener('click', openDedication);
canvas.addEventListener('keydown', event => {
  if (event.code !== 'KeyE' || event.repeat || event.ctrlKey || event.metaKey || event.altKey || readFlower.hidden) return;
  event.preventDefault();
  openDedication();
});
function closeDedication(): void {
  dialog.close();
  if (field.dataset.state === 'walking') {
    experience?.pause(false);
    canvas.focus({ preventScroll: true });
  } else {
    staticRead.focus({ preventScroll: true });
  }
}
dismiss.addEventListener('click', closeDedication);
dialog.addEventListener('cancel', event => {
  event.preventDefault();
  closeDedication();
});
