/*
 * Estufas IoT: o ESP32 lê temperatura, umidade do solo e luz, e liga por relés a irrigação,
 * a ventilação e a iluminação conforme os limites da cultura, com histerese como no main.py do projeto.
 */
import {
  AdditiveBlending,
  BoxGeometry,
  CylinderGeometry,
  DoubleSide,
  Euler,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  PointLight,
  Quaternion,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  TorusGeometry,
  Vector3,
} from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { motion } from "../../engine/motion";
import { clamp, damp } from "../../lib/math";
import { materials } from "../../lib/studio";
import { glowTexture } from "../../lib/textures";
import { createProjectView, type ProjectAnimation } from "./kit";

export type Crop = "alface" | "repolho";

/** Limites de cada cultura: ventila acima da temperatura e irriga abaixo da umidade do solo. */
export const CROP_LIMITS: Record<Crop, { ventAbove: number; irrigateBelow: number }> = {
  alface: { ventAbove: 24, irrigateBelow: 60 },
  repolho: { ventAbove: 20, irrigateBelow: 70 },
};
const LIGHT_ON_BELOW = 5000;
const LIGHT_OFF_ABOVE = 6000;
const CYCLE = 14;

/** Ordem dos relés: irrigação, ventilação e iluminação. */
export type Relays = [boolean, boolean, boolean];

export interface GreenhouseReadings {
  temperature: number;
  soil: number;
  lux: number;
  relays: Relays;
}

export interface EstufasOptions {
  /** Chamado quando algum valor mostrado muda. */
  onReadings(readings: GreenhouseReadings): void;
}

const GH_W = 2.0;
const GH_D = 1.2;
const GH_H = 0.95;
const ROWS = [-0.27, 0.27];

function makeStructure(root: Group) {
  const base = new Mesh(new RoundedBoxGeometry(GH_W + 0.1, 0.06, GH_D + 0.1, 3, 0.02), materials.graphite);
  base.position.y = 0.03;
  root.add(base);

  const bar = (len: number, x: number, y: number, z: number, rx = 0, rz = 0) => {
    const m = new Mesh(new BoxGeometry(0.025, len, 0.025), materials.metal);
    m.position.set(x, y, z);
    m.rotation.set(rx, 0, rz);
    root.add(m);
  };
  const half = GH_D / 2;
  const ridge = GH_H + 0.32;
  const slope = Math.hypot(half, 0.32);
  const angle = Math.atan2(half, 0.32);
  for (const x of [-GH_W / 2, 0, GH_W / 2]) {
    for (const z of [-half, half]) bar(GH_H, x, 0.06 + GH_H / 2, z);
    bar(slope, x, 0.06 + GH_H + 0.16, -half / 2, angle);
    bar(slope, x, 0.06 + GH_H + 0.16, half / 2, -angle);
  }
  for (const z of [-half, half]) bar(GH_W, 0, 0.06 + GH_H, z, 0, Math.PI / 2);
  bar(GH_W, 0, 0.06 + ridge, 0, 0, Math.PI / 2);

  /* vidro só no fundo, na lateral e numa água do telhado, pra não esconder o interior */
  const glass = new MeshStandardMaterial({ color: 0x9fb6ff, roughness: 0.1, metalness: 0, transparent: true, opacity: 0.07, side: DoubleSide, depthWrite: false });
  const pane = (w: number, h: number, x: number, y: number, z: number, ry = 0, rx = 0) => {
    const p = new Mesh(new PlaneGeometry(w, h), glass);
    p.position.set(x, y, z);
    p.rotation.set(rx, ry, 0, "YXZ");
    root.add(p);
  };
  pane(GH_W, GH_H, 0, 0.06 + GH_H / 2, -half);
  pane(GH_D, GH_H, -GH_W / 2, 0.06 + GH_H / 2, 0, Math.PI / 2);
  pane(GH_W, slope, 0, 0.06 + GH_H + 0.16, -half / 2, 0, -(Math.PI / 2 - angle));
  return { ridge, half };
}

