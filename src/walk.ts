import type { PerspectiveCamera } from 'three';
import type { createFieldCollision } from './collision';
import { entrance, groundHeight } from './field';

const eyeHeight = 1.65;
const walkingSpeed = 2.4;

export class Walker {
  private _yaw = .16;
  private _pitch = -.085;

  constructor(
    private readonly _camera: PerspectiveCamera,
    private readonly _collision: ReturnType<typeof createFieldCollision>,
  ) {
    _camera.rotation.order = 'YXZ';
    this.reset();
  }

  reset(): void {
    this._yaw = .16;
    this._pitch = -.085;
    this._camera.position.set(entrance.x, groundHeight(entrance.x, entrance.z) + eyeHeight, entrance.z);
    this.look(0, 0);
  }

  look(yaw: number, pitch: number): void {
    this._yaw = (this._yaw + yaw) % (Math.PI * 2);
    this._pitch = Math.max(-1.2, Math.min(1.2, this._pitch + pitch));
    this._camera.rotation.set(this._pitch, this._yaw, 0);
  }

  walk(forward: number, side: number, elapsed: number): void {
    const step = walkingSpeed * elapsed / Math.max(1, Math.hypot(forward, side));
    const cos = Math.cos(this._yaw);
    const sin = Math.sin(this._yaw);
    const x = (side * cos - forward * sin) * step;
    const z = (-side * sin - forward * cos) * step;
    const position = this._camera.position;
    this._collision.move(position, x, z);
    const height = groundHeight(position.x, position.z) + eyeHeight;
    position.y += (height - position.y) * (1 - Math.exp(-elapsed * 12));
  }
}
