import { CatmullRomCurve3, Vector3 } from 'three';

export const fieldWidth = 48;
export const fieldDepth = 36;
export const halfWidth = fieldWidth / 2;
export const halfDepth = fieldDepth / 2;
export const sectorSize = 6;
export const pathRadius = 1.55;
const route = [
  [-9, 12], [-15, 9], [-18, 3], [-17, -5], [-12, -11], [-3, -13],
  [6, -11], [13, -12], [18, -7], [19, 1], [16, 9], [8, 13], [0, 12],
];
const loop = new CatmullRomCurve3(route.map(([x, z]) => new Vector3(x, 0, z)), true);
export const path = loop.getSpacedPoints(180);
export const entrance = path[0];
export const entranceYaw = Math.atan2(entrance.x - path[4].x, entrance.z - path[4].z);
export const groundHeight = (x: number, z: number) => .13 * Math.cos(x / 11) * Math.sin(z / 9);

export function distanceToPath(x: number, z: number): number {
  let nearest = Infinity;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1];
    const b = path[i];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz)));
    nearest = Math.min(nearest, (x - a.x - t * dx) ** 2 + (z - a.z - t * dz) ** 2);
  }
  return Math.sqrt(nearest) - pathRadius;
}

export function random(seed: number): () => number {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

export const palette = [
  ['#dd474d', '#f16d67', '#c8394a'], ['#f8bd59', '#ffcf83'], ['#fff0dc', '#f7d8bf'],
  ['#ee9eae', '#dd809c'], ['#e99170', '#ffa77e'], ['#a678ad', '#b896c5'],
] as const;

export interface Flower {
  x: number; y: number; z: number; scale: number; angle: number; color: number; shade: number;
}
export interface Sector { x: number; z: number; flowers: Flower[] }

export const beds = [
  [-13, 4, 5.6, 7, 3], [-7, 6.4, 5, 3.7, 2], [.5, 5.8, 5.8, 3.4, 0],
  [8.1, 6, 5.5, 3.6, 3], [12.8, .4, 3.7, 5, 4], [7.2, -6, 6.5, 3.5, 5],
  [-2.5, -6.8, 6.1, 3.6, 1], [-10, -3, 5, 4.1, 0], [-1, .4, 4.3, 2.6, 3],
  [-20, -2, 2.7, 8, 5], [-18, 11, 4.6, 4, 2], [-11, -13, 7.8, 2.6, 3],
  [1, -14, 6, 2.4, 4], [15, -13.2, 6, 2.6, 2], [20.7, -3, 2, 7, 0],
  [18.8, 10.5, 3.8, 4.4, 1], [6, 14.6, 7.6, 1.6, 5], [-7, 14.5, 6.8, 1.7, 4],
] as const;

const bend = loop.getPointAt(.16);
const tangent = loop.getTangentAt(.16);
const specialX = bend.x + tangent.z * (pathRadius + .24);
const specialZ = bend.z - tangent.x * (pathRadius + .24);
export const specialFlower: Flower = {
  x: specialX, z: specialZ, y: groundHeight(specialX, specialZ),
  scale: 1.35, angle: .4, color: 3, shade: .5,
};

export function plantField(): Sector[] {
  const columns = fieldWidth / sectorSize;
  const sectors = Array.from({ length: columns * fieldDepth / sectorSize }, (_, i) => ({
    x: (i % columns + .5) * sectorSize - halfWidth,
    z: (Math.floor(i / columns) + .5) * sectorSize - halfDepth, flowers: [] as Flower[],
  }));
  function plant(flower: Flower): void {
    const column = Math.floor((flower.x + halfWidth) / sectorSize);
    const row = Math.floor((flower.z + halfDepth) / sectorSize);
    sectors[row * columns + column].flowers.push(flower);
  }
  const next = random(414239);
  for (let row = -16; row <= 16; row += .87) {
    for (let column = -22; column <= 22; column += .82) {
      const x = column + (next() - .5) * .44;
      const z = row + (next() - .5) * .44;
      const bed = beds.find(([cx, cz, rx, rz]) => ((x - cx) / rx) ** 2 + ((z - cz) / rz) ** 2 < 1);
      if (!bed || distanceToPath(x, z) < .27 || Math.hypot(x - specialX, z - specialZ) < 1.10) continue;
      plant({ x, y: groundHeight(x, z), z, scale: .87 + next() * .23, angle: next() * Math.PI * 2,
        color: bed[4], shade: next() });
    }
  }
  plant(specialFlower);
  return sectors;
}
