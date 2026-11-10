/*
 * Sobre: a foto recortada sai do painel e, ao revelar, o tênis, o livro e o halter
 * aparecem em planos diferentes. Tênis e halter na frente, livro atrás da cabeça.
 */
import {
  Box3,
  BoxGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  ShapeGeometry,
  SRGBColorSpace,
  TextureLoader,
  Vector2,
  Vector3,
  type Object3D,
} from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { getEngine } from "../engine/engine";
import { coarsePointer, motion } from "../engine/motion";
import type { Disposable } from "../engine/types";
import { disposeObject } from "../lib/dispose";
import { clamp, damp, lerp, outBack, smooth } from "../lib/math";
import { planarUV, roundedRectRing, roundedRectShape } from "../lib/shapes";
import { materials, studioLights } from "../lib/studio";
import { canvasTexture } from "../lib/textures";

const asset = (path: string) => import.meta.env.BASE_URL + path;

/* Medidas do painel em unidades da cena: a foto ocupa a largura 1. */
const PHOTO_H = 1 / 0.9;
const PANEL_BOTTOM = -PHOTO_H / 2;
const PANEL_H = 0.8;
const PANEL_TOP = PANEL_BOTTOM + PANEL_H;
const RADIUS = 0.064;

interface FloatingItem {
  object: Object3D;
  delay: number;
  show: [number, number, number];
  hide: [number, number, number];
  rot: [number, number, number];
  spin: number;
  depth: number;
  /* flutuação: amplitude, frequência, fase; rw é a frequência do giro */
  fa: number;
  fw: number;
  fp: number;
  rw: number;
}

export interface HeroOptions {
  /** Bloco da foto: dá a posição e o tamanho do painel na tela. */
  stage: HTMLElement;
  /** Área onde a cena é desenhada, maior que o bloco pra os objetos saírem dele. */
  viewport: HTMLElement;
  /** Avisado quando a foto em 3D está pronta pra substituir a imagem estática. */
  onReady(): void;
}

export interface HeroScene extends Disposable {
  setRevealed(on: boolean): void;
  /** Posição do mouse no bloco, de -1 a 1 em cada eixo. */
  setPointer(x: number, y: number): void;
}

function makePanelTexture() {
  return canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = "#141c33";
    g.fillRect(0, 0, w, h);
    const glow = g.createRadialGradient(w * 0.5, h * 0.12, 0, w * 0.5, h * 0.12, w * 0.8);
    glow.addColorStop(0, "rgba(47,107,255,.5)");
    glow.addColorStop(1, "rgba(47,107,255,0)");
    g.fillStyle = glow;
    g.fillRect(0, 0, w, h);
    const shade = g.createLinearGradient(0, 0, 0, h);
    shade.addColorStop(0, "rgba(5,7,13,0)");
    shade.addColorStop(1, "rgba(5,7,13,.6)");
    g.fillStyle = shade;
    g.fillRect(0, 0, w, h);
  });
}

