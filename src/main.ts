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

let experience: ReturnType<typeof createExperience> | undefined;
let hintTimer: number | undefined;
let loading = false;
const controls = bindControls(canvas, document.querySelector<HTMLElement>('.joystick')!,
  document.querySelector<HTMLElement>('.knob')!);

function unavailable(): void {
  experience?.dispose();
  experience = undefined;
  window.clearTimeout(hintTimer);
  field.dataset.state = 'unavailable';
  welcome.inert = false;
  canvas.tabIndex = -1;
  enter.hidden = true;
  hud.hidden = true;
  status.hidden = false;
  status.textContent = 'No se pudo abrir el recorrido 3D. Puedes contemplar el campo o reintentar.';
  retry.hidden = false;
  retry.focus({ preventScroll: true });
}

async function load(): Promise<void> {
  if (loading) return;
  loading = true;
  try {
    const { createExperience } = await import('./experience');
    experience = createExperience(canvas, controls);
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
