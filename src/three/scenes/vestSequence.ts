/*
 * Experiência: a rolagem conduz o disparo contra o colete, do colete inteiro até o projétil retido.
 * A cena desenha no canvas e ajusta só o visual da sobreposição (opacidade, barra e posição das etiquetas).
 * Textos, botões e acessibilidade ficam com o React, que recebe a fase atual por onPhase.
 */
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  DoubleSide,
  ExtrudeGeometry,
  Fog,
  Group,
  InstancedMesh,
  LatheGeometry,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  PointLight,
  Points,
  PointsMaterial,
  RingGeometry,
  Scene,
  Shape,
  SpotLight,
  Sprite,
  SpriteMaterial,
  Vector2,
  Vector3,
  type Texture,
} from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { toCreasedNormals } from "three/addons/utils/BufferGeometryUtils.js";
import type { SequenceLabelId } from "../../data/vestSequence";
import { getEngine } from "../engine/engine";
import { motion, snapScroll } from "../engine/motion";
import type { Disposable } from "../engine/types";
import { disposeObject } from "../lib/dispose";
import { bump, clamp, damp, lerp, outCubic, range, smooth } from "../lib/math";
import { vestShape } from "../lib/shapes";
import { studioLights } from "../lib/studio";
import { canvasTexture, glowTexture, starTexture, weaveTexture } from "../lib/textures";

/* Ponto de impacto no painel e distância de onde o disparo sai. */
const IMPACT_X = 0.04;
const IMPACT_Y = 0.02;
const MUZZLE_Z = 2.4;
const LAYER_COUNT = 10;
const FOAM_INDEX = 8;
const PACK_W = 1;
const PACK_H = 1.3;

/* Trajeto da câmera: tempo de cada ponto, posição, alvo e quanto ela recua em telas estreitas. */
const CAM_T = [0, 0.08, 0.17, 0.25, 0.34, 0.42, 0.45, 0.52, 0.64, 0.76, 0.86, 1];
const CAM_POS: [number, number, number][] = [
  [1.5, 0.35, 2.35], [0, 0.12, 2.6], [3.2, 0.45, 1.6], [3.0, 0.4, 1.65], [1.1, 0.2, 2.0], [0.9, 0.18, 1.2],
  [0.8, 0.22, 1.05], [1.2, 0.35, 1.5], [1.9, 0.75, 1.9], [1.45, 0.42, 1.45], [1.2, 0.34, 1.15], [2.7, 0.95, 2.5],
];
const CAM_LOOK: [number, number, number][] = [
  [0, 0.02, 0], [0, 0.04, 0], [0, 0.05, 1.5], [0, 0.05, 1.45], [0.05, 0.04, 1.5], [0.05, 0.04, 0.6],
  [0.05, 0.03, 0.05], [0.03, 0.02, 0], [0, 0, -0.3], [0.07, 0.02, -0.18], [0.08, 0.02, -0.2], [0, -0.05, -0.35],
];
const CAM_PULLBACK = [0.6, 0.6, 1, 1, 0.7, 0.4, 0.3, 0.5, 1, 0.15, 0.1, 1];

export interface VestSequenceOptions {
  /** Bloco alto que define quanto se rola. */
  track: HTMLElement;
  /** Parte presa na tela enquanto se rola. */
  sticky: HTMLElement;
  viewport: HTMLElement;
  overlay: {
    /** Elementos que somem juntos no fim (botões, legenda e etiquetas). */
    fade: HTMLElement[];
    curtain: HTMLElement;
    bar: HTMLElement;
    labels: Record<SequenceLabelId, HTMLElement>;
  };
  phaseStarts: number[];
  /** Parte da rolagem usada pela animação. */
  end: number;
  onPhase(index: number): void;
}

/** Progresso da rolagem dentro do bloco, de 0 a 1. */
export function sequenceProgress(track: HTMLElement, sticky: HTMLElement) {
  const r = track.getBoundingClientRect();
  return clamp(-r.top / (r.height - sticky.offsetHeight));
}

