import { halfDepth, halfWidth, type Flower, type Sector } from './field';

interface GroundPosition {
  x: number;
  z: number;
}

const cellSize = 2;
const visitorRadius = .22;
const plantRadius = .25;
const clearance = .001;
const limitX = halfWidth - 2;
const limitZ = halfDepth - 2;

function cellKey(x: number, z: number): number {
  return x + z * 512;
}

export function createFieldCollision(sectors: readonly Sector[]) {
  const cells = new Map<number, Flower[]>();
  let reach = visitorRadius;
  for (const sector of sectors) {
    for (const flower of sector.flowers) {
      const key = cellKey(Math.floor(flower.x / cellSize), Math.floor(flower.z / cellSize));
      const cell = cells.get(key);
      if (cell) cell.push(flower);
      else cells.set(key, [flower]);
      reach = Math.max(reach, visitorRadius + plantRadius * flower.scale);
    }
  }

  return {
    move(position: GroundPosition, dx: number, dz: number): void {
      for (let contact = 0; contact < 4; contact++) {
        const endX = Math.max(-limitX, Math.min(limitX, position.x + dx));
        const endZ = Math.max(-limitZ, Math.min(limitZ, position.z + dz));
        dx = endX - position.x;
        dz = endZ - position.z;
        const lengthSquared = dx * dx + dz * dz;
        if (lengthSquared < 1e-12) return;

        const minX = Math.floor((Math.min(position.x, endX) - reach) / cellSize);
        const maxX = Math.floor((Math.max(position.x, endX) + reach) / cellSize);
        const minZ = Math.floor((Math.min(position.z, endZ) - reach) / cellSize);
        const maxZ = Math.floor((Math.max(position.z, endZ) + reach) / cellSize);
        let hitTime = 1;
        let hit: Flower | undefined;

        for (let cellZ = minZ; cellZ <= maxZ; cellZ++) {
          for (let cellX = minX; cellX <= maxX; cellX++) {
            const flowers = cells.get(cellKey(cellX, cellZ));
            if (!flowers) continue;
            for (const flower of flowers) {
              const x = position.x - flower.x;
              const z = position.z - flower.z;
              const approach = x * dx + z * dz;
              if (approach >= 0) continue;
              const radius = visitorRadius + plantRadius * flower.scale;
              const discriminant = approach * approach
                - lengthSquared * (x * x + z * z - radius * radius);
              if (discriminant <= 0) continue;
              const time = Math.max(0, (-approach - Math.sqrt(discriminant)) / lengthSquared);
              if (time >= hitTime) continue;
              hitTime = time;
              hit = flower;
            }
          }
        }

        if (!hit) {
          position.x = endX;
          position.z = endZ;
          return;
        }

        const travel = Math.max(0, hitTime - clearance / Math.sqrt(lengthSquared));
        position.x += dx * travel;
        position.z += dz * travel;
        const normalX = position.x - hit.x;
        const normalZ = position.z - hit.z;
        const normalLengthSquared = normalX * normalX + normalZ * normalZ;
        dx *= 1 - travel;
        dz *= 1 - travel;
        const inward = (dx * normalX + dz * normalZ) / normalLengthSquared;
        dx -= normalX * inward;
        dz -= normalZ * inward;
      }
    },
  };
}
