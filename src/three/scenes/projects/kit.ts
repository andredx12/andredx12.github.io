/* Base comum das cenas de projeto: palco com sombra e anel, câmera fixa e controles */
import { DoubleSide, Group, Mesh, MeshBasicMaterial, PerspectiveCamera, PlaneGeometry, RingGeometry, Scene, Vector3 } from "three";
import { getEngine } from "../../engine/engine";
import type { Disposable } from "../../engine/types";
import { disposeObject } from "../../lib/dispose";
import { studioLights } from "../../lib/studio";
import { shadowTexture } from "../../lib/textures";

/** Controles que o React chama: começar, repetir no hover e tocar no celular. */
export interface ProjectControls {
  play(): void;
  hover(on: boolean): void;
  tap(): void;
}

export interface ProjectAnimation extends ProjectControls {
  update(t: number, dt: number): void;
}

export interface CameraFraming {
  distance: number;
  look: [number, number, number];
}

/* Todas as cenas de projeto são vistas do mesmo ângulo, de cima e de lado. */
const AZIMUTH = Math.atan2(1, 1.15);
const ELEVATION = 0.52;

export function createProjectView<A extends ProjectAnimation>(
  name: string,
  viewport: HTMLElement,
  framing: CameraFraming,
  build: (root: Group) => A,
): Omit<A, "update"> & Disposable {
  const scene = new Scene();
  const camera = new PerspectiveCamera(30, 4 / 3, 0.05, 40);
  studioLights(scene, { key: 2.6, rim: 4.5, fill: 0.4, env: 0.5 });

  const shadow = new Mesh(new PlaneGeometry(3.6, 3.6), new MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false, toneMapped: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.001;
  const ring = new Mesh(new RingGeometry(1.38, 1.4, 128), new MeshBasicMaterial({ color: 0x2f6bff, transparent: true, opacity: 0.75, toneMapped: false, side: DoubleSide }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.002;
  const root = new Group();
  scene.add(shadow, ring, root);

  const { distance, look } = framing;
  camera.position.set(
    Math.sin(AZIMUTH) * Math.cos(ELEVATION) * distance,
    Math.sin(ELEVATION) * distance + look[1],
    Math.cos(AZIMUTH) * Math.cos(ELEVATION) * distance,
  );
  camera.lookAt(new Vector3(...look));

  const animation = build(root);
  const remove = getEngine().add({
    name,
    el: viewport,
    scene,
    camera,
    update: (t, dt) => animation.update(t, dt),
  });

  return Object.assign(animation, {
    dispose() {
      remove();
      disposeObject(scene);
    },
  });
}