/** A foto passa por cima do painel: embaixo é recortada pelo cantos arredondados, em cima fica livre. */
function makePhotoMaterial(onLoad: () => void) {
  const src = matchMedia("(max-width: 639px)").matches ? asset("img/andre-recorte-560.webp") : asset("img/andre-recorte-960.webp");
  const map = new TextureLoader().load(src, onLoad);
  map.colorSpace = SRGBColorSpace;
  map.anisotropy = 4;
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      map: { value: map },
      size: { value: new Vector2(1, PHOTO_H) },
      pb: { value: PANEL_BOTTOM },
      pt: { value: PANEL_TOP },
      rad: { value: RADIUS },
      lift: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D map; uniform vec2 size; uniform float pb, pt, rad, lift; varying vec2 vUv;
      float sdRoundRect(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
      void main() {
        vec4 c = texture2D(map, vUv);
        vec2 p = (vUv - 0.5) * size;
        float d = sdRoundRect(p - vec2(0.0, (pb + pt) * 0.5), vec2(0.5, (pt - pb) * 0.5), rad);
        float clipA = p.y > pt ? 1.0 : 1.0 - smoothstep(-0.0015, 0.0015, d);
        float fade = mix(0.3, 1.0, smoothstep(pb, pb + 0.2, p.y));
        vec3 col = c.rgb * mix(vec3(1.0), vec3(0.9, 0.96, 1.08), 0.5) * (1.0 + lift * 0.05);
        gl_FragColor = vec4(col, c.a * clipA * fade);
        #include <colorspace_fragment>
      }`,
  });
}

function makeBook() {
  const g = new Group();
  const W = 0.3;
  const H = 0.42;
  const T = 0.064;
  const lines = (vertical: boolean) =>
    canvasTexture(vertical ? 128 : 64, vertical ? 64 : 128, (c, w, h) => {
      c.fillStyle = "#eef0f5";
      c.fillRect(0, 0, w, h);
      c.fillStyle = "rgba(110,120,150,.35)";
      if (vertical) for (let x = 0; x < w; x += 3) c.fillRect(x, 0, 1, h);
      else for (let y = 0; y < h; y += 3) c.fillRect(0, y, w, 1);
    });
  const side = new MeshStandardMaterial({ map: lines(true), roughness: 0.9 });
  const top = new MeshStandardMaterial({ map: lines(false), roughness: 0.9 });
  const pages = new Mesh(new BoxGeometry(W - 0.014, H - 0.018, T - 0.014), [side, side, top, top, side, side]);
  pages.position.x = 0.004;
  g.add(pages);

  const cover = new MeshStandardMaterial({ color: 0x1f46c8, roughness: 0.48, metalness: 0.1 });
  const board = new RoundedBoxGeometry(W, H, 0.008, 2, 0.003);
  const front = new Mesh(board, cover);
  front.position.z = T / 2 - 0.004;
  const back = new Mesh(board, cover);
  back.position.z = -(T / 2 - 0.004);
  const spine = new Mesh(new RoundedBoxGeometry(0.016, H, T, 2, 0.006), cover);
  spine.position.x = -W / 2 + 0.008;
  g.add(front, back, spine);

  const foil = new MeshBasicMaterial({ color: 0xbcd0ff, toneMapped: false });
  const frame = new Mesh(roundedRectRing(0.18, 0.07, 0.008, 0.0035), foil);
  frame.position.set(0.012, 0.08, T / 2 + 0.0006);
  const rule = new Mesh(new PlaneGeometry(0.12, 0.006), foil);
  rule.position.set(0.012, -0.02, T / 2 + 0.0006);
  const ribbon = new Mesh(
    new PlaneGeometry(0.016, 0.11),
    new MeshStandardMaterial({ color: 0x22d3ee, roughness: 0.5, side: DoubleSide, emissive: 0x22d3ee, emissiveIntensity: 0.2 }),
  );
  ribbon.position.set(0.07, -H / 2 - 0.045, 0);
  ribbon.rotation.z = 0.12;
  g.add(frame, rule, ribbon);
  return g;
}

/** Halter hexagonal; o grupo interno gira devagar no próprio eixo. */
function makeDumbbell() {
  const g = new Group();
  const inner = new Group();
  g.add(inner);
  const rubber = new MeshStandardMaterial({ color: 0x1c2338, roughness: 0.6, metalness: 0.05, flatShading: true });
  const handle = new Mesh(new CylinderGeometry(0.017, 0.017, 0.2, 24), materials.metal);
  handle.rotation.z = Math.PI / 2;
  inner.add(handle);
  for (const s of [-1, 1]) {
    const head = new Mesh(new CylinderGeometry(0.072, 0.072, 0.085, 6), rubber);
    head.rotation.z = Math.PI / 2;
    head.position.x = s * 0.142;
    const cap = new Mesh(new CylinderGeometry(0.042, 0.042, 0.006, 6), materials.electric);
    cap.rotation.z = Math.PI / 2;
    cap.position.x = s * (0.142 + 0.044);
    const collar = new Mesh(new CylinderGeometry(0.026, 0.026, 0.016, 24), materials.metal);
    collar.rotation.z = Math.PI / 2;
    collar.position.x = s * 0.092;
    inner.add(head, cap, collar);
  }
  return { group: g, inner };
}

function loadShoe(target: Group) {
  new GLTFLoader()
    .loadAsync(asset("models/tenis.glb"))
    .then((gltf) => {
      const model = gltf.scene;
      const box = new Box3().setFromObject(model);
      const size = box.getSize(new Vector3());
      model.position.sub(box.getCenter(new Vector3()));
      const pivot = new Group();
      pivot.add(model);
      if (size.z > size.x) pivot.rotation.y = Math.PI / 2;
      pivot.scale.setScalar(0.42 / Math.max(size.x, size.z));
      target.add(pivot);
    })
    .catch((err) => console.warn("Tênis não carregou", err));
}

export function createHeroScene({ stage, viewport, onReady }: HeroOptions): HeroScene {
  const scene = new Scene();
  const camera = new PerspectiveCamera(30, 1, 0.1, 40);
  const lights = studioLights(scene, { key: 2.6, rim: 5, fill: 0.45, env: 0.55 });
  lights.key.position.set(-3, 3.2, 4);
  lights.rim.position.set(3, 1.5, -2.5);
  const root = new Group();
  scene.add(root);

  const panelMat = new MeshBasicMaterial({ map: makePanelTexture(), toneMapped: false });
  const panel = new Mesh(planarUV(new ShapeGeometry(roundedRectShape(1, PANEL_H, RADIUS), 16), 1, PANEL_H), panelMat);
  panel.position.y = PANEL_BOTTOM + PANEL_H / 2;
  const border = new Mesh(roundedRectRing(1, PANEL_H, RADIUS, 0.004), new MeshBasicMaterial({ color: 0x2f4170, toneMapped: false }));
  border.position.set(0, PANEL_BOTTOM + PANEL_H / 2, 0.001);
  root.add(panel, border);

  /* camadas atrás do painel, que se afastam quando os objetos aparecem */
  const plies = [
    { fill: 0x141c33, line: 0x2f6bff, rest: [0.03, -0.03, -0.05], open: [0.05, -0.045, -0.22] },
    { fill: 0x0b1020, line: 0x24304f, rest: [0.06, -0.06, -0.1], open: [0.1, -0.09, -0.44] },
    { fill: null, line: 0x24304f, rest: [0.09, -0.09, -0.15], open: [0.15, -0.135, -0.66] },
  ].map((def) => {
    const g = new Group();
    if (def.fill !== null) {
      g.add(new Mesh(new ShapeGeometry(roundedRectShape(1, PANEL_H, RADIUS), 16), new MeshBasicMaterial({ color: def.fill, toneMapped: false })));
    }
    const outline = new Mesh(roundedRectRing(1, PANEL_H, RADIUS, 0.004), new MeshBasicMaterial({ color: def.line, toneMapped: false, transparent: true, opacity: 0.8 }));
    outline.position.z = 0.001;
    g.add(outline);
    root.add(g);
    return { group: g, rest: def.rest, open: def.open };
  });

  let photoReady = false;
  const photoMat = makePhotoMaterial(() => {
    photoReady = true;
  });
  const photo = new Mesh(new PlaneGeometry(1, PHOTO_H), photoMat);
  photo.position.z = 0.012;
  photo.renderOrder = 2;
  root.add(photo);

  const shoe = new Group();
  const book = makeBook();
  const dumbbell = makeDumbbell();
  root.add(shoe, book, dumbbell.group);
  loadShoe(shoe);

  const items: FloatingItem[] = [
    { object: shoe, delay: 0, show: [-0.34, -0.42, 0.36], hide: [-0.12, -0.25, -0.3], rot: [0.35, 0.5, -0.12], spin: 1, depth: 1, fa: 0.011, fw: 1.3, fp: 0, rw: 0.37 },
    { object: dumbbell.group, delay: 0.12, show: [0.44, -0.16, 0.3], hide: [0.1, -0.15, -0.3], rot: [0.3, -0.55, 0.5], spin: -1, depth: 0.8, fa: 0.013, fw: 1.05, fp: 1.9, rw: 0.29 },
    { object: book, delay: 0.22, show: [0.32, 0.43, -0.24], hide: [0.12, 0.05, -0.3], rot: [0.12, -0.5, 0.2], spin: 1, depth: -0.5, fa: 0.01, fw: 0.85, fp: 3.3, rw: 0.23 },
  ];
  /* no celular os objetos chegam mais perto da foto e o halter desce pra longe do rosto */
  if (window.innerWidth < 640) {
    for (const it of items) it.show[0] *= 0.8;
    items[1].show[1] = -0.32;
  }

  let reveal = 0;
  let revealed = false;
  let px = 0;
  let py = 0;
  let targetX = 0;
  let targetY = 0;
  let notified = false;

  const remove = getEngine().add({
    name: "Sobre",
    el: viewport,
    scene,
    camera,
    update(t, dt, r) {
      const reduced = motion.reduced;
      reveal = revealed ? Math.min(1, reveal + dt / 0.9) : Math.max(0, reveal - dt / 0.55);
      /* sem mouse, um balanço lento faz o papel do parallax */
      if (coarsePointer && !reduced) {
        targetX = Math.sin(t * 0.3) * 0.3;
        targetY = Math.sin(t * 0.23) * 0.2;
      }
      px = damp(px, reduced ? 0 : targetX, 5, dt);
      py = damp(py, reduced ? 0 : targetY, 5, dt);

      /* a câmera enquadra a área de desenho de forma que 1 unidade = largura do bloco da foto */
      const s = stage.getBoundingClientRect();
      const unit = 1 / s.width;
      const dist = (r.height * unit) / (2 * Math.tan(MathUtils.degToRad(camera.fov / 2)));
      root.position.set((s.left + s.width / 2 - (r.left + r.width / 2)) * unit, -(s.top + s.height / 2 - (r.top + r.height / 2)) * unit, 0);
      camera.position.set(root.position.x + px * 0.04, root.position.y + py * 0.03, dist);
      camera.lookAt(root.position.x, root.position.y, 0);

      const k = smooth(reveal);
      for (const { group, rest, open } of plies) {
        group.position.set(lerp(rest[0], open[0], k), PANEL_BOTTOM + PANEL_H / 2 + lerp(rest[1], open[1], k), lerp(rest[2], open[2], k));
      }
      panelMat.color.setScalar(1 + 0.3 * k);
      photoMat.uniforms.lift.value = k;

      for (const it of items) {
        const lin = clamp((reveal - it.delay) / 0.72);
        const e = reduced ? smooth(lin) : outBack(lin);
        const o = it.object;
        o.visible = lin > 0.002;
        o.position.set(lerp(it.hide[0], it.show[0], e), lerp(it.hide[1], it.show[1], e), lerp(it.hide[2], it.show[2], e));
        o.scale.setScalar(Math.max(0.001, lerp(0.35, 1, e)));
        if (reduced) {
          o.rotation.set(it.rot[0], it.rot[1], it.rot[2]);
          continue;
        }
        o.position.y += Math.sin(t * it.fw + it.fp) * it.fa * lin;
        o.position.x += px * 0.025 * it.depth * lin;
        o.position.y += py * 0.02 * it.depth * lin;
        const spin = (1 - lin) * Math.PI * 0.5 * it.spin;
        o.rotation.set(
          it.rot[0] + Math.sin(t * it.rw * 1.6 + it.fp) * 0.05,
          it.rot[1] + spin + Math.sin(t * it.rw + it.fp) * 0.12 + px * 0.06,
          it.rot[2] + Math.sin(t * it.rw * 0.7 + it.fp) * 0.03,
        );
      }
      if (!reduced) dumbbell.inner.rotation.x = t * 0.25;

      if (photoReady && !notified) {
        notified = true;
        requestAnimationFrame(onReady);
      }
    },
  });

  return {
    setRevealed(on) {
      revealed = on;
    },
    setPointer(x, y) {
      targetX = x;
      targetY = y;
    },
    dispose() {
      remove();
      disposeObject(scene);
    },
  };
}
