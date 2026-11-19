import {
  Box3, BufferAttribute, BufferGeometry, Color, CylinderGeometry, DoubleSide, Group, InstancedMesh,
  MeshStandardMaterial, Object3D, SphereGeometry,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { palette, sectorSize, specialFlower, type Sector } from './field';
import { tulipTepal } from './tulip-tepal';
import { createSpecialTulip } from './special-tulip';

function tint(geometry: BufferGeometry, color: Color, isPetal: boolean): BufferGeometry {
  const count = geometry.getAttribute('position').count;
  const rgb = new Float32Array(count * 3);
  const petal = new Float32Array(count).fill(Number(isPetal));
  for (let i = 0; i < count; i++) color.toArray(rgb, i * 3);
  geometry.setAttribute('color', new BufferAttribute(rgb, 3));
  geometry.setAttribute('petal', new BufferAttribute(petal, 1));
  return geometry;
}

function surface(across: number, along: number, vertex: (u: number, v: number) => [number, number, number]) {
  const positions: number[] = [];
  const indices: number[] = [];
  for (let y = 0; y <= along; y++) {
    for (let x = 0; x <= across; x++) {
      positions.push(...vertex(x / across * 2 - 1, y / along));
      if (y === along || x === across) continue;
      const i = y * (across + 1) + x;
      indices.push(i, i + 1, i + across + 1, i + across + 1, i + 1, i + across + 2);
    }
  }
  const mesh = new BufferGeometry();
  mesh.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  mesh.setIndex(indices);
  mesh.computeVertexNormals();
  return mesh;
}

function makeFlower(detail: boolean) {
  const bloomY = .65;
  const stem = new CylinderGeometry(.014, .021, bloomY, detail ? 6 : 4, detail ? 6 : 3)
    .translate(0, bloomY / 2, 0);
  stem.deleteAttribute('uv');
  const geometries = [tint(stem, new Color('#4e7031'), false)];
  const leafCount = detail ? 3 : 1;
  for (let i = 0; i < leafCount; i++) {
    const leaf = surface(detail ? 4 : 2, detail ? 7 : 3, (u, v) => {
      const width = Math.sin(v * Math.PI) ** .8 * .058;
      return [u * width, .08 + i * .067 + Math.sin(v * 1.85) * .46, .35 * v ** 1.35 + .025 * u * u * v];
    });
    leaf.rotateY(i * 2.4 + .42);
    geometries.push(tint(leaf, new Color(i % 2 ? '#6d8b3b' : '#537838'), false));
  }

  function oval(x: number, y: number, z: number, rx: number, ry: number, rz: number, color: string, petal = false) {
    const geometry = new SphereGeometry(1, 6, 4).scale(rx, ry, rz).translate(x, y, z);
    geometry.deleteAttribute('uv');
    geometries.push(tint(geometry, new Color(color), petal));
  }
  oval(0, bloomY + .004, 0, .015, .012, .015, '#d3bcb4', true);
  if (detail) {
    oval(0, bloomY + .065, 0, .014, .054, .014, '#debf69');
    for (let k = 0; k < 6; k++) {
      const a = k * Math.PI / 3;
      const x = .027 * Math.sin(a), z = .027 * Math.cos(a);
      oval(x, bloomY + .055, z, .0045, .046, .0045, '#edcd83');
      oval(x, bloomY + .101, z, .008, .018, .008, '#ae7739');
    }
  }
  for (let i = 0; i < 6; i++) {
    const across = detail ? 8 : 3;
    const petal = tulipTepal(i, .31, .131, across, detail ? 10 : 5);
    petal.rotateY(i * Math.PI / 3).translate(0, bloomY, 0);
    petal.deleteAttribute('uv');
    tint(petal, new Color(0xffffff), true);
    const colors = petal.getAttribute('color');
    const positions = petal.getAttribute('position');
    for (let j = 0; j < positions.count; j++) {
      const u = (j % (across + 1)) / across;
      const light = .58 + (positions.getY(j) - bloomY) * 1.14 + .04 * Math.cos(u * 12);
      colors.setXYZ(j, light, light, light);
    }
    geometries.push(petal);
  }
  const flower = mergeGeometries(geometries)!;
  for (const geometry of geometries) geometry.dispose();
  return flower;
}

export function createFlowers(sectors: Sector[]) {
  const group = new Group();
  const windTime = { value: 0 };
  const windStrength = { value: 1 };
  const near = makeFlower(true);
  const far = makeFlower(false);
  const material = new MeshStandardMaterial({ vertexColors: true, roughness: .74, side: DoubleSide });
  material.onBeforeCompile = shader => {
    shader.uniforms.windTime = windTime;
    shader.uniforms.windStrength = windStrength;
    shader.vertexShader = `
      attribute float petal;
      uniform float windTime;
      uniform float windStrength;
      ${shader.vertexShader}
    `.replace('#include <color_vertex>', `
      #include <color_vertex>
      #ifdef USE_INSTANCING_COLOR
        vColor = mix(color, vColor, petal);
      #endif
    `).replace('#include <begin_vertex>', `
      #include <begin_vertex>
      #ifdef USE_INSTANCING
        vec2 origin = instanceMatrix[3].xz;
        float bend = pow(max(position.y, 0.0), 1.7);
        float sway = sin(windTime * 1.42 + origin.x * 0.16 + origin.y * 0.21);
        float gust = sin(windTime * 0.62 + origin.x * 0.08 - origin.y * 0.13);
        vec2 wind = vec2(0.065 + 0.057 * sway + 0.06 * gust, 0.049 * sway);
        mat2 localWind = mat2(instanceMatrix[0].xz, instanceMatrix[2].xz);
        transformed.xz += inverse(localWind) * wind * bend * windStrength;
      #endif
    `);
  };

  const transform = new Object3D();
  const color = new Color();
  const special = createSpecialTulip();
  group.add(special.root);
  const plots = sectors.filter(plot => plot.flowers.length).map(plot => {
    const flowers = plot.flowers.filter(flower => flower !== specialFlower);
    const mesh = new InstancedMesh(far, material, flowers.length);
    for (const [i, flower] of flowers.entries()) {
      transform.position.set(flower.x, flower.y, flower.z);
      transform.rotation.set(0, flower.angle, 0);
      transform.scale.set(flower.scale, flower.scale * (.94 + .16 * flower.shade), flower.scale);
      transform.updateMatrix();
      mesh.setMatrixAt(i, transform.matrix);
      const choices = palette[flower.color];
      color.set(choices[Math.floor(flower.shade * choices.length)]);
      mesh.setColorAt(i, color);
    }
    mesh.computeBoundingBox();
    mesh.boundingBox = (mesh.boundingBox ?? new Box3()).expandByScalar(.32);
    mesh.computeBoundingSphere();
    if (mesh.boundingSphere) mesh.boundingSphere.radius += .40;
    mesh.visible = false;
    group.add(mesh);
    return { mesh, x: plot.x, z: plot.z };
  });
  
  let lastX = Infinity;
  let lastZ = Infinity;
  let lastCompact: boolean | undefined;

  return {
    group,
    update(x: number, z: number, compact: boolean, time: number, reducedMotion: boolean): void {
      special.update(time, Math.hypot(x - specialFlower.x, z - specialFlower.z), reducedMotion);
      windTime.value = time;
      windStrength.value = reducedMotion ? 0 : 1;
      if (compact === lastCompact && Math.abs(lastX - x) < 2 && Math.abs(lastZ - z) < 2) return;
      lastX = x;
      lastZ = z;
      lastCompact = compact;
      const nearRadius = compact ? 6 : 10;
      const farRadius = compact ? 80 : 108;
      for (const plot of plots) {
        const dx = Math.max(0, Math.abs(x - plot.x) - sectorSize / 2);
        const dz = Math.max(0, Math.abs(z - plot.z) - sectorSize / 2);
        const distance = Math.hypot(dx, dz);
        if (plot.mesh.geometry !== near && distance < nearRadius) plot.mesh.geometry = near;
        if (plot.mesh.geometry === near && distance > nearRadius + 6) plot.mesh.geometry = far;
        plot.mesh.visible = distance < farRadius + (plot.mesh.visible ? 8 : 0);
      }
    },
    dispose(): void {
      for (const { mesh } of plots) mesh.dispose();
      material.dispose();
      special.dispose();
      near.dispose();
      far.dispose();
    },
  };
}
