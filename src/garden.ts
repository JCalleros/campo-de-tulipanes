import {
  CanvasTexture, Color, CylinderGeometry, IcosahedronGeometry, InstancedMesh, Mesh,
  MeshStandardMaterial, Object3D, PlaneGeometry, SRGBColorSpace,
} from 'three';
import { beds, groundHeight, halfDepth, halfWidth, path, pathRadius, random, type Sector } from './field';

export function gardenFloor(sectors: Sector[]) {
  const width = 60, depth = 48, density = 32;
  const canvas = document.createElement('canvas');
  canvas.width = width * density;
  canvas.height = depth * density;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(density, density);
  ctx.translate(width / 2, depth / 2);
  ctx.fillStyle = '#727d50';
  ctx.fillRect(-width / 2, -depth / 2, width, depth);
  const next = random(904);
  for (const [x, z, rx, rz] of beds) {
    ctx.beginPath();
    ctx.ellipse(x, z, rx, rz, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#6b6147';
    ctx.fill();
  }
  const trail = new Path2D();
  trail.moveTo(path[0].x, path[0].z);
  for (const p of path) trail.lineTo(p.x, p.z);
  trail.closePath();
  ctx.lineJoin = 'round';
  ctx.lineWidth = pathRadius * 2 + .22;
  ctx.strokeStyle = '#9c9274';
  ctx.stroke(trail);
  ctx.lineWidth = pathRadius * 2;
  ctx.strokeStyle = '#bd9d78';
  ctx.stroke(trail);
  for (let i = 0; i < 92000; i++) {
    const x = (next() - .5) * width, z = (next() - .5) * depth;
    ctx.fillStyle = next() > .5 ? 'rgba(51,42,27,.16)' : 'rgba(255,236,180,.22)';
    ctx.fillRect(x, z, .02 + next() * .075, .018 + next() * .048);
  }
  for (const sector of sectors) {
    for (const flower of sector.flowers) {
      ctx.beginPath();
      ctx.ellipse(flower.x + .18, flower.z + .21, .16, .47, -.67, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(46,44,29,.22)';
      ctx.fill();
    }
  }
  const map = new CanvasTexture(canvas);
  map.colorSpace = SRGBColorSpace;
  map.anisotropy = 4;
  const geometry = new PlaneGeometry(width, depth, 60, 48);
  geometry.rotateX(-Math.PI / 2);
  const positions = geometry.getAttribute('position');
  for (let i = 0; i < positions.count; i++) positions.setY(i, groundHeight(positions.getX(i), positions.getZ(i)));
  geometry.computeVertexNormals();
  return new Mesh(geometry, new MeshStandardMaterial({ map, roughness: 1 }));
}

export function borders() {
  const next = random(72);
  const crowns: Object3D[] = [];
  const tones: Color[] = [];
  const trunks: Object3D[] = [];
  function foliage(x: number, y: number, z: number, sx: number, sy: number, sz: number, tint: string) {
    const part = new Object3D();
    part.position.set(x, y, z);
    part.scale.set(sx, sy, sz);
    part.rotation.set(next() * .12, next() * Math.PI, next() * .1);
    part.updateMatrix();
    crowns.push(part);
    tones.push(new Color(tint).multiplyScalar(.83 + next() * .27));
  }
  function shrub(x: number, z: number) {
    foliage(x, .37 + groundHeight(x, z), z, 1.04, .58 + next() * .14, 1.04, '#53694a');
    foliage(x + .14, .65 + groundHeight(x, z), z - .08, .72, .38, .68, '#647853');
  }
  for (let x = -halfWidth + 1; x <= halfWidth - 1; x += 1.15) {
    shrub(x, -halfDepth + .9);
    shrub(x, halfDepth - .9);
  }
  for (let z = -halfDepth + 1; z <= halfDepth - 1; z += 1.15) {
    shrub(-halfWidth + .9, z);
    shrub(halfWidth - .9, z);
  }
  for (let i = 0; i < 58; i++) {
    const angle = i * Math.PI * 2 / 58 + next() * .08;
    const x = Math.cos(angle) * (31 + next() * 13);
    const z = Math.sin(angle) * (25 + next() * 13);
    const height = 2.8 + next() * 3.6;
    const trunk = new Object3D();
    trunk.position.set(x, height * .25 - .25, z);
    trunk.scale.set(.18 + height * .016, height * .65, .23);
    trunk.updateMatrix();
    trunks.push(trunk);
    if (i % 3 === 0) {
      foliage(x, height * .65, z, height * .21, height * .7, height * .22, '#51684b');
    } else {
      for (let j = 0; j < 5; j++) {
        const a = j * 2.4;
        foliage(x + Math.cos(a) * .94, height * (.66 + next() * .25), z + Math.sin(a),
          1.4 + next(), 1.05 + next(), 1.45 + next(), i % 4 ? '#73835a' : '#9b8660');
      }
    }
  }
  const leaves = new InstancedMesh(new IcosahedronGeometry(1, 1),
    new MeshStandardMaterial({ roughness: 1 }), crowns.length);
  crowns.forEach((c, i) => { leaves.setMatrixAt(i, c.matrix); leaves.setColorAt(i, tones[i]); });
  const wood = new InstancedMesh(new CylinderGeometry(.7, 1, 1, 7),
    new MeshStandardMaterial({ color: '#6d5843' }), trunks.length);
  trunks.forEach((t, i) => wood.setMatrixAt(i, t.matrix));
  return { leaves, wood };
}