/** Canteiros com alface e repolho em instâncias; a troca de cultura encolhe uma e cresce a outra. */
function makeBeds(root: Group) {
  const beds = ROWS.map((z) => {
    const bed = new Mesh(new RoundedBoxGeometry(GH_W - 0.3, 0.1, 0.36, 2, 0.02), new MeshStandardMaterial({ color: 0x3a2c22, roughness: 0.95 }));
    bed.position.set(0.05, 0.11, z);
    root.add(bed);
    return bed;
  });

  const spots: [number, number][] = [];
  for (const z of ROWS) for (let i = 0; i < 5; i++) spots.push([-0.6 + i * 0.32, z]);
  const leaf = new SphereGeometry(0.07, 14, 8);
  leaf.scale(1, 0.45, 1.6);
  leaf.translate(0, 0, 0.06);
  const lettuceMat = new MeshStandardMaterial({ color: 0x7ccf5a, roughness: 0.7 });
  const cabbageMat = new MeshStandardMaterial({ color: 0x6f9f8c, roughness: 0.6 });
  const lettuce = new InstancedMesh(leaf, lettuceMat, spots.length * 7);
  const cabbageHeads = new InstancedMesh(new SphereGeometry(0.1, 20, 14), cabbageMat, spots.length);
  const cabbageLeaves = new InstancedMesh(leaf, cabbageMat, spots.length * 5);
  root.add(lettuce, cabbageHeads, cabbageLeaves);

  const m4 = new Matrix4();
  const q = new Quaternion();
  const e = new Euler();
  const scale = new Vector3();
  const pos = new Vector3();
  function grow(lettuceSize: number, cabbageSize: number) {
    let a = 0;
    let b = 0;
    spots.forEach(([x, z], si) => {
      for (let k = 0; k < 7; k++) {
        const outer = k < 4;
        q.setFromEuler(e.set(-0.35 - (k % 2) * 0.25, k * 0.9 + si, 0, "YXZ"));
        scale.setScalar(Math.max(0.001, lettuceSize * (outer ? 1 : 0.75)));
        pos.set(x, 0.17 + (outer ? 0 : 0.03) * lettuceSize, z);
        lettuce.setMatrixAt(a++, m4.compose(pos, q, scale));
      }
      scale.setScalar(Math.max(0.001, cabbageSize));
      pos.set(x, 0.16 + 0.08 * cabbageSize, z);
      cabbageHeads.setMatrixAt(si, m4.compose(pos, q.identity(), scale));
      for (let k = 0; k < 5; k++) {
        q.setFromEuler(e.set(-0.2, k * 1.26 + si, 0, "YXZ"));
        scale.set(cabbageSize * 1.3, cabbageSize, cabbageSize * 1.2);
        pos.set(x, 0.17, z);
        cabbageLeaves.setMatrixAt(b++, m4.compose(pos, q, scale));
      }
    });
    lettuce.instanceMatrix.needsUpdate = true;
    cabbageHeads.instanceMatrix.needsUpdate = true;
    cabbageLeaves.instanceMatrix.needsUpdate = true;
  }
  return { beds, grow };
}

function makeIrrigation(root: Group) {
  const pipeMat = new MeshStandardMaterial({ color: 0x2f6bff, roughness: 0.35, metalness: 0.3, emissive: 0x2f6bff, emissiveIntensity: 0 });
  for (const z of ROWS) {
    const pipe = new Mesh(new CylinderGeometry(0.014, 0.014, GH_W - 0.3, 12), pipeMat);
    pipe.rotation.z = Math.PI / 2;
    pipe.position.set(0.05, 0.62, z);
    root.add(pipe);
  }
  const COUNT = 36;
  const drops = new InstancedMesh(new SphereGeometry(0.012, 8, 6), new MeshBasicMaterial({ color: 0x8fb4ff, transparent: true, opacity: 0.9, toneMapped: false }), COUNT);
  const dropX = Array.from({ length: COUNT }, (_, i) => -0.75 + (i % 9) * 0.2 + 0.05);
  const dropZ = Array.from({ length: COUNT }, (_, i) => (i % 2 ? ROWS[1] : ROWS[0]));
  const dropT = Array.from({ length: COUNT }, () => Math.random());
  root.add(drops);

  const m4 = new Matrix4();
  const q = new Quaternion();
  const scale = new Vector3();
  const pos = new Vector3();
  /** Gotas caindo dos canos; no movimento reduzido o cano só acende. */
  function update(dt: number, flow: number, reduced: boolean) {
    pipeMat.emissiveIntensity = reduced ? flow * 0.8 : 0;
    drops.visible = !reduced;
    if (reduced) return;
    const on = flow > 0.05;
    for (let i = 0; i < COUNT; i++) {
      dropT[i] = (dropT[i] + dt * 1.6) % 1;
      scale.setScalar(on ? 1 : 0.0001);
      pos.set(dropX[i], 0.6 - dropT[i] * 0.42, dropZ[i]);
      drops.setMatrixAt(i, m4.compose(pos, q, scale));
    }
    drops.instanceMatrix.needsUpdate = true;
    drops.material.opacity = flow * 0.9;
  }
  return { update };
}

