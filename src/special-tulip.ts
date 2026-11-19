import {
  BufferAttribute, BufferGeometry, CanvasTexture, CatmullRomCurve3, Color, DoubleSide,
  Group, Mesh, MeshStandardMaterial, SphereGeometry, SRGBColorSpace, TubeGeometry, Vector3,
} from 'three';
import { ParametricGeometry } from 'three/addons/geometries/ParametricGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { tulipTepal } from './tulip-tepal';
import { specialFlower, random } from './field';

const tau = Math.PI * 2;
const smooth = (start: number, end: number, value: number) => {
  const t = Math.min(1, Math.max(0, (value - start) / (end - start)));
  return t * t * (3 - 2 * t);
};

function petalTexture() {
  const side = 384;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = side;
  const ctx = canvas.getContext('2d')!;
  const image = ctx.createImageData(side, side);
  const next = random(9102);
  for (let y = 0; y < side; y++) {
    const v = 1 - y / (side - 1);
    for (let x = 0; x < side; x++) {
      const u = x / (side - 1) * 2 - 1;
      const vein = u * (1 - .23 * v) + .028 * Math.sin(v * 5 + u * 6) + .011 * Math.sin(v * 12 - u * 8);
      const streak = .5 + .5 * Math.cos(vein * 25 + Math.sin(vein * 13));
      const flame = .23 + .57 * streak ** 1.5 + .13 * Math.cos(vein * 8);
      const blush = 1 - smooth(flame - .18, flame + .12, v);
      const base = smooth(0, .31, v);
      const rib = Math.cos(vein * 115 + .6 * Math.sin(vein * 47));
      const silk = 4.2 * rib + 2.2 * Math.cos(vein * 277) + (next() - .5) * 4;
      const rim = smooth(.87, 1, v) * 9;
      const i = (y * side + x) * 4;
      image.data[i] = 255 - blush * (43 - 19 * base) + silk;
      image.data[i + 1] = 182 + 30 * v - blush * (120 - 16 * base) + silk + rim;
      image.data[i + 2] = 188 + 10 * v - blush * (77 - 18 * base) + silk + rim;
      image.data[i + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  const map = new CanvasTexture(canvas);
  map.colorSpace = SRGBColorSpace;
  map.anisotropy = 4;
  return map;
}

export function createSpecialTulip() {
  const root = new Group();
  root.position.set(specialFlower.x, specialFlower.y, specialFlower.z);
  root.scale.setScalar(specialFlower.scale);
  const head = new Group();
  const stemCurve = new CatmullRomCurve3([
    new Vector3(), new Vector3(-.025, .29, .014), new Vector3(.018, .57, .02), new Vector3(.062, .79, 0),
  ]);
  head.position.copy(stemCurve.getPoint(1));
  root.add(head);
  const pieces: BufferGeometry[] = [];
  const tint = new Color();
  function tintPart(geometry: BufferGeometry, color: string) {
    const pos = geometry.getAttribute('position');
    const rgb = new Float32Array(pos.count * 3);
    tint.set(color);
    for (let i = 0; i < pos.count; i++) tint.toArray(rgb, i * 3);
    geometry.setAttribute('color', new BufferAttribute(rgb, 3));
    pieces.push(geometry);
  }
  tintPart(new TubeGeometry(stemCurve, 20, .016, 12, false), '#839753');
  for (let k = 0; k < 3; k++) {
    const length = 1 - k * .12;
    const leaf = new ParametricGeometry((s, v, p) => {
      const u = s * 2 - 1;
      const width = (.007 + .069 * Math.sin(Math.PI * v) ** .85) * length;
      const twist = .6 * v;
      p.set(u * width * Math.cos(twist), Math.sin(v * 1.85) * .51 * length + .018 * u * v,
        .37 * v ** 1.6 * length + u * width * Math.sin(twist) + Math.abs(u) ** 1.4 * width * .62);
    }, 14, 28);
    leaf.rotateY(k * 2.35 + .5);
    const base = stemCurve.getPoint(.09 + k * .16);
    leaf.translate(base.x, base.y, base.z);
    tintPart(leaf, '#578359');
    const colors = leaf.getAttribute('color');
    for (let i = 0; i < colors.count; i++) {
      const u = Math.abs((i % 15) / 7 - 1);
      const light = 1 + .58 * Math.exp(-u * 19) + .12 * Math.cos(u * 27);
      colors.setXYZ(i, tint.r * light, tint.g * light, tint.b * light);
    }
  }
  const plantMaterial = new MeshStandardMaterial({ vertexColors: true, side: DoubleSide, roughness: .65 });
  function assemble(parent: Group) {
    const geometry = mergeGeometries(pieces)!;
    parent.add(new Mesh(geometry, plantMaterial));
    for (const piece of pieces) piece.dispose();
    pieces.length = 0;
    return geometry;
  }
  const plant = assemble(root);
  function oval(x: number, y: number, z: number, rx: number, ry: number, rz: number, color: string, angle = 0) {
    tintPart(new SphereGeometry(1, 14, 10).scale(rx, ry, rz).rotateY(angle).translate(x, y, z), color);
  }
  oval(0, .07, 0, .028, .095, .028, '#e2c871');
  for (let k = 0; k < 6; k++) {
    const a = k * tau / 6;
    const x = Math.sin(a), z = Math.cos(a);
    const h = .175 + .014 * Math.cos(k * 2);
    const filament = new CatmullRomCurve3([new Vector3(x * .026, .003, z * .026),
      new Vector3(x * .048, .10, z * .048), new Vector3(x * .085, h, z * .085)]);
    tintPart(new TubeGeometry(filament, 10, .006, 7, false), '#fbd88a');
    for (const side of [-1, 1]) {
      oval(x * .085 + z * side * .006, h + .014, z * .085 - x * side * .006,
        .008, .028, .012, side < 0 ? '#eca63b' : '#ffc95e', a);
    }
    if (k % 2 === 0) oval(x * .013, .162, z * .013, .015, .012, .025, '#ffeba4', a);
  }
  const center = assemble(head);
  const map = petalTexture();
  const silk = new MeshStandardMaterial({ map, side: DoubleSide, roughness: .48 });
  const petals: Mesh<ParametricGeometry, MeshStandardMaterial>[] = [];
  for (let i = 0; i < 6; i++) {
    const geometry = tulipTepal(i, .402, .177, 32, 30);
    const angle = i * tau / 6;
    const pivot = new Group();
    pivot.rotation.y = angle;
    const petal = new Mesh(geometry, silk);
    pivot.add(petal);
    head.add(pivot);
    petals.push(petal);
  }
  return {
    root,
    update(time: number, distance: number, reduced: boolean) {
      const wind = reduced ? 0 : Math.sin(time * 1.37) + .3 * Math.sin(time * 2.51);
      root.rotation.z = -.035 + .037 * wind;
      root.rotation.x = reduced ? 0 : .019 * Math.sin(time * 1.13);
      head.rotation.z = -.085 + .016 * wind;
      const opening = reduced ? .018 : .045 * (1 - smooth(1.3, 4.2, distance));
      for (let i = 0; i < petals.length; i++) {
        petals[i].rotation.x = opening + (reduced ? 0 : .008 * Math.sin(time * 1.2 + i * .52));
      }
    },
    dispose() {
      for (const petal of petals) petal.geometry.dispose();
      plant.dispose();
      center.dispose();
      plantMaterial.dispose();
      silk.dispose();
      map.dispose();
    },
  };
}