function makeVest(fabric: MeshPhysicalMaterial, fabricBack: MeshPhysicalMaterial, webbing: MeshStandardMaterial, patchMat: MeshStandardMaterial) {
  const vest = new Group();
  let carrierGeo: BufferGeometry = new ExtrudeGeometry(vestShape(1), {
    depth: 0.06,
    bevelEnabled: true,
    bevelThickness: 0.022,
    bevelSize: 0.02,
    bevelSegments: 4,
    curveSegments: 20,
  });
  carrierGeo.translate(0, 0, -0.03);
  carrierGeo = toCreasedNormals(carrierGeo, Math.PI / 3);
  const front = new Mesh(carrierGeo, fabric);
  const back = new Mesh(carrierGeo, fabricBack);
  back.position.z = -0.44;
  back.rotation.y = Math.PI;
  back.scale.x = 0.98;

  /* fitas MOLLE na frente */
  const molle = new InstancedMesh(new RoundedBoxGeometry(0.1, 0.03, 0.012, 2, 0.004), webbing, 24);
  const m4 = new Matrix4();
  let k = 0;
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 6; col++) molle.setMatrixAt(k++, m4.makeTranslation(-0.3 + col * 0.12, -0.5 + row * 0.085, 0.056));
  }
  const patch = new Mesh(new RoundedBoxGeometry(0.32, 0.11, 0.01, 2, 0.005), patchMat);
  patch.position.set(0, 0.2, 0.055);

  /* alças de ombro e cintura */
  const strap = (points: [number, number, number][], w: number, t: number) => {
    const sh = new Shape();
    sh.moveTo(-t / 2, -w / 2);
    sh.lineTo(t / 2, -w / 2);
    sh.lineTo(t / 2, w / 2);
    sh.lineTo(-t / 2, w / 2);
    sh.closePath();
    const path = new CatmullRomCurve3(points.map((p) => new Vector3(...p)));
    return new Mesh(new ExtrudeGeometry(sh, { steps: 40, bevelEnabled: false, extrudePath: path }), webbing);
  };
  const straps: Mesh[] = [];
  for (const s of [-1, 1]) {
    straps.push(strap([[s * 0.205, 0.6, 0.035], [s * 0.205, 0.7, -0.05], [s * 0.205, 0.75, -0.21], [s * 0.205, 0.7, -0.37], [s * 0.205, 0.6, -0.45]], 0.11, 0.022));
    straps.push(strap([[s * 0.462, -0.3, 0], [s * 0.56, -0.3, -0.09], [s * 0.6, -0.3, -0.22], [s * 0.56, -0.3, -0.35], [s * 0.462, -0.3, -0.44]], 0.02, 0.24));
  }
  vest.add(front, back, molle, patch, ...straps);
  /* tudo que some quando o painel se abre */
  const carrierParts = [back, molle, patch, ...straps];
  return { vest, carrierParts };
}

interface Layer {
  mesh: Mesh;
  geo: PlaneGeometry;
  mat: MeshStandardMaterial;
  base: Float32Array;
  /* profundidade e largura da deformação desta camada */
  depth: number;
  spread: number;
  scar: Mesh<RingGeometry, MeshStandardMaterial> | null;
}

