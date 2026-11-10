/* EmprestaCampus: o notebook abre, pede o código da verificação em 2 etapas e o cadeado destrava */
import {
  AdditiveBlending,
  CanvasTexture,
  CircleGeometry,
  Color,
  CylinderGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  SRGBColorSpace,
  Sprite,
  SpriteMaterial,
  TorusGeometry,
} from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { motion } from "../../engine/motion";
import { clamp, inOut, outBack, outCubic } from "../../lib/math";
import { materials } from "../../lib/studio";
import { glowTexture } from "../../lib/textures";
import { createProjectView, type ProjectAnimation } from "./kit";

const CODE_DIGITS = 6;
/* Momentos da animação, em segundos */
const SCREEN_ON = 0.8;
const TYPING_START = 1.6;
const DIGIT_INTERVAL = 0.2;
const UNLOCKED = 3.35;
const DURATION = 9;
const REPLAY_FROM = 1.45;

const FONT = "Inter, system-ui, sans-serif";

/** Tela do sistema: verificação em 2 etapas e, depois, acesso liberado. */
function drawScreen(canvas: HTMLCanvasElement, digits: number, unlocked: boolean) {
  const g = canvas.getContext("2d")!;
  const w = canvas.width;
  const h = canvas.height;
  const bg = g.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, "#0d1430");
  bg.addColorStop(1, "#141c33");
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  g.fillStyle = "rgba(47,107,255,.18)";
  g.fillRect(0, 0, w, 44);
  g.fillStyle = "#eef2ff";
  g.font = `600 20px ${FONT}`;
  g.textAlign = "left";
  g.fillText("EmprestaCampus", 24, 29);
  g.fillStyle = "#0b1020";
  g.strokeStyle = "#24304f";
  g.lineWidth = 2;
  g.beginPath();
  g.roundRect(150, 78, 340, 270, 18);
  g.fill();
  g.stroke();
  g.textAlign = "center";

  if (unlocked) {
    g.fillStyle = "rgba(34,197,94,.15)";
    g.beginPath();
    g.arc(320, 170, 46, 0, 7);
    g.fill();
    g.strokeStyle = "#22c55e";
    g.lineWidth = 7;
    g.lineCap = "round";
    g.beginPath();
    g.moveTo(298, 170);
    g.lineTo(314, 186);
    g.lineTo(344, 154);
    g.stroke();
    g.fillStyle = "#eef2ff";
    g.font = `600 24px ${FONT}`;
    g.fillText("Acesso liberado", 320, 260);
    g.fillStyle = "#94a3b8";
    g.font = `16px ${FONT}`;
    g.fillText("Sessão protegida por TLS", 320, 290);
    return;
  }

  g.fillStyle = "#eef2ff";
  g.font = `600 22px ${FONT}`;
  g.fillText("Verificação em 2 etapas", 320, 132);
  g.fillStyle = "#94a3b8";
  g.font = `16px ${FONT}`;
  g.fillText("Digite o código do app", 320, 160);
  for (let i = 0; i < CODE_DIGITS; i++) {
    const x = 180 + i * 48;
    const filled = i < digits;
    g.fillStyle = filled ? "rgba(47,107,255,.25)" : "#141c33";
    g.strokeStyle = filled ? "#6b95ff" : "#24304f";
    g.beginPath();
    g.roundRect(x, 198, 40, 52, 8);
    g.fill();
    g.stroke();
    if (filled) {
      g.fillStyle = "#eef2ff";
      g.beginPath();
      g.arc(x + 20, 224, 6, 0, 7);
      g.fill();
    }
  }
  g.fillStyle = digits === CODE_DIGITS ? "#2962f2" : "#24304f";
  g.beginPath();
  g.roundRect(180, 280, 280, 44, 10);
  g.fill();
  g.fillStyle = "#fff";
  g.font = `600 17px ${FONT}`;
  g.fillText("Entrar", 320, 308);
}

function makeLaptop(root: Group) {
  const shell = new MeshStandardMaterial({ color: 0x2a3352, metalness: 0.7, roughness: 0.36 });
  const base = new Mesh(new RoundedBoxGeometry(1.6, 0.06, 1.05, 3, 0.02), shell);
  base.position.y = 0.03;
  const deck = new Mesh(new PlaneGeometry(1.4, 0.52), new MeshStandardMaterial({ color: 0x0e1322, roughness: 0.8 }));
  deck.rotation.x = -Math.PI / 2;
  deck.position.set(0, 0.0605, -0.1);
  const keyMat = new MeshStandardMaterial({ color: 0x1c2440, roughness: 0.6, metalness: 0.2 });
  const keys = new InstancedMesh(new RoundedBoxGeometry(0.082, 0.014, 0.078, 1, 0.006), keyMat, 56);
  const m4 = new Matrix4();
  let k = 0;
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 14; col++) keys.setMatrixAt(k++, m4.makeTranslation(-0.62 + col * 0.0955, 0.066, -0.31 + row * 0.1));
  }
  const space = new Mesh(new RoundedBoxGeometry(0.5, 0.014, 0.078, 1, 0.006), keyMat);
  space.position.set(0, 0.066, 0.09);
  const pad = new Mesh(new PlaneGeometry(0.46, 0.24), new MeshStandardMaterial({ color: 0x232c48, roughness: 0.5, metalness: 0.3 }));
  pad.rotation.x = -Math.PI / 2;
  pad.position.set(0, 0.061, 0.33);
  root.add(base, deck, keys, space, pad);

  const hinge = new Group();
  hinge.position.set(0, 0.06, -0.525);
  const lid = new Mesh(new RoundedBoxGeometry(1.6, 0.035, 1.03, 3, 0.015), shell);
  lid.position.set(0, 0.0175, 0.515);
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 400;
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  const screenMat = new MeshBasicMaterial({ map: texture, toneMapped: false });
  const screen = new Mesh(new PlaneGeometry(1.46, 0.9), screenMat);
  screen.rotation.x = Math.PI / 2;
  screen.position.set(0, -0.0008, 0.5);
  hinge.add(lid, screen);
  root.add(hinge);
  return { hinge, screenMat, canvas, texture };
}

