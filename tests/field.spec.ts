import { expect, test } from '@playwright/test';

test('abre el campo y permite volver a la entrada', async ({ page, hasTouch }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error' && /THREE.*shader/i.test(message.text())) errors.push(message.text());
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Campo de Tulipanes' })).toBeVisible();
  const enter = page.getByRole('button', { name: 'Entrar al campo' });
  await expect(enter).toBeEnabled();
  if (hasTouch) await enter.tap();
  else await enter.focus().then(() => page.keyboard.press('Enter'));

  await expect(page.locator('canvas')).toBeFocused();
  await expect(page.getByRole('button', { name: 'Volver a la entrada' })).toBeInViewport();
  const guide = page.getByRole('button', { name: 'Controles' });
  await guide.click();
  await expect(guide).toHaveAttribute('aria-expanded', 'true');
  await page.getByRole('button', { name: 'Volver a la entrada' }).click();
  await expect(page.locator('canvas')).toBeFocused();
  expect(errors).toEqual([]);
});

test('muestra una alternativa si WebGL no está disponible', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = new Proxy(original, {
      apply: (target, canvas, args) => args[0] === 'webgl2' ? null : Reflect.apply(target, canvas, args),
    });
  });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Reintentar' })).toBeVisible();
  await expect(page.getByRole('status')).toContainText('recorrido 3D');
  const image = await page.request.get('/mirador.webp');
  expect(image.ok()).toBe(true);
  expect(image.headers()['content-type']).toContain('image/webp');
});

test('muestra el paisaje estático cuando se pierde el contexto', async ({ page }, info) => {
  test.skip(info.project.name !== 'chromium-escritorio', 'La pérdida de WebGL se comprueba una vez en Chromium');
  await page.goto('/');
  await page.getByRole('button', { name: 'Entrar al campo' }).click();
  const lost = await page.locator('canvas').evaluate(canvas => {
    const extension = canvas.getContext('webgl2')?.getExtension('WEBGL_lose_context');
    extension?.loseContext();
    return Boolean(extension);
  });
  expect(lost).toBe(true);
  await expect(page.getByRole('button', { name: 'Reintentar' })).toBeFocused();
  await expect(page.getByRole('status')).toBeVisible();
});
