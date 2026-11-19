import { ACESFilmicToneMapping, PerspectiveCamera, Scene, Vector3, WebGLRenderer } from 'three';
import { createFieldCollision } from './collision';
import { bindControls } from './controls';
import { plantField, specialFlower } from './field';
import { createFlowers } from './flowers';
import { createLandscape } from './landscape';
import { Walker } from './walk';

export function createExperience(surface: HTMLCanvasElement, controls: ReturnType<typeof bindControls>,
  onFlowerVisible: (visible: boolean) => void) {
  const gl = surface.getContext('webgl2', { alpha: false, antialias: true });
  if (!gl) throw new Error('WebGL 2 no disponible');

  const renderer = new WebGLRenderer({ canvas: surface, context: gl });
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.19;
  const scene = new Scene();
  const camera = new PerspectiveCamera(62, 1, .08, 620);
  const sectors = plantField();
  const walker = new Walker(camera, createFieldCollision(sectors));
  const landscape = createLandscape(scene, sectors);
  const flowers = createFlowers(sectors);
  scene.add(flowers.group);

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const touch = window.matchMedia('(pointer: coarse)');
  let compact = false;
  let exploring = false;
  let paused = false;
  let flowerVisible = false;
  const blossom = new Vector3(specialFlower.x, specialFlower.y + .85 * specialFlower.scale, specialFlower.z);
  const projected = new Vector3();

  function updatePrompt(): void {
    let visible = false;
    if (exploring && !paused && (camera.position.x - blossom.x) ** 2 + (camera.position.z - blossom.z) ** 2 <= 4) {
      camera.updateMatrixWorld();
      projected.copy(blossom).project(camera);
      visible = Math.abs(projected.x) < 1 && Math.abs(projected.y) < 1 && Math.abs(projected.z) < 1;
    }
    if (visible !== flowerVisible) {
      flowerVisible = visible;
      onFlowerVisible(visible);
    }
  }
  let pixelRatio = 1;
  let lastFrame: number | undefined;
  let time = 0;
  let accumulated = 0;
  let qualityTime = 0;
  let frames = 0;

  function draw(): void {
    landscape.sky.position.copy(camera.position);
    flowers.update(camera.position.x, camera.position.z, compact, time, reduced.matches);
    updatePrompt();
    renderer.render(scene, camera);
  }

  function size(): void {
    const width = surface.clientWidth;
    const height = surface.clientHeight;
    if (!width || !height) return;
    compact = touch.matches || width < 760;
    pixelRatio = Math.min(devicePixelRatio, compact ? 1.15 : 1.6);
    camera.fov = width < height ? 66 : 60;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height, false);
    draw();
  }

  function frame(now: number): void {
    const delta = lastFrame === undefined ? 0 : (now - lastFrame) / 1000;
    lastFrame = now;
    const elapsed = Math.min(.05, delta);
    time += elapsed;
    if (exploring && !paused) controls.update(walker, elapsed);
    draw();

    if (!exploring || delta > .25 || delta <= 0) return;
    accumulated += delta;
    frames++;
    qualityTime += delta;
    if (accumulated >= 2) {
      if (qualityTime > 4 && frames / accumulated < 36 && pixelRatio > .75) {
        pixelRatio = Math.max(.75, pixelRatio * .83);
        renderer.setPixelRatio(pixelRatio);
        renderer.setSize(surface.clientWidth, surface.clientHeight, false);
        qualityTime = 0;
      }
      accumulated = frames = 0;
    }
  }

  function syncLoop(): void {
    lastFrame = undefined;
    renderer.setAnimationLoop(document.hidden || paused || (!exploring && reduced.matches) ? null : frame);
    if (!document.hidden) draw();
  }

  try {
    size();
  } catch (error) {
    landscape.dispose();
    flowers.dispose();
    renderer.dispose();
    throw error;
  }
  const resizeObserver = new ResizeObserver(size);
  resizeObserver.observe(surface);
  document.addEventListener('visibilitychange', syncLoop);
  reduced.addEventListener('change', syncLoop);
  syncLoop();

  return {
    enter(): void {
      exploring = true;
      controls.activate(true);
      syncLoop();
    },
    pause(value: boolean): void {
      paused = value;
      controls.activate(exploring && !paused);
      syncLoop();
    },
    reset(): void {
      controls.reset();
      walker.reset();
      draw();
    },
    dispose(): void {
      renderer.setAnimationLoop(null);
      controls.activate(false);
      resizeObserver.disconnect();
      document.removeEventListener('visibilitychange', syncLoop);
      reduced.removeEventListener('change', syncLoop);
      landscape.dispose();
      flowers.dispose();
      renderer.dispose();
    },
  };
}
