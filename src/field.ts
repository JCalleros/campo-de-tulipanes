export const fieldWidth = 384;
export const fieldDepth = 288;
export const halfWidth = fieldWidth / 2;
export const halfDepth = fieldDepth / 2;
export const sectorSize = 24;
export const entrance = { x: 0, z: 130 };
export const overlook = { x: 0, z: -117 };

const rowPitch = 2.8;
const southJunction = 119;
const northJunction = -117;

export const palette = [
  ['#fa433c', '#e52d34', '#c92738', '#fa514c'],
  ['#f8bf42', '#ffdb6b'],
  ['#fff1df', '#fff8ed'],
  ['#f6a0ad', '#e77eaa'],
  ['#fa7f40', '#ff9b51'],
  ['#b87ac2', '#9d68ae'],
] as const;

export function random(seed: number): () => number {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

export function pathCenter(z: number): number {
  const t = Math.max(0, Math.min(1, (entrance.z - z) / (entrance.z - overlook.z)));
  return -23 * Math.sin(t * Math.PI) + 7 * Math.sin(t * Math.PI * 2);
}

export function loopCenter(z: number): number | undefined {
  if (z < northJunction || z > southJunction) return;
  const progress = (southJunction - z) / (southJunction - northJunction);
  return pathCenter(z) + 91 * Math.sin(Math.PI * progress) ** 1.1;
}

function rawHeight(x: number, z: number): number {
  return 1.7 * Math.sin(x / 40 + z / 77) + 1.4 * Math.cos(z / 37 - x / 77)
    + 15 * Math.exp(-((x / 77) ** 2 + ((z + 117) / 53) ** 2));
}

export function groundHeight(x: number, z: number): number {
  const x0 = Math.floor(x / 2) * 2;
  const z0 = Math.floor(z / 2) * 2;
  const u = (x - x0) * .5;
  const v = (z - z0) * .5;
  const lower = rawHeight(x0, z0);
  const right = rawHeight(x0 + 2, z0);
  const upper = rawHeight(x0, z0 + 2);
  if (u + v <= 1) return lower * (1 - u - v) + right * u + upper * v;
  return rawHeight(x0 + 2, z0 + 2) * (u + v - 1) + right * (1 - v) + upper * (1 - u);
}

function rowBend(x: number): number {
  return 4.1 * Math.sin(x / 58) + 2.5 * Math.sin(x / 24);
}

export function distanceToPath(x: number, z: number): number {
  const lateral = loopCenter(z);
  const path = Math.abs(x - pathCenter(z)) - 2.2;
  const loop = lateral === undefined ? Infinity : Math.abs(x - lateral) - 1.45;
  const viewpoint = Math.hypot(x - overlook.x, (z - overlook.z) * 1.1) - 7;
  return Math.min(path, loop, viewpoint);
}

export function rowColor(x: number, z: number): number {
  const row = Math.round((z - rowBend(x)) / rowPitch);
  const block = Math.floor((x + halfWidth + row * 1.3) / 54);
  const band = ((Math.floor(row / 3) * 7 + block * 3) % 20 + 20) % 20;
  return band < 13 ? 0 : [1, 2, 3, 4, 5, 1, 5][band - 13];
}

export interface Flower {
  x: number;
  y: number;
  z: number;
  scale: number;
  angle: number;
  color: number;
  shade: number;
}

export interface Sector {
  x: number;
  z: number;
  flowers: Flower[];
}

export function plantField(): Sector[] {
  const columns = fieldWidth / sectorSize;
  const rows = fieldDepth / sectorSize;
  const sectors = Array.from({ length: columns * rows }, (_, i) => ({
    x: (i % columns + .5) * sectorSize - halfWidth,
    z: (Math.floor(i / columns) + .5) * sectorSize - halfDepth,
    flowers: [] as Flower[],
  }));
  const next = random(414239);
  for (let row = -52; row <= 52; row++) {
    for (let i = 0; i < 359; i++) {
      const x = -183 + i * 1.02 + (next() - .5) * .35;
      const z = row * rowPitch + rowBend(x) + (next() - .5) * .9;
      if (Math.abs(z) > halfDepth - 6 || distanceToPath(x, z) < .5) continue;
      const ix = Math.floor((x + halfWidth) / sectorSize);
      const iz = Math.floor((z + halfDepth) / sectorSize);
      sectors[iz * columns + ix].flowers.push({
        x, y: groundHeight(x, z), z, scale: .84 + next() * .48, angle: next() * Math.PI * 2,
        color: rowColor(x, z), shade: next(),
      });
      if (next() < .19) {
        const offset = z + (next() > .5 ? .16 : -.16);
        if (distanceToPath(x + .46, offset) < .5) continue;
        const offsetX = Math.floor((x + .46 + halfWidth) / sectorSize);
        const offsetZ = Math.floor((offset + halfDepth) / sectorSize);
        sectors[offsetZ * columns + offsetX].flowers.push({
          x: x + .46, y: groundHeight(x + .46, offset), z: offset,
          scale: .76 + next() * .45, angle: next() * Math.PI * 2,
          color: rowColor(x + .46, offset), shade: next(),
        });
      }
    }
  }
  return sectors;
}
