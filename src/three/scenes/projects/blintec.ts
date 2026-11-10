/* Sistema de Produção Blintec: os rolos chegam, o tecido é estendido em camadas (enfesto), marcado e cortado */
import {
  AdditiveBlending,
  BoxGeometry,
  BufferGeometry,
  CircleGeometry,
  CylinderGeometry,
  Group,
  LineBasicMaterial,
  LineLoop,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  ShapeGeometry,
} from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { motion } from "../../engine/motion";
import { bump, clamp, lerp, outBack, outCubic, range, smooth } from "../../lib/math";
import { vestShape } from "../../lib/shapes";
import { materials } from "../../lib/studio";
import { canvasTexture, weaveTexture } from "../../lib/textures";
import { createProjectView, type ProjectAnimation } from "./kit";

const TABLE_TOP = 0.08;
const SPREAD_LEN = 1.8;
const SPREAD_W = 1.0;
const SPREAD_X = 0.28;
const PLY_COUNT = 6;
const PLY_THICKNESS = 0.007;
const ROLL_R = 0.13;
const DURATION = 6.4;

function rollEndTexture(color: string) {
  return canvasTexture(128, 128, (g, w, h) => {
    g.fillStyle = color;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "rgba(60,72,110,.45)";
    g.lineWidth = 1.2;
    g.beginPath();
    for (let a = 0; a < Math.PI * 2 * 9; a += 0.05) {
      const r = 18 + a * 1.6;
      g.lineTo(64 + Math.cos(a) * r, 64 + Math.sin(a) * r);
    }
    g.stroke();
    g.fillStyle = "#3a4562";
    g.beginPath();
    g.arc(64, 64, 16, 0, 7);
    g.fill();
    g.fillStyle = "#0b0f1a";
    g.beginPath();
    g.arc(64, 64, 9, 0, 7);
    g.fill();
  });
}

