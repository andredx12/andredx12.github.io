import type { PerspectiveCamera, Scene } from "three";

/** Uma cena desenhada dentro do retângulo de um elemento da página. */
export interface SceneView {
  name: string;
  el: HTMLElement;
  scene: Scene;
  camera: PerspectiveCamera;
  /** Chamado a cada quadro em que o elemento está visível. */
  update(t: number, dt: number, rect: DOMRect): void;
  /** Chamado quando a proporção do retângulo muda. */
  onAspect?(aspect: number): void;
}

/** O que cada cena devolve pra quem montou: comandos e limpeza. */
export interface Disposable {
  dispose(): void;
}

export type QualityTier = "alta" | "média" | "leve";

export interface EngineStats {
  state: "rodando" | "pausado";
  fps: number;
  frameMs: number;
  calls: number;
  triangles: number;
  drawing: string[];
  tier: QualityTier;
  dpr: number;
  forcedLight: boolean;
}