function makeLock(root: Group) {
  const lock = new Group();
  lock.position.set(-0.92, 0.5, 0.3);
  lock.rotation.y = 0.45;
  const body = new Mesh(new RoundedBoxGeometry(0.34, 0.28, 0.13, 3, 0.04), new MeshStandardMaterial({ color: 0x2f6bff, metalness: 0.6, roughness: 0.28 }));
  const keyholeMat = new MeshBasicMaterial({ color: 0x6b95ff, toneMapped: false });
  const hole = new Mesh(new CircleGeometry(0.026, 24), keyholeMat);
  hole.position.set(0, 0.02, 0.066);
  const slot = new Mesh(new PlaneGeometry(0.014, 0.05), keyholeMat);
  slot.position.set(0, -0.02, 0.066);
  lock.add(body, hole, slot);

  const shackle = new Group();
  shackle.position.set(-0.095, 0.14, 0);
  const legGeo = new CylinderGeometry(0.022, 0.022, 0.2, 20);
  const left = new Mesh(legGeo, materials.metal);
  left.position.set(0, 0.04, 0);
  const right = new Mesh(legGeo, materials.metal);
  right.position.set(0.19, 0.04, 0);
  const arc = new Mesh(new TorusGeometry(0.095, 0.022, 14, 36, Math.PI), materials.metal);
  arc.position.set(0.095, 0.14, 0);
  shackle.add(left, right, arc);
  lock.add(shackle);

  const glow = new Sprite(new SpriteMaterial({ map: glowTexture, color: 0x22c55e, transparent: true, blending: AdditiveBlending, depthWrite: false, toneMapped: false }));
  glow.scale.setScalar(0.5);
  glow.position.set(0, 0, 0.08);
  lock.add(glow);
  root.add(lock);
  return { lock, shackle, keyholeMat, glow };
}

function buildCampus(root: Group): ProjectAnimation {
  const laptop = makeLaptop(root);
  const lock = makeLock(root);
  const locked = new Color(0x6b95ff);
  const open = new Color(0x22c55e);
  let drawnState = "";

  function pose(t: number) {
    laptop.hinge.rotation.x = -1.9 * inOut(clamp(t / 1.1));
    laptop.screenMat.color.setScalar(clamp((t - SCREEN_ON) / 0.4));

    const digits = t < TYPING_START ? 0 : Math.max(0, Math.min(CODE_DIGITS, Math.floor((t - TYPING_START) / DIGIT_INTERVAL) + 1));
    const unlocked = t > UNLOCKED;
    const state = `${digits}-${unlocked}`;
    if (state !== drawnState) {
      drawnState = state;
      drawScreen(laptop.canvas, digits, unlocked);
      laptop.texture.needsUpdate = true;
    }

    const appear = outBack(clamp((t - 1.2) / 0.4));
    lock.lock.scale.setScalar(Math.max(0.001, appear));
    lock.lock.visible = appear > 0.002;
    /* a haste sobe e gira pra fora quando o código confere */
    const up = outCubic(clamp((t - 3.0) / 0.25));
    const swing = inOut(clamp((t - 3.25) / 0.35));
    lock.shackle.position.y = 0.14 + up * 0.075;
    lock.shackle.rotation.y = -1.15 * swing;
    const release = clamp((t - 3.1) / 0.3);
    lock.keyholeMat.color.copy(locked).lerp(open, release);
    lock.glow.material.opacity = release * 0.7;
  }
  pose(0);

  let elapsed = 99;
  return {
    play() {
      elapsed = motion.reduced ? DURATION : 0;
    },
    hover(on) {
      if (on && elapsed > 4) elapsed = REPLAY_FROM;
    },
    tap() {
      if (elapsed > 4) elapsed = REPLAY_FROM;
    },
    update(_t, dt) {
      if (elapsed < 90) elapsed += dt;
      pose(Math.min(elapsed, DURATION));
    },
  };
}

export const createCampusScene = (viewport: HTMLElement) =>
  createProjectView("EmprestaCampus", viewport, { distance: 3.9, look: [0, 0.38, 0] }, buildCampus);
