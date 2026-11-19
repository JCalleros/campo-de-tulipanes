import { expect, test } from '@playwright/test';
import { PerspectiveCamera } from 'three';
import { createFieldCollision } from '../src/collision';
import { entrance, entranceYaw, path, plantField, specialFlower } from '../src/field';
import { Walker } from '../src/walk';

test.use({ deviceScaleFactor: .5 });

test('el circuito se recorre en ambos sentidos y la flor es única y accesible', ({}, info) => {
  test.skip(info.project.name !== 'chromium-escritorio', 'El trazado y las colisiones son comunes');
  const sectors = plantField();
  expect(sectors.flatMap(s => s.flowers).filter(f => f === specialFlower)).toHaveLength(1);
  for (const points of [path, [...path].reverse()]) {
    const camera = new PerspectiveCamera();
    const walker = new Walker(camera, createFieldCollision(sectors));
    let seconds = 0;
    let nearest = Infinity;
    for (let i = 1; i < points.length; i++) {
      const dx = points[i].x - camera.position.x, dz = points[i].z - camera.position.z;
      const angle = Math.atan2(-dx, -dz);
      walker.look(angle - camera.rotation.y, 0);
      const duration = Math.hypot(dx, dz) / 2.4;
      const steps = Math.ceil(duration * 60);
      for (let step = 0; step < steps; step++) walker.walk(1, 0, duration / steps);
      expect(Math.hypot(points[i].x - camera.position.x, points[i].z - camera.position.z)).toBeLessThan(.005);
      nearest = Math.min(nearest, Math.hypot(camera.position.x - specialFlower.x, camera.position.z - specialFlower.z));
      seconds += duration;
    }
    expect(seconds).toBeGreaterThan(40);
    expect(seconds).toBeLessThan(60);
    expect(nearest).toBeLessThan(2);
    expect(Math.hypot(camera.position.x - entrance.x, camera.position.z - entrance.z)).toBeLessThan(.005);
  }
});

test('descubre la dedicatoria, pausa el paseo y permite volver a leerla', async ({ page, hasTouch }) => {
  test.setTimeout(120_000);
  await page.clock.install();
  await page.goto('/');
  await page.getByRole('button', { name: 'Entrar al jardín' }).click();
  const read = page.getByRole('button', { name: 'Leer la dedicatoria' });
  const dialog = page.getByRole('dialog', { name: 'Para ti' });
  await expect(read).toBeHidden();
  await page.clock.pauseAt(new Date(Date.now() + 1800));
  const canvas = page.locator('canvas');
  const bounds = (await canvas.boundingBox())!;
  const origin = { x: bounds.width * .5, y: bounds.height * .45 };
  let yaw = entranceYaw;
  async function face(angle: number) {
    const difference = Math.atan2(Math.sin(angle - yaw), Math.cos(angle - yaw));
    const parts = Math.max(1, Math.ceil(Math.abs(difference) / (.004 * bounds.width * .4)));
    for (let j = 0; j < parts; j++) {
      await page.mouse.move(origin.x, origin.y);
      await page.mouse.down();
      await page.mouse.move(origin.x - difference / (.004 * parts), origin.y);
      await page.mouse.up();
      await page.clock.runFor(20);
    }
    yaw = angle;
  }
  let previous = entrance;
  for (const i of [6, 12, 18, 24, 29]) {
    const point = path[i];
    await face(Math.atan2(previous.x - point.x, previous.z - point.z));
    await page.keyboard.down('w');
    await page.clock.runFor(Math.round(previous.distanceTo(point) / 2.4 * 1000));
    await page.keyboard.up('w');
    previous = point;
  }
  await face(Math.atan2(previous.x - specialFlower.x, previous.z - specialFlower.z));
  await expect(read).toBeVisible();
  if (hasTouch) await read.tap();
  else await page.keyboard.press('e');
  await expect(dialog).toBeVisible();
  await page.screenshot({ path: test.info().outputPath('dedicatoria.png') });
  await expect(dialog).toContainText('Entre tantas flores, mis ojos siempre te buscarían a ti.');
  await page.keyboard.down('w');
  await page.clock.runFor(1000);
  await page.keyboard.up('w');
  const dismiss = page.getByRole('button', { name: 'Seguir paseando' });
  if (hasTouch) await dismiss.tap();
  else await page.keyboard.press('Escape');
  await page.clock.runFor(32);
  await expect(canvas).toBeFocused();
  await expect(read).toBeVisible();
  if (hasTouch) await read.tap();
  else await read.click();
  await expect(dialog).toBeVisible();
  await dismiss.click();
  await page.keyboard.down('s');
  await page.clock.runFor(650);
  await page.keyboard.up('s');
  await expect(read).toBeHidden();
});
