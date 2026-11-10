/* Luz de estúdio e materiais comuns, pra todas as cenas terem a mesma cara */
import { DirectionalLight, DoubleSide, HemisphereLight, MeshStandardMaterial, type Scene } from "three";
import { getEngine } from "../engine/engine";
import { weaveTexture } from "./textures";

export interface StudioLights {
  key: DirectionalLight;
  rim: DirectionalLight;
  fill: HemisphereLight;
  base: { key: number; rim: number; fill: number };
}

/** Luz principal quente, contraluz azul e preenchimento suave. */
export function studioLights(scene: Scene, { key = 2.4, rim = 3.5, fill = 0.35, env = 0.45 } = {}): StudioLights {
  scene.environment = getEngine().envTexture;
  scene.environmentIntensity = env;
  const k = new DirectionalLight(0xfff3e6, key);
  k.position.set(-2.5, 4, 3.5);
  const r = new DirectionalLight(0x2f6bff, rim);
  r.position.set(3, 2.2, -3.5);
  const h = new HemisphereLight(0x6b95ff, 0x05070d, fill);
  scene.add(k, r, h);
  return { key: k, rim: r, fill: h, base: { key, rim, fill } };
}

function shared(m: MeshStandardMaterial) {
  m.userData.shared = true;
  return m;
}

export const materials = {
  graphite: shared(new MeshStandardMaterial({ color: 0x1b2340, roughness: 0.5, metalness: 0.35 })),
  metal: shared(new MeshStandardMaterial({ color: 0xd3d9e6, roughness: 0.24, metalness: 1 })),
  electric: shared(new MeshStandardMaterial({ color: 0x2f6bff, roughness: 0.3, metalness: 0.55, emissive: 0x2f6bff, emissiveIntensity: 0.25 })),
  fabric: shared(new MeshStandardMaterial({ color: 0xb4c1e0, roughness: 0.78, bumpMap: weaveTexture, bumpScale: 0.5, side: DoubleSide })),
  fabricAlt: shared(new MeshStandardMaterial({ color: 0x9caed6, roughness: 0.78, bumpMap: weaveTexture, bumpScale: 0.5, side: DoubleSide })),
};