/** Pacote balístico: 8 camadas de tecido, espuma e camada final. As três primeiras ganham furo. */
function makePackage() {
  const pkg = new Group();
  const mask = (hole: boolean) =>
    canvasTexture(
      256,
      333,
      (g, w, h) => {
        g.fillStyle = "#000";
        g.fillRect(0, 0, w, h);
        g.fillStyle = "#fff";
        g.beginPath();
        vestShape(0.92)
          .getPoints(16)
          .forEach((p, i) => {
            const x = (p.x / PACK_W + 0.5) * w;
            const y = (1 - (p.y / PACK_H + 0.5)) * h;
            if (i) g.lineTo(x, y);
            else g.moveTo(x, y);
          });
        g.closePath();
        g.fill();
        if (hole) {
          g.fillStyle = "#000";
          g.beginPath();
          g.arc((IMPACT_X / PACK_W + 0.5) * w, (1 - (IMPACT_Y / PACK_H + 0.5)) * h, (0.026 / PACK_W) * w, 0, Math.PI * 2);
          g.fill();
        }
      },
      { srgb: false },
    );
  const intact = mask(false);
  const holed = mask(true);
  const baseGeo = new PlaneGeometry(PACK_W, PACK_H, 44, 57);
  const ringGeo = new RingGeometry(0.026, 0.04, 40);

  const layers: Layer[] = [];
  for (let i = 0; i < LAYER_COUNT; i++) {
    const foam = i === FOAM_INDEX;
    const geo = baseGeo.clone();
    const mat = new MeshStandardMaterial({
      color: foam ? 0x2b3552 : 0x7486b4,
      roughness: foam ? 1 : 0.8,
      transparent: i < 3,
      side: DoubleSide,
      alphaMap: intact,
      alphaTest: 0.5,
      bumpMap: foam ? null : weaveTexture,
      bumpScale: 0.5,
      emissive: 0x2f6bff,
      emissiveIntensity: 0,
    });
    const mesh = new Mesh(geo, mat);
    pkg.add(mesh);
    let scar: Layer["scar"] = null;
    if (i < 3) {
      scar = new Mesh(ringGeo, new MeshStandardMaterial({ color: 0x4a5679, roughness: 1, side: DoubleSide, transparent: true }));
      scar.position.set(IMPACT_X, IMPACT_Y, 0);
      scar.visible = false;
      mesh.add(scar);
    }
    layers.push({
      mesh,
      geo,
      mat,
      base: Float32Array.from(geo.attributes.position.array),
      depth: 0.12 * Math.pow(1 - i / (LAYER_COUNT + 1), 1.5),
      spread: 2 * Math.pow(0.07 + 0.014 * i, 2),
      scar,
    });
  }
  baseGeo.dispose();

  let lastDent = -1;
  /** Afunda as camadas em volta do impacto; as de trás deformam menos e mais espalhado. */
  function dent(amount: number) {
    if (Math.abs(amount - lastDent) < 0.002) return;
    lastDent = amount;
    for (const layer of layers) {
      const pos = layer.geo.attributes.position;
      const a = pos.array as Float32Array;
      const b = layer.base;
      for (let j = 0; j < pos.count; j++) {
        const x = b[j * 3];
        const dx = x - IMPACT_X;
        const dy = b[j * 3 + 1] - IMPACT_Y;
        a[j * 3 + 2] = -0.05 * x * x - amount * layer.depth * Math.exp(-(dx * dx + dy * dy) / layer.spread);
      }
      pos.needsUpdate = true;
      layer.geo.computeVertexNormals();
      if (layer.scar) layer.scar.position.z = -amount * layer.depth + 0.0015;
    }
  }
  dent(0);

  /** Posição z de cada camada; espuma e camada final ficam um pouco mais afastadas. */
  const layerZ = (gap: number) => {
    const z: number[] = [];
    let acc = 0.02;
    for (let i = 0; i < LAYER_COUNT; i++) {
      z.push(acc);
      acc -= gap * (i === 7 || i === 8 ? 1.5 : 1);
    }
    return z;
  };
  return { pkg, layers, dent, layerZ, intact, holed };
}