function makeFan(root: Group) {
  const fan = new Group();
  fan.position.set(-GH_W / 2 + 0.02, 0.62, 0);
  fan.rotation.y = Math.PI / 2;
  const housing = new Mesh(new TorusGeometry(0.2, 0.025, 10, 40), materials.graphite);
  const hub = new Mesh(new CylinderGeometry(0.04, 0.04, 0.05, 20), materials.metal);
  hub.rotation.x = Math.PI / 2;
  const blades = new Group();
  for (let i = 0; i < 4; i++) {
    const blade = new Mesh(new BoxGeometry(0.06, 0.17, 0.008), materials.metal);
    blade.position.y = 0.1;
    blade.rotation.y = 0.4;
    const arm = new Group();
    arm.rotation.z = (i * Math.PI) / 2;
    arm.add(blade);
    blades.add(arm);
  }
  fan.add(housing, hub, blades);
  root.add(fan);
  return blades;
}

function makeLamp(root: Group) {
  const mat = new MeshStandardMaterial({ color: 0x1b2340, emissive: 0xffe6a8, emissiveIntensity: 0, roughness: 0.4 });
  const lamp = new Mesh(new RoundedBoxGeometry(1.4, 0.04, 0.08, 2, 0.015), mat);
  lamp.position.set(0.05, 0.06 + GH_H + 0.02, 0);
  const light = new PointLight(0xffe2a0, 0, 2.6, 1.6);
  light.position.set(0.05, 0.06 + GH_H - 0.05, 0);
  const glow = new Sprite(new SpriteMaterial({ map: glowTexture, color: 0xffd98a, transparent: true, blending: AdditiveBlending, depthWrite: false, toneMapped: false, opacity: 0 }));
  glow.position.copy(lamp.position);
  glow.scale.set(1.9, 0.5, 1);
  root.add(lamp, light, glow);
  return (on: number) => {
    mat.emissiveIntensity = on * 2.2;
    light.intensity = on * 3;
    glow.material.opacity = on * 0.55;
  };
}

/** Placa ESP32, DHT22 na parede, sondas de solo e LDR no telhado. */
function makeSensors(root: Group, ridge: number, half: number) {
  const esp = new Mesh(new RoundedBoxGeometry(0.26, 0.03, 0.16, 2, 0.008), new MeshStandardMaterial({ color: 0x0c1631, roughness: 0.45 }));
  esp.position.set(GH_W / 2 - 0.12, 0.075, -0.47);
  const ledMat = new MeshBasicMaterial({ color: 0x6b95ff, toneMapped: false });
  const led = new Mesh(new SphereGeometry(0.012, 10, 8), ledMat);
  led.position.set(GH_W / 2 - 0.05, 0.095, -0.43);
  const dht = new Mesh(new RoundedBoxGeometry(0.07, 0.1, 0.035, 2, 0.008), new MeshStandardMaterial({ color: 0xe6ebf4, roughness: 0.55 }));
  dht.position.set(GH_W / 2 - 0.03, 0.5, -half + 0.03);
  const probeMat = new MeshStandardMaterial({ color: 0x2f6bff, roughness: 0.4 });
  for (const z of ROWS) {
    const probe = new Mesh(new BoxGeometry(0.03, 0.16, 0.012), probeMat);
    probe.position.set(0.7, 0.2, z);
    root.add(probe);
  }
  const ldr = new Mesh(new CylinderGeometry(0.03, 0.03, 0.015, 20), new MeshStandardMaterial({ color: 0xd9a441, roughness: 0.4 }));
  ldr.position.set(0.6, 0.06 + ridge - 0.1, -0.18);
  root.add(esp, led, dht, ldr);
  return ledMat;
}

