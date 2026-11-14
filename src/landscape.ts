import {
  BackSide, BufferAttribute, Color, FogExp2, HemisphereLight, DirectionalLight, Mesh,
  MeshStandardMaterial, PlaneGeometry, Scene, ShaderMaterial, SphereGeometry, Vector3,
} from 'three';
import { groundHeight } from './field';

const sun = new Vector3(-.62, .21, -.76).normalize();

function makeTerrain() {
  const size = 768;
  const geometry = new PlaneGeometry(size, size, size / 2, size / 2);
  geometry.rotateX(-Math.PI / 2);
  const positions = geometry.getAttribute('position');
  for (let i = 0; i < positions.count; i++) positions.setY(i, groundHeight(positions.getX(i), positions.getZ(i)));
  geometry.computeVertexNormals();

  const material = new MeshStandardMaterial({ color: 0xffffff, roughness: 1 });
  material.onBeforeCompile = shader => {
    shader.vertexShader = 'varying vec3 vGround;\n' + shader.vertexShader
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n vGround = position;');
    shader.fragmentShader = `
      varying vec3 vGround;
      float grain(vec2 p) {
        return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453);
      }
      ${shader.fragmentShader}
    `.replace('#include <color_fragment>', `
      #include <color_fragment>
      float x = vGround.x;
      float z = vGround.z;
      float t = clamp((130.0 - z) / 247.0, 0.0, 1.0);
      float path = -23.0 * sin(t * 3.141593) + 7.0 * sin(t * 6.283185);
      float loopT = clamp((119.0 - z) / 236.0, 0.0, 1.0);
      float loop = path + 91.0 * pow(max(0.0, sin(loopT * 3.141593)), 1.1);
      float aisle = abs(x - path) - 2.2;
      if (z >= -117.0 && z <= 119.0) aisle = min(aisle, abs(x - loop) - 1.45);
      aisle = min(aisle, length(vec2(x, (z + 117.0) * 1.1)) - 7.0);
      float rowBend = 4.1 * sin(x / 58.0) + 2.5 * sin(x / 24.0);
      float rowValue = (z - rowBend) / 2.8;
      float row = floor(rowValue + 0.5);
      float bed = abs(rowValue - row) * 2.8 - 0.62;
      float planted = (1.0 - smoothstep(-0.38, 0.08, bed))
        * smoothstep(0.02, 0.38, aisle)
        * (1.0 - smoothstep(181.0, 184.0, abs(x)))
        * (1.0 - smoothstep(136.0, 138.0, abs(z)));
      float variation = grain(floor(vGround.xz * 16.0)) * 0.024 + sin(x * 2.9 + z * 0.6) * 0.009;
      vec3 earth = vec3(0.22,0.145,0.073);
      vec3 grass = vec3(0.103,0.143,0.055) + sin(z * 0.17 + x * 0.24) * 0.013;
      vec3 ground = mix(earth, grass, smoothstep(-0.13,0.18,aisle));
      float band = mod(floor(row / 3.0) * 7.0 + floor((x + 192.0 + row * 1.3) / 54.0) * 3.0, 20.0);
      vec3 bulbs = vec3(0.25,0.018,0.022);
      if (band >= 13.0) {
        bulbs = band < 14.0 ? vec3(.43,.27,.026) : band < 15.0 ? vec3(.54,.41,.28)
          : band < 16.0 ? vec3(.38,.095,.14) : band < 17.0 ? vec3(.41,.11,.029)
          : band < 18.0 ? vec3(.19,.065,.27) : band < 19.0 ? vec3(.43,.27,.026) : vec3(.19,.065,.27);
      }
      float distanceToEye = distance(vGround, cameraPosition);
      float distant = smoothstep(33.0, 77.0, distanceToEye);
      ground = mix(ground, mix(vec3(.083,.062,.034),bulbs,distant), planted);
      diffuseColor.rgb *= max(vec3(.015), ground + variation);
    `);
  };
  return new Mesh(geometry, material);
}

function makeSky() {
  return new Mesh(new SphereGeometry(550, 28, 16), new ShaderMaterial({
    side: BackSide, depthWrite: false, fog: false, uniforms: { sun: { value: sun } },
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
      float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(fract(sin(dot(i,vec2(113.0,71.0))*41.13)*43758.5),
          fract(sin(dot(i+vec2(1,0),vec2(113.0,71.0))*41.13)*43758.5),f.x),
          mix(fract(sin(dot(i+vec2(0,1),vec2(113.0,71.0))*41.13)*43758.5),
          fract(sin(dot(i+1.0,vec2(113.0,71.0))*41.13)*43758.5),f.x),f.y);
      }
      void main() {
        vec3 d = normalize(direction);
        float glow = clamp(dot(d,sun),0.0,1.0);
        vec3 horizon = vec3(.72,.46,.31);
        vec3 sky = mix(horizon, vec3(.28,.43,.45), smoothstep(-.01,.67,d.y));
        sky += vec3(.28,.17,.065) * pow(glow,12.0);
        vec2 p = vec2(atan(d.z,d.x) * 5.0, d.y * 18.0);
        float n = noise(p) * .62 + noise(p * 2.31) * .28 + noise(p * 4.7) * .1;
        float cloud = smoothstep(.56,.77,n) * smoothstep(.025,.12,d.y) * (1.0 - smoothstep(.36,.67,d.y));
        sky = mix(sky, vec3(.88,.71,.63), cloud * .66);
        sky = mix(sky, vec3(1.0,.92,.68), smoothstep(.99925,.99963,glow));
        gl_FragColor = vec4(sky, 1.0);
        #include <colorspace_fragment>
      }
    `,
  }));
}

export function createLandscape(scene: Scene) {
  scene.fog = new FogExp2(new Color('#e6b796'), .0045);
  const sky = makeSky();
  sky.frustumCulled = false;
  sky.renderOrder = -10;
  const terrain = makeTerrain();
  const light = new DirectionalLight('#ffdbac', 2.1);
  light.position.copy(sun).multiplyScalar(65);
  scene.add(sky, terrain, new HemisphereLight('#f5e0c6', '#8b654a', 1.50), light);
  return { sky, terrain };
}