/** Projétil com a ogiva normal e, como morph, a forma amassada depois do impacto. */
function makeBullet() {
  const R = 0.016;
  const profile = (mushroomed: boolean) =>
    (mushroomed
      ? [[0, 0], [R * 1.05, 0], [R * 1.3, 0.005], [R * 1.9, 0.01], [R * 2.35, 0.014], [R * 2.55, 0.017], [R * 2.3, 0.0195], [R * 1.5, 0.0215], [0, 0.022]]
      : [[0, 0], [R * 0.92, 0], [R, 0.004], [R, 0.034], [R * 0.96, 0.042], [R * 0.84, 0.05], [R * 0.62, 0.056], [R * 0.32, 0.0595], [0, 0.06]]
    ).map(([x, y]) => new Vector2(x, y));
  const geo = new LatheGeometry(profile(false), 32);
  const flat = new LatheGeometry(profile(true), 32);
  geo.rotateX(-Math.PI / 2);
  flat.rotateX(-Math.PI / 2);
  geo.morphAttributes.position = [flat.attributes.position];
  geo.morphAttributes.normal = [flat.attributes.normal];
  const bullet = new Mesh(geo, new MeshStandardMaterial({ color: 0xc8834f, metalness: 1, roughness: 0.28 }));
  bullet.morphTargetInfluences = [0];
  return bullet;
}

/** Arma em silhueta lateral, borrada de propósito: só indica de onde vem o disparo. */
function makeGunTexture() {
  return canvasTexture(512, 256, (g) => {
    const shape = (color: string) => {
      g.fillStyle = color;
      g.strokeStyle = color;
      g.beginPath();
      g.roundRect(70, 64, 410, 56, 12);
      g.rect(470, 82, 30, 24);
      g.roundRect(160, 114, 250, 30, 10);
      g.fill();
      g.beginPath();
      g.moveTo(84, 112);
      g.lineTo(172, 112);
      g.lineTo(142, 236);
      g.quadraticCurveTo(138, 248, 126, 248);
      g.lineTo(54, 248);
      g.quadraticCurveTo(40, 248, 43, 235);
      g.closePath();
      g.fill();
      g.lineWidth = 9;
      g.beginPath();
      g.moveTo(172, 142);
      g.quadraticCurveTo(196, 200, 240, 170);
      g.lineTo(240, 144);
      g.stroke();
    };
    /* desfoque feito com cópias deslocadas, sem filtro de canvas */
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      g.save();
      g.globalAlpha = 0.1;
      g.translate(Math.cos(a) * 7, Math.sin(a) * 7);
      shape("#3c4870");
      g.restore();
    }
    g.globalAlpha = 0.8;
    shape("#2b3554");
    g.globalAlpha = 0.6;
    g.strokeStyle = "#6b95ff";
    g.lineWidth = 6;
    g.beginPath();
    g.moveTo(96, 68);
    g.lineTo(470, 68);
    g.stroke();
  });
}

const additiveSprite = (map: Texture, color: number, size: number) => {
  const s = new Sprite(new SpriteMaterial({ map, color, transparent: true, blending: AdditiveBlending, depthWrite: false, fog: false, toneMapped: false }));
  s.scale.setScalar(size);
  return s;
};