function buildEstufas(root: Group, { onReadings }: EstufasOptions) {
  const { ridge, half } = makeStructure(root);
  const { beds, grow } = makeBeds(root);
  const irrigation = makeIrrigation(root);
  const fanBlades = makeFan(root);
  const setLamp = makeLamp(root);
  const espLed = makeSensors(root, ridge, half);

  let crop: Crop = "alface";
  let running = false;
  let elapsed = 0;
  let temp = 22;
  let soil = 68;
  let lux = 9000;
  let fanAngle = 0;
  let shown = "";
  const relays: Relays = [false, false, false];
  const relayLevel = [0, 0, 0];
  const size = { lettuce: 1, cabbage: 0 };
  grow(1, 0);

  const animation: ProjectAnimation & { setCrop(c: Crop): void } = {
    play() {
      running = true;
      elapsed = 0;
      temp = 22;
      soil = 68;
      lux = 9000;
    },
    hover() {},
    tap() {
      running = true;
    },
    setCrop(c) {
      crop = c;
      running = true;
    },
    update(t, dt) {
      const reduced = motion.reduced;
      if (running) elapsed += dt;
      const limits = CROP_LIMITS[crop];
      const cycle = elapsed % CYCLE;

      /* ambiente simulado: a tarde esquenta, o solo seca e no fim do ciclo escurece */
      const ambient = running ? (cycle < 1.5 ? 21 : cycle < 8 ? 28 : 19) : 22;
      const sunlight = running ? (cycle > 7 && cycle < 12.5 ? 2600 : 9200) : 9000;
      temp += ((ambient - temp) * 0.45 - (relays[1] ? 2.4 : 0)) * dt;
      if (reduced && running) temp = ambient - (relays[1] ? 3 : 0);
      soil = clamp(soil + (running ? (relays[0] ? 8 : -3.4) : 0) * dt, 35, 85);
      lux = damp(lux, sunlight, 1.2, dt);

      /* histerese: liga no limite e só desliga com folga */
      if (running) {
        if (soil < limits.irrigateBelow) relays[0] = true;
        else if (soil > limits.irrigateBelow + 5) relays[0] = false;
        if (temp > limits.ventAbove) relays[1] = true;
        else if (temp < limits.ventAbove - 1) relays[1] = false;
        if (lux < LIGHT_ON_BELOW) relays[2] = true;
        else if (lux > LIGHT_OFF_ABOVE) relays[2] = false;
      }

      const roundedLux = Math.round(lux / 100) * 100;
      const key = `${temp.toFixed(1)}|${Math.round(soil)}|${roundedLux}|${relays.join()}`;
      if (key !== shown) {
        shown = key;
        onReadings({ temperature: temp, soil: Math.round(soil), lux: roundedLux, relays: [...relays] });
      }

      relays.forEach((on, i) => {
        relayLevel[i] = damp(relayLevel[i], on ? 1 : 0, 8, dt);
      });
      size.lettuce = damp(size.lettuce, crop === "alface" ? 1 : 0, 6, dt);
      size.cabbage = damp(size.cabbage, crop === "repolho" ? 1 : 0, 6, dt);
      grow(size.lettuce, size.cabbage);

      /* solo seco fica mais claro */
      const dry = clamp((limits.irrigateBelow + 5 - soil) / 25);
      for (const bed of beds) bed.material.color.setRGB(0.075 + 0.07 * dry, 0.05 + 0.045 * dry, 0.035 + 0.03 * dry);

      irrigation.update(dt, relayLevel[0], reduced);
      fanAngle += dt * relayLevel[1] * (reduced ? 0 : 16);
      fanBlades.rotation.z = fanAngle;
      setLamp(relayLevel[2]);
      espLed.color.setHex(Math.sin(t * 6) > 0 && running ? 0x6b95ff : 0x1b2340);
    },
  };
  return animation;
}

export const createEstufasScene = (viewport: HTMLElement, options: EstufasOptions) =>
  createProjectView("Estufas", viewport, { distance: 4.5, look: [0, 0.5, 0] }, (root) => buildEstufas(root, options));