function buildBlintec(root: Group): ProjectAnimation {
  const table = new Mesh(new RoundedBoxGeometry(2.5, 0.08, 1.4, 3, 0.025), materials.graphite);
  table.position.y = 0.04;
  root.add(table);

  const plies = Array.from({ length: PLY_COUNT }, (_, k) => {
    const m = new Mesh(new PlaneGeometry(SPREAD_LEN, SPREAD_W), k % 2 ? materials.fabricAlt : materials.fabric);
    m.rotation.x = -Math.PI / 2;
    m.position.set(SPREAD_X + Math.sin(k * 7.3) * 0.006, TABLE_TOP + PLY_THICKNESS * (k + 1), Math.cos(k * 3.1) * 0.006);
    m.visible = false;
    root.add(m);
    return m;
  });

  const makeRoll = (body: MeshStandardMaterial, endColor: string) => {
    const g = new Group();
    const side = new Mesh(new CylinderGeometry(1, 1, 1, 48, 1, true), body);
    side.rotation.x = Math.PI / 2;
    g.add(side);
    const endMat = new MeshStandardMaterial({ map: rollEndTexture(endColor), roughness: 0.8 });
    for (const s of [-1, 1]) {
      const cap = new Mesh(new CircleGeometry(1, 48), endMat);
      cap.position.z = s * 0.5;
      cap.rotation.y = s > 0 ? 0 : Math.PI;
      g.add(cap);
    }
    root.add(g);
    return g;
  };
  const rolls = [makeRoll(materials.fabric, "#b4c1e0"), makeRoll(materials.fabricAlt, "#9caed6"), makeRoll(materials.fabric, "#b4c1e0")];
  /* dois rolos embaixo e um em cima; o de cima é o que estende o tecido */
  const stack: [number, number][] = [[-1.07, TABLE_TOP + ROLL_R], [-0.81, TABLE_TOP + ROLL_R], [-0.94, TABLE_TOP + ROLL_R * 2.75]];

  /* marcação: uma linha de luz passa sobre o enfesto */
  const scanMat = new MeshBasicMaterial({ color: 0x9fbcff, transparent: true, blending: AdditiveBlending, toneMapped: false, depthWrite: false });
  const scan = new Mesh(new BoxGeometry(0.012, 0.012, SPREAD_W + 0.1), scanMat);
  const scanGlowMat = new MeshBasicMaterial({
    map: canvasTexture(64, 8, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, w, 0);
      gr.addColorStop(0, "rgba(47,107,255,0)");
      gr.addColorStop(0.5, "rgba(107,149,255,.8)");
      gr.addColorStop(1, "rgba(47,107,255,0)");
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
    }),
    transparent: true,
    blending: AdditiveBlending,
    toneMapped: false,
    depthWrite: false,
  });
  const scanGlow = new Mesh(new PlaneGeometry(0.14, SPREAD_W + 0.1), scanGlowMat);
  scanGlow.rotation.x = -Math.PI / 2;
  root.add(scan, scanGlow);

  /* moldes de colete marcados e depois cortados */
  const pieces = [-0.25, 0.3, 0.85].map((x, i) => {
    const g = new Group();
    const shape = vestShape(0.62);
    const fill = new Mesh(
      new ShapeGeometry(shape, 12),
      new MeshStandardMaterial({ color: 0xdbe3f6, roughness: 0.7, bumpMap: weaveTexture, bumpScale: 0.4, transparent: true, emissive: 0x2f6bff, emissiveIntensity: 0 }),
    );
    const outline = new LineLoop(new BufferGeometry().setFromPoints(shape.getPoints(14)), new LineBasicMaterial({ color: 0xa9c4ff, transparent: true, toneMapped: false }));
    outline.position.z = 0.002;
    g.add(fill, outline);
    g.rotation.x = -Math.PI / 2;
    g.rotation.z = i % 2 ? Math.PI : 0;
    g.position.set(x, 0, 0);
    root.add(g);
    return { g, fill, outline, x };
  });

  function pose(t: number) {
    rolls.forEach((roll, i) => {
      const e = outCubic(clamp((t - i * 0.22) / 0.7));
      const [x, y] = stack[i];
      roll.position.set(lerp(-2.4, x, e), y, i === 2 ? 0 : i ? -0.06 : 0.06);
      roll.rotation.z = -(roll.position.x - x) / ROLL_R;
      roll.scale.set(ROLL_R, ROLL_R, SPREAD_W + 0.04);
    });

    /* enfesto: o rolo de cima vai e volta, deixando uma camada a cada passada e ficando mais fino */
    const passTime = 0.38;
    const spreadStart = 1.1;
    let rx = rolls[2].position.x;
    let ry = rolls[2].position.y;
    let radius = ROLL_R;
    let spin = 0;
    const lift = clamp((t - 0.8) / 0.3);
    if (t > 0.8) {
      rx = lerp(stack[2][0], SPREAD_X - SPREAD_LEN / 2, smooth(lift));
      ry = lerp(stack[2][1], TABLE_TOP + PLY_THICKNESS + ROLL_R, smooth(lift));
    }
    plies.forEach((ply, k) => {
      const ts = t - spreadStart - k * passTime;
      const f = clamp(ts / passTime);
      const dir = k % 2 ? -1 : 1;
      const startX = SPREAD_X - (dir * SPREAD_LEN) / 2;
      ply.visible = ts > 0;
      ply.scale.x = Math.max(0.001, f);
      ply.position.x = startX + (dir * SPREAD_LEN * f) / 2;
      const passing = ts > 0 && ts <= passTime + 0.001;
      const lastDone = k === PLY_COUNT - 1 && ts > passTime;
      if (passing || lastDone) {
        radius = ROLL_R - 0.008 * k;
        rx = startX + dir * SPREAD_LEN * (passing ? f : 1);
        ry = TABLE_TOP + PLY_THICKNESS * (k + 1) + radius;
        if (passing) spin = (-dir * (SPREAD_LEN * f)) / radius;
      }
    });
    rolls[2].position.set(rx, ry, 0);
    rolls[2].scale.set(radius, radius, SPREAD_W + 0.04);
    if (spin) rolls[2].rotation.z = spin;

    const topY = TABLE_TOP + PLY_THICKNESS * PLY_COUNT + 0.002;
    const scanT = t - (spreadStart + PLY_COUNT * passTime + 0.2);
    const scanX = lerp(SPREAD_X - SPREAD_LEN / 2 - 0.05, SPREAD_X + SPREAD_LEN / 2 + 0.05, clamp(scanT / 1.1));
    const scanAlpha = scanT > 0 && scanT < 1.3 ? 1 - range(scanT, 1.1, 1.3) : 0;
    scan.visible = scanGlow.visible = scanAlpha > 0;
    scan.position.set(scanX, topY + 0.006, 0);
    scanGlow.position.set(scanX, topY + 0.003, 0);
    scanMat.opacity = scanAlpha;
    scanGlowMat.opacity = scanAlpha;

    /* os moldes aparecem quando a linha passa e sobem quando são cortados */
    const cutT = t - (spreadStart + PLY_COUNT * passTime + 1.6);
    pieces.forEach((piece, i) => {
      const marked = smooth(clamp((scanX - (piece.x - 0.3)) / 0.3)) * (scanT > 0 ? 1 : 0);
      piece.outline.material.opacity = marked;
      piece.fill.material.opacity = cutT > 0 ? smooth(clamp(cutT / 0.3)) : marked * 0.25;
      piece.g.visible = marked > 0;
      const rise = outBack(clamp((cutT - i * 0.12) / 0.5));
      piece.g.position.y = topY + (cutT > 0 ? rise * 0.07 : 0);
      piece.fill.material.emissiveIntensity = cutT > 0 ? 0.35 * bump(cutT - i * 0.12, 0.4, 0.25) : 0;
    });
  }
  pose(0);

  /* 99 = parado no fim até alguém mandar tocar */
  let elapsed = 99;
  return {
    play() {
      elapsed = motion.reduced ? DURATION : 0;
    },
    hover(on) {
      if (on && elapsed > DURATION) elapsed = 0;
    },
    tap() {
      elapsed = 0;
    },
    update(_t, dt) {
      if (elapsed < 90) elapsed += dt;
      pose(Math.min(elapsed, DURATION + 2));
    },
  };
}

export const createBlintecScene = (viewport: HTMLElement) =>
  createProjectView("Blintec", viewport, { distance: 4.2, look: [0, 0.2, 0] }, buildBlintec);
