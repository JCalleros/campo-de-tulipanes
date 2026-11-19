import {
  BackSide, Color, FogExp2, HemisphereLight, DirectionalLight, Mesh,
  MeshStandardMaterial, PlaneGeometry, Scene, ShaderMaterial, SphereGeometry, Vector3,
} from 'three';
import type { Sector } from './field';
import { borders, gardenFloor } from './garden';

const sun = new Vector3(-.62, .17, -.76).normalize();

const hazeColor = new Color('#e6b796');

function makeSky() {
  return new Mesh(new SphereGeometry(550, 28, 16), new ShaderMaterial({
    side: BackSide, depthWrite: false, fog: false,
    uniforms: { sun: { value: sun }, haze: { value: hazeColor } },
    vertexShader: `
      varying vec3 direction;
      void main() {
        direction = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 direction;
      uniform vec3 sun;
      uniform vec3 haze;

      float hash(vec2 p) {
        vec3 q = fract(vec3(p.xyx) * .1031);
        q += dot(q, q.yzx + 33.33);
        return fract((q.x + q.y) * q.z);
      }

      float noise(vec2 p) {
        vec2 cell = floor(p);
        vec2 t = fract(p);
        t = t * t * (3.0 - 2.0 * t);
        return mix(mix(hash(cell), hash(cell + vec2(1,0)), t.x),
          mix(hash(cell + vec2(0,1)), hash(cell + vec2(1,1)), t.x), t.y);
      }

      float cloudDensity(vec2 p) {
        mat2 turn = mat2(.87, -.50, .50, .87);
        float broad = noise(p);
        p = turn * p * 2.03;
        float middle = noise(p);
        p = turn * p * 2.07;
        return broad * .60 + middle * .28 + noise(p) * .12;
      }

      void main() {
        vec3 d = normalize(direction);
        float elevation = max(d.y, 0.0);
        float sunward = max(dot(d, sun), 0.0);
        vec3 twilight = mix(vec3(.38,.28,.38), vec3(.65,.36,.22), pow(sunward, 4.0));
        vec3 zenith = vec3(.057,.174,.32);
        vec3 sky = mix(haze, twilight, smoothstep(0.0,.17,elevation));
        sky = mix(sky, zenith, smoothstep(.11,.9,elevation));
        sky += vec3(.28,.15,.063) * pow(sunward, 18.0) * smoothstep(0.0,.07,elevation);
        sky += vec3(.36,.21,.08) * pow(sunward, 320.0);
        sky = mix(sky, vec3(1.0,.94,.72), smoothstep(.99979,.99989,sunward));

        if (elevation > .025) {
          vec2 plane = d.xz / max(elevation, .06);
          vec2 p = plane * vec2(.78, 1.52) + vec2(8.1, -2.6);
          float density = cloudDensity(p);
          float detail = noise(p * 5.3 + 9.1);
          float horizonFade = smoothstep(.028,.19,elevation);
          float structure = density + (detail - .5) * .075;
          float cover = smoothstep(.48,.70,structure) * horizonFade;
          float lit = smoothstep(.38,.68,density);
          vec3 cloud = mix(vec3(.29,.23,.29), vec3(.75,.57,.48), lit);
          cloud = mix(cloud, vec3(.95,.69,.44), pow(sunward, 7.0) * .75);
          sky = mix(sky, cloud, cover * .86);
        }

        gl_FragColor = vec4(sky, 1.0);
        #include <colorspace_fragment>
      }
    `,
  }));
}

export function createLandscape(scene: Scene, sectors: Sector[]) {
  scene.fog = new FogExp2(hazeColor, .0045);
  const sky = makeSky();
  sky.frustumCulled = false;
  sky.renderOrder = -10;
  const terrain = gardenFloor(sectors);
  const meadow = new Mesh(new PlaneGeometry(680, 680), new MeshStandardMaterial({ color: '#79805a' }));
  meadow.rotation.x = -Math.PI / 2;
  meadow.position.y = -.24;
  const { leaves, wood } = borders();
  const light = new DirectionalLight('#ffdbac', 2.1);
  light.position.copy(sun).multiplyScalar(65);
  scene.add(sky, terrain, meadow, leaves, wood, new HemisphereLight('#f5e0c6', '#8b654a', 1.50), light);
  return {
    sky,
    dispose() {
      terrain.material.map?.dispose();
      leaves.dispose();
      wood.dispose();
      for (const mesh of [terrain, meadow, leaves, wood, sky]) {
        mesh.geometry.dispose();
        mesh.material.dispose();
      }
    },
  };
}