export function createVestSequence({ track, sticky, viewport, overlay, phaseStarts, end, onPhase }: VestSequenceOptions): Disposable {
  const scene = new Scene();
  scene.fog = new Fog(0x05070d, 3, 11);
  const fog = scene.fog;
  const camera = new PerspectiveCamera(34, 1, 0.02, 60);
  const lights = studioLights(scene, { key: 3, rim: 4.5, fill: 0.3, env: 0.35 });
  lights.key.position.set(-2.2, 3, 3.4);
  lights.rim.position.set(2.6, 1.6, -3);
  const spot = new SpotLight(0xdfe8ff, 22, 9, 0.55, 0.7, 1.5);
  spot.position.set(0.8, 3.2, 1.8);
  scene.add(spot, spot.target);

  const fabric = new MeshPhysicalMaterial({
    color: 0x141a2b,
    roughness: 0.85,
    sheen: 0.3,
    sheenColor: new Color(0xa4b6e0),
    sheenRoughness: 0.5,
    bumpMap: weaveTexture,
    bumpScale: 1.0,
    transparent: true,
  });
  const fabricBack = fabric.clone();
  fabricBack.color.set(0x121829);
  const webbing = new MeshStandardMaterial({ color: 0x0f1729, roughness: 0.9, transparent: true });
  const patchMat = new MeshStandardMaterial({ color: 0x29355a, roughness: 1, transparent: true });
  const { vest, carrierParts } = makeVest(fabric, fabricBack, webbing, patchMat);
  scene.add(vest);

  const { pkg, layers, dent, layerZ, intact, holed } = makePackage();
  vest.add(pkg);
  const bullet = makeBullet();
  pkg.add(bullet);

  const trailMat = new MeshBasicMaterial({
    map: canvasTexture(256, 16, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, w, 0);
      gr.addColorStop(0, "rgba(160,190,255,0)");
      gr.addColorStop(1, "rgba(225,236,255,.95)");
      g.fillStyle = gr;
      g.fillRect(0, h * 0.3, w, h * 0.4);
    }),
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
    side: DoubleSide,
    fog: false,
  });
  const trail = new Group();
  trail.rotation.y = Math.PI / 2;
  for (const rx of [0, Math.PI / 2]) {
    const plane = new Mesh(new PlaneGeometry(1, 0.009), trailMat);
    plane.rotation.x = rx;
    trail.add(plane);
  }
  scene.add(trail);

  const flashGlow = additiveSprite(glowTexture, 0xffd2a0, 1);
  const flashStar = additiveSprite(starTexture, 0xfff1dc, 1.2);
  flashGlow.position.set(IMPACT_X, IMPACT_Y, MUZZLE_Z);
  flashStar.position.set(IMPACT_X, IMPACT_Y, MUZZLE_Z);
  const flashLight = new PointLight(0xffc48a, 0, 6, 1.6);
  flashLight.position.set(IMPACT_X, IMPACT_Y, MUZZLE_Z - 0.2);
  const hitGlow = additiveSprite(glowTexture, 0xcfe0ff, 0.5);
  hitGlow.position.set(IMPACT_X, IMPACT_Y, 0.08);
  const hitLight = new PointLight(0x9fbcff, 0, 2.5, 1.6);
  hitLight.position.set(IMPACT_X, IMPACT_Y, 0.3);
  const retGlow = additiveSprite(glowTexture, 0x8fb2ff, 0.3);
  const retLight = new PointLight(0x9fbcff, 0, 1.6, 1.8);
  const shock = new Mesh(
    new RingGeometry(0.95, 1, 64),
    new MeshBasicMaterial({ color: 0xa8c2ff, transparent: true, blending: AdditiveBlending, depthWrite: false, toneMapped: false, fog: false }),
  );
  shock.position.set(IMPACT_X, IMPACT_Y, 0.062);
  scene.add(flashGlow, flashStar, flashLight, hitGlow, hitLight, retGlow, retLight, shock);

  /* fibras soltas no impacto */
  const FIBERS = 60;
  const fiberDir: Vector3[] = [];
  const fiberPos = new Float32Array(FIBERS * 3);
  for (let i = 0; i < FIBERS; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 0.3 + Math.random() * 0.7;
    fiberDir.push(new Vector3(Math.cos(a) * s, Math.sin(a) * s, 0.4 + Math.random() * 0.9).multiplyScalar(0.2 + Math.random() * 0.25));
  }
  const fiberGeo = new BufferGeometry();
  fiberGeo.setAttribute("position", new BufferAttribute(fiberPos, 3));
  const fibers = new Points(fiberGeo, new PointsMaterial({ color: 0xe3ebff, size: 0.012, transparent: true, depthWrite: false, blending: AdditiveBlending, fog: false }));
  scene.add(fibers);

  const gunMat = new MeshBasicMaterial({ map: makeGunTexture(), transparent: true, depthWrite: false, toneMapped: false, fog: false, side: DoubleSide });
  const gun = new Mesh(new PlaneGeometry(1, 0.5), gunMat);
  gun.rotation.y = Math.PI / 2;
  scene.add(gun);
  /* o cano da silhueta fica alinhado com a trajetória */
  const gunZ = MUZZLE_Z + 0.477 + 0.03;
  const gunY = IMPACT_Y - (0.5 - 94 / 256) * 0.5;

  const camPath = new CatmullRomCurve3(CAM_POS.map((p) => new Vector3(...p)), false, "centripetal");
  const lookPath = new CatmullRomCurve3(CAM_LOOK.map((p) => new Vector3(...p)), false, "centripetal");
  const segment = (p: number) => {
    let k = 0;
    while (k < CAM_T.length - 2 && p > CAM_T[k + 1]) k++;
    const u = (p - CAM_T[k]) / (CAM_T[k + 1] - CAM_T[k]);
    return { k, u, s: (k + u) / (CAM_T.length - 1) };
  };

  let progress = 0;
  let intro = 0;
  let started = false;
  let pullback = 1;
  let phase = -1;
  const tmp = new Vector3();
  const target = new Vector3();
  const bulletWorld = new Vector3();
  const labelAnchor = new Vector3();

  function placeLabel(node: HTMLElement, x: number, y: number, z: number, visibility: number, rect: DOMRect) {
    node.style.opacity = visibility.toFixed(3);
    if (visibility <= 0) return;
    labelAnchor.set(x, y, z).applyMatrix4(pkg.matrixWorld).project(camera);
    node.style.transform = `translate(${(((labelAnchor.x + 1) / 2) * rect.width).toFixed(1)}px, ${(((1 - labelAnchor.y) / 2) * rect.height - 10).toFixed(1)}px)`;
  }

  const remove = getEngine().add({
    name: "Experiência",
    el: viewport,
    scene,
    camera,
    onAspect(aspect) {
      /* em telas estreitas a câmera recua pra o colete caber */
      pullback = aspect < 1.3 ? clamp(1.3 / aspect, 1, 2.4) : 1;
      camera.fov = aspect < 1 ? 40 : 34;
    },
    update(t, dt, rect) {
      const reduced = motion.reduced;
      const raw = sequenceProgress(track, sticky);
      progress = snapScroll() ? raw : damp(progress, raw, 6, dt);
      const p = progress;
      if (track.getBoundingClientRect().top < window.innerHeight * 0.7) started = true;
      if (started) intro = snapScroll() || reduced ? 1 : Math.min(1, intro + dt / 1.6);

      /* P é o tempo da animação; depois de "end" só acontece o fechamento */
      const P = clamp(p / end);
      const ki = outCubic(intro);
      const lit = 1 - smooth(range(p, 0.9, 0.96));
      const uiOpacity = (1 - smooth(range(p, 0.88, 0.93))).toFixed(3);
      for (const node of overlay.fade) node.style.opacity = uiOpacity;
      overlay.curtain.style.opacity = smooth(range(p, 0.94, 1)).toFixed(3);

      /* luz: escurece no disparo e de novo na retenção, que ganha um foco só pra ela */
      const retention = smooth(range(P, 0.68, 0.74)) * (1 - 0.45 * smooth(range(P, 0.88, 0.96)));
      const dim = (1 - 0.55 * range(P, 0.14, 0.22) * (1 - range(P, 0.5, 0.6))) * (1 - 0.55 * retention);
      lights.key.intensity = lights.base.key * ki * dim * lit;
      lights.rim.intensity = lights.base.rim * ki * lit;
      spot.intensity = 22 * ki * dim * lit;
      scene.environmentIntensity = 0.35 * ki * (1 - 0.5 * retention) * lit;
      vest.position.y = lerp(-0.2, 0, ki);
      vest.rotation.y = lerp(-0.7, 0, ki);

      /* arma e clarão */
      const gunAlpha = smooth(range(P, 0.1, 0.17)) * (1 - range(P, 0.3, 0.36));
      const flash = reduced ? 0 : bump(P, 0.225, 0.012);
      gun.visible = gunAlpha > 0.002;
      gunMat.opacity = gunAlpha;
      gun.position.set(IMPACT_X, gunY, gunZ + (1 - gunAlpha) * 0.5 + (reduced ? 0 : bump(P, 0.232, 0.012) * 0.07));
      flashGlow.material.opacity = flash;
      flashGlow.scale.setScalar(0.3 + flash * 1.1);
      flashStar.scale.setScalar(0.2 + flash * 0.75);
      flashStar.material.opacity = flash * 0.7;
      flashStar.material.rotation = P * 30;
      flashLight.intensity = flash * 30;

      /* camadas: deformam no impacto, se separam e brilham em onda na retenção */
      const explode = smooth(range(P, 0.52, 0.64));
      const z = layerZ(lerp(0.0045, 0.085, explode));
      const dentAmount = smooth(range(P, 0.45, 0.5));
      dent(dentAmount);
      const wave = range(P, 0.7, 0.84) * 12;
      const holePunched = P > 0.462;
      layers.forEach((layer, i) => {
        layer.mesh.position.set(i * 0.012 * explode, -i * 0.006 * explode, z[i]);
        if (layer.scar) {
          const wantMap = holePunched ? holed : intact;
          if (layer.mat.alphaMap !== wantMap) layer.mat.alphaMap = wantMap;
          layer.mat.opacity = 1 - 0.7 * smooth(range(P, 0.68, 0.74));
          layer.scar.material.opacity = layer.mat.opacity;
          layer.scar.visible = holePunched && layer.mat.opacity > 0.6;
        }
        const inWave = P > 0.7 && P < 0.9 ? 1 : 0;
        layer.mat.emissiveIntensity = (reduced ? 0.5 : 1) * 1.8 * Math.exp(-((wave - i) ** 2) / 1.5) * (1 - i / 12) * inWave;
      });

      /* a capa do colete some pra mostrar o pacote */
      const coverFade = range(P, 0.52, 0.6);
      fabric.opacity = 1 - coverFade * 0.9;
      fabric.depthWrite = coverFade < 0.02;
      for (const m of [fabricBack, webbing, patchMat]) {
        m.opacity = 1 - coverFade;
        m.depthWrite = coverFade < 0.02;
      }
      for (const part of carrierParts) part.visible = coverFade < 0.99;

      /* projétil: voa até a frente, entra e para retido entre as camadas */
      const bulletLength = 0.022;
      const frontZ = 0.052;
      const retainedZ = z[3] - layers[3].depth * dentAmount + bulletLength + 0.003;
      let bulletZ: number;
      let morph = 0;
      if (P < 0.45) bulletZ = lerp(MUZZLE_Z, frontZ + 0.06, range(P, 0.23, 0.45));
      else {
        bulletZ = lerp(frontZ + 0.06, retainedZ, smooth(range(P, 0.45, 0.52)));
        morph = smooth(range(P, 0.45, 0.5));
      }
      bullet.visible = P > 0.226;
      bullet.position.set(IMPACT_X + 0.012 * explode * 3, IMPACT_Y - 0.006 * explode * 3, bulletZ);
      bullet.morphTargetInfluences![0] = morph;
      bullet.rotation.z = P * 14;

      const trailLength = clamp(MUZZLE_Z - bulletZ, 0, 0.7);
      const trailAlpha = P > 0.226 && P < 0.47 ? 1 - range(P, 0.44, 0.47) : 0;
      trail.visible = trailAlpha > 0;
      trail.scale.set(Math.max(0.001, trailLength), 1, 1);
      trail.position.set(IMPACT_X, IMPACT_Y, bulletZ + 0.06 + trailLength / 2);
      trailMat.opacity = trailAlpha * 0.7;

      const hit = reduced ? 0 : bump(P, 0.455, 0.012);
      hitGlow.material.opacity = hit * 0.8;
      hitGlow.scale.setScalar(0.12 + hit * 0.45);
      hitLight.intensity = hit * 3.5;
      const shockT = range(P, 0.45, 0.54);
      shock.visible = shockT > 0 && shockT < 1;
      shock.scale.setScalar(0.02 + outCubic(shockT) * 0.32);
      shock.material.opacity = (1 - shockT) * 0.8;
      const fiberT = range(P, 0.45, 0.53);
      fibers.visible = fiberT > 0 && fiberT < 1;
      const spread = outCubic(fiberT);
      for (let i = 0; i < FIBERS; i++) {
        const d = fiberDir[i];
        fiberPos[i * 3] = IMPACT_X + d.x * spread;
        fiberPos[i * 3 + 1] = IMPACT_Y + d.y * spread - fiberT * fiberT * 0.05;
        fiberPos[i * 3 + 2] = 0.06 + d.z * spread;
      }
      fiberGeo.attributes.position.needsUpdate = true;
      fibers.material.opacity = 1 - fiberT;

      /* destaque da retenção em volta do projétil */
      vest.updateMatrixWorld();
      bullet.getWorldPosition(bulletWorld);
      const pulse = reduced ? 1 : 0.85 + 0.15 * Math.sin(t * 3);
      retGlow.position.copy(bulletWorld);
      retGlow.material.opacity = retention * 0.75 * pulse * lit;
      retGlow.scale.setScalar(0.15 + retention * 0.3);
      retLight.position.copy(bulletWorld).add(tmp.set(0.15, 0.12, 0.25));
      retLight.intensity = retention * 1.5 * lit;
      spot.target.position.copy(bulletWorld).multiplyScalar(retention);
      spot.intensity += retention * 5 * lit;

      /* câmera */
      const { k, u, s } = segment(P);
      camPath.getPoint(s, tmp);
      lookPath.getPoint(s, target);
      const m = 1 + (pullback - 1) * lerp(CAM_PULLBACK[k], CAM_PULLBACK[k + 1], u);
      tmp.sub(target).multiplyScalar(m).add(target);
      if (!reduced) {
        const shake = bump(P, 0.465, 0.02) * 0.01;
        tmp.x += Math.sin(t * 61) * shake;
        tmp.y += Math.sin(t * 47 + 1) * shake;
      }
      camera.position.copy(tmp);
      camera.lookAt(target);
      fog.near = 2.6 * m;
      fog.far = 10 * m;

      let current = 0;
      for (let i = 0; i < phaseStarts.length; i++) if (P >= phaseStarts[i] - 0.001) current = i;
      if (current !== phase) {
        phase = current;
        onPhase(current);
      }
      overlay.bar.style.width = `${(P * 100).toFixed(1)}%`;

      const layerLabels = Math.max(range(P, 0.58, 0.62) * (1 - range(P, 0.66, 0.69)), range(P, 0.9, 0.95));
      placeLabel(overlay.labels.tecido, 0.43, 0.22, z[2], layerLabels, rect);
      placeLabel(overlay.labels.espuma, 0.45, -0.12, z[8], layerLabels, rect);
      placeLabel(overlay.labels.final, 0.42, -0.42, z[9], layerLabels, rect);
      placeLabel(overlay.labels.projetil, IMPACT_X + 0.05, IMPACT_Y - 0.04, retainedZ - 0.01, range(P, 0.72, 0.76) * (1 - range(P, 0.88, 0.9)), rect);
    },
  });

  return {
    dispose() {
      remove();
      disposeObject(scene);
      intact.dispose();
      holed.dispose();
    },
  };
}
