import { Vector3 } from 'three';
import { ParametricGeometry } from 'three/addons/geometries/ParametricGeometry.js';

export function tulipTepal(index: number, height: number, radius: number, across: number, along: number) {
  const inner = index % 2 === 1;
  const length = height * (inner ? 1.015 : .985) * (1 + .018 * Math.sin(index * 2.4));
  const fullness = radius * (inner ? .91 : 1);
  return new ParametricGeometry((s: number, v: number, p: Vector3) => {
    const u = s * 2 - 1;
    const tip = v ** 3;
    const arc = 1.14 - .53 * tip;
    const theta = u * arc + .048 * v * Math.sin(index * 2.1);
    const profile = .08 + .92 * Math.sin(Math.PI * .72 * v) ** .70;
    const fold = .025 * Math.cos(u * Math.PI) + .008 * Math.sin(u * 8 + index);
    const r = fullness * profile * (1 + fold);
    p.set(r * Math.sin(theta), length * v * (1 - tip * (.22 * u * u + .018 * u)), r * Math.cos(theta));
  }, across, along);
}
