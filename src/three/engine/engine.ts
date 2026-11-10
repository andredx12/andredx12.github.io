/*
 * Um canvas WebGL só pra página inteira. Cada cena registra o elemento onde aparece,
 * e o laço desenha só as que estão na tela, cada uma no retângulo do seu elemento.
 * Sem nenhuma cena visível o laço para e não gasta quadro nenhum.
 */
import { ACESFilmicToneMapping, PMREMGenerator, WebGLRenderer, type Texture } from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { coarsePointer } from "./motion";
import type { EngineStats, QualityTier, SceneView } from "./types";

/* Orçamento de quadro: acima disso a resolução desce um nível. */
const FRAME_BUDGET_MEDIUM_MS = 22;
const FRAME_BUDGET_LIGHT_MS = 34;
const SAMPLE_WINDOW = 90;

interface TrackedView extends SceneView {
  inView: boolean;
}

export interface Engine {
  envTexture: Texture;
  add(view: SceneView): () => void;
  stats(): EngineStats;
  setForcedLight(on: boolean): void;
}

function createEngine(): Engine {
  const canvas = document.createElement("canvas");
  canvas.id = "gl";
  canvas.setAttribute("aria-hidden", "true");

  /* Lança erro se o navegador não tiver WebGL; quem chama mostra a versão sem 3D. */
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  document.body.prepend(canvas);

  const nav = navigator as Navigator & { deviceMemory?: number };
  const lowEnd = (nav.hardwareConcurrency || 8) <= 4 || (nav.deviceMemory || 8) <= 3;
  const maxDpr = Math.min(devicePixelRatio, coarsePointer ? 1.5 : 2);
  const forcedAtStart = location.hash === "#leve";
  const quality = {
    dpr: forcedAtStart ? 0.75 : lowEnd ? Math.min(1, maxDpr) : maxDpr,
    tier: (forcedAtStart ? "leve" : lowEnd ? "média" : "alta") as QualityTier,
    forced: forcedAtStart,
  };

  renderer.setPixelRatio(quality.dpr);
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x000000, 0);
  renderer.autoClear = false;
  renderer.info.autoReset = false;
  const envTexture = new PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;

  const views: TrackedView[] = [];
  const byElement = new Map<Element, TrackedView>();
  let width = 0;
  let height = 0;
  let time = 0;
  let last = performance.now();
  let running = false;
  let visibleCount = 0;
  let samples: number[] = [];
  const stats = { state: "pausado" as EngineStats["state"], frames: 0, fps: 0, frameMs: 0, calls: 0, triangles: 0, drawing: [] as string[] };

  function resize(force = false) {
    const w = document.documentElement.clientWidth;
    const h = window.innerHeight;
    if (!force && w === width && h === height) return;
    width = w;
    height = h;
    renderer.setSize(width, height, true);
  }

  function setDpr(dpr: number, tier: QualityTier) {
    quality.dpr = dpr;
    quality.tier = tier;
    renderer.setPixelRatio(dpr);
    resize(true);
    samples = [];
  }

  function adaptQuality(frameMs: number) {
    if (frameMs < 250) samples.push(frameMs);
    if (samples.length < SAMPLE_WINDOW || quality.forced) return;
    const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
    samples = [];
    if (avg > FRAME_BUDGET_LIGHT_MS && quality.dpr <= 1 && quality.dpr > 0.75) setDpr(0.75, "leve");
    else if (avg > FRAME_BUDGET_MEDIUM_MS && quality.dpr > 1) setDpr(1, "média");
  }

  function stop() {
    renderer.setScissorTest(false);
    renderer.clear(true, true, false);
    running = false;
    stats.state = "pausado";
    stats.drawing = [];
  }

  function start() {
    if (running) return;
    running = true;
    stats.state = "rodando";
    last = performance.now();
    requestAnimationFrame(loop);
  }

  function loop(now: number) {
    if (visibleCount <= 0) return stop();
    const raw = now - last;
    const dt = Math.min(0.05, raw / 1000);
    last = now;
    time += dt;

    resize();
    canvas.style.transform = `translate3d(0,${window.scrollY}px,0)`;
    renderer.info.reset();
    renderer.setScissorTest(false);
    renderer.clear(true, true, false);
    renderer.setScissorTest(true);

    const drawing: string[] = [];
    for (const v of views) {
      const r = v.el.getBoundingClientRect();
      const onScreen = r.bottom > 0 && r.top < height && r.right > 0 && r.left < width && r.width > 0 && r.height > 0;
      if (!onScreen) continue;
      drawing.push(v.name);
      v.update(time, dt, r);
      const x = Math.round(r.left);
      const y = Math.round(height - r.bottom);
      const w = Math.round(r.width);
      const h = Math.round(r.height);
      renderer.setViewport(x, y, w, h);
      renderer.setScissor(x, y, w, h);
      if (Math.abs(v.camera.aspect - w / h) > 1e-4) {
        v.camera.aspect = w / h;
        v.onAspect?.(w / h);
        v.camera.updateProjectionMatrix();
      }
      renderer.clearDepth();
      renderer.render(v.scene, v.camera);
    }

    stats.frames++;
    stats.drawing = drawing;
    stats.calls = renderer.info.render.calls;
    stats.triangles = renderer.info.render.triangles;
    adaptQuality(raw);
    requestAnimationFrame(loop);
  }

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      const v = byElement.get(entry.target);
      if (!v || v.inView === entry.isIntersecting) continue;
      v.inView = entry.isIntersecting;
      visibleCount += entry.isIntersecting ? 1 : -1;
    }
    if (visibleCount > 0) start();
  });

  let fpsFrames = 0;
  let fpsTime = performance.now();
  setInterval(() => {
    const now = performance.now();
    stats.fps = Math.round(((stats.frames - fpsFrames) * 1000) / (now - fpsTime));
    stats.frameMs = stats.fps ? +(1000 / stats.fps).toFixed(1) : 0;
    fpsFrames = stats.frames;
    fpsTime = now;
  }, 1000);

  return {
    envTexture,
    add(view) {
      const tracked: TrackedView = { ...view, inView: false };
      views.push(tracked);
      byElement.set(view.el, tracked);
      observer.observe(view.el);
      return () => {
        observer.unobserve(view.el);
        byElement.delete(view.el);
        views.splice(views.indexOf(tracked), 1);
        if (tracked.inView) visibleCount--;
      };
    },
    stats: () => ({
      state: stats.state,
      fps: stats.state === "rodando" ? stats.fps : 0,
      frameMs: stats.state === "rodando" ? stats.frameMs : 0,
      calls: stats.state === "rodando" ? stats.calls : 0,
      triangles: stats.state === "rodando" ? stats.triangles : 0,
      drawing: stats.drawing,
      tier: quality.tier,
      dpr: quality.dpr,
      forcedLight: quality.forced,
    }),
    setForcedLight(on) {
      quality.forced = on;
      if (on) setDpr(0.75, "leve");
      else setDpr(lowEnd ? Math.min(1, maxDpr) : maxDpr, lowEnd ? "média" : "alta");
    },
  };
}

let engine: Engine | null = null;

/** Cria o motor na primeira chamada. Lança erro se não houver WebGL. */
export function getEngine(): Engine {
  engine ??= createEngine();
  return engine;
}
