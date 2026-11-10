/* TempGuard: o ESP32 lê o DHT22 e acende o LED verde, amarelo ou vermelho; no vermelho o buzzer toca */
import {
  AdditiveBlending,
  BoxGeometry,
  CircleGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  PointLight,
  RingGeometry,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
} from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { motion } from "../../engine/motion";
import { damp } from "../../lib/math";
import { materials } from "../../lib/studio";
import { canvasTexture, glowTexture } from "../../lib/textures";
import { createProjectView, type ProjectAnimation } from "./kit";

/** 0 normal, 1 atenção, 2 alerta: igual aos LEDs verde, amarelo e vermelho. */
export type AlertLevel = 0 | 1 | 2;

export const TEMP_WARNING = 30;
export const TEMP_ALERT = 34;
export const LED_COLORS = [0x22c55e, 0xfacc15, 0xef4444] as const;

const CYCLE = 9.5;
const HOT_PART = 5.6;

export interface TempGuardOptions {
  /** Chamado quando a leitura mostrada muda (temperatura com uma casa decimal ou nível). */
  onReading(temperature: number, level: AlertLevel): void;
}

const levelFor = (temp: number): AlertLevel => (temp >= TEMP_ALERT ? 2 : temp >= TEMP_WARNING ? 1 : 0);

function makeBoard(root: Group) {
  const pcb = new Mesh(new RoundedBoxGeometry(2.0, 0.05, 1.25, 3, 0.02), new MeshStandardMaterial({ color: 0x0c1631, roughness: 0.45, metalness: 0.25 }));
  pcb.position.y = 0.025;
  /* trilhas ligando a placa ao sensor, aos LEDs e ao buzzer */
  const traces = new Mesh(
    new PlaneGeometry(1.96, 1.21),
    new MeshBasicMaterial({
      map: canvasTexture(512, 320, (g, w, h) => {
        const X = (x: number) => (x / 2 + 0.5) * w;
        const Z = (z: number) => (z / 1.25 + 0.5) * h;
        g.strokeStyle = "rgba(107,149,255,.55)";
        g.lineWidth = 3;
        g.lineJoin = "round";
        const path = (pts: [number, number][]) => {
          g.beginPath();
          pts.forEach(([x, z], i) => (i ? g.lineTo(X(x), Z(z)) : g.moveTo(X(x), Z(z))));
          g.stroke();
        };
        path([[0.24, -0.1], [-0.2, -0.1], [-0.2, -0.2], [-0.48, -0.2]]);
        path([[0.24, 0.02], [-0.05, 0.02], [-0.05, 0.3], [-0.05, 0.38]]);
        path([[0.24, 0.1], [-0.2, 0.1], [-0.25, 0.3], [-0.25, 0.38]]);
        path([[0.24, 0.18], [-0.3, 0.18], [-0.45, 0.3], [-0.45, 0.38]]);
        path([[0.24, 0.26], [0.1, 0.26], [0.1, 0.5], [-0.62, 0.5], [-0.62, 0.45]]);
        g.fillStyle = "rgba(214,180,90,.9)";
        for (const [x, z] of [[-0.48, -0.2], [-0.05, 0.38], [-0.25, 0.38], [-0.45, 0.38], [-0.62, 0.45]]) {
          g.beginPath();
          g.arc(X(x), Z(z), 5, 0, 7);
          g.fill();
        }
      }),
      transparent: true,
      toneMapped: false,
    }),
  );
  traces.rotation.x = -Math.PI / 2;
  traces.position.y = 0.0505;

  /* módulo ESP32: placa, blindagem, antena e pinos */
  const devkit = new Mesh(new RoundedBoxGeometry(0.62, 0.03, 1.0, 2, 0.01), new MeshStandardMaterial({ color: 0x090c15, roughness: 0.5 }));
  devkit.position.set(0.55, 0.065, 0);
  const shield = new Mesh(new RoundedBoxGeometry(0.4, 0.045, 0.46, 2, 0.01), new MeshStandardMaterial({ color: 0xc7cfdd, metalness: 1, roughness: 0.32 }));
  shield.position.set(0.55, 0.1, -0.16);
  const antenna = new Mesh(new PlaneGeometry(0.4, 0.1), new MeshStandardMaterial({ color: 0x1e2a4a, roughness: 0.5 }));
  antenna.rotation.x = -Math.PI / 2;
  antenna.position.set(0.55, 0.081, -0.43);
  const pins = new InstancedMesh(new BoxGeometry(0.03, 0.05, 0.03), new MeshStandardMaterial({ color: 0xd6b45a, metalness: 1, roughness: 0.3 }), 28);
  const m4 = new Matrix4();
  let k = 0;
  for (const s of [-1, 1]) for (let i = 0; i < 14; i++) pins.setMatrixAt(k++, m4.makeTranslation(0.55 + s * 0.27, 0.095, -0.42 + i * 0.065));
  root.add(pcb, traces, devkit, shield, antenna, pins);
}

function makeSensor(root: Group) {
  const dht = new Group();
  dht.position.set(-0.55, 0.05, -0.2);
  const body = new Mesh(new RoundedBoxGeometry(0.3, 0.38, 0.12, 3, 0.02), new MeshStandardMaterial({ color: 0xe6ebf4, roughness: 0.55 }));
  body.position.y = 0.25;
  const grille = canvasTexture(128, 160, (g, w, h) => {
    g.fillStyle = "#e6ebf4";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#9aa6bf";
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 4; c++) {
        g.beginPath();
        g.roundRect(14 + c * 27, 14 + r * 19, 19, 11, 4);
        g.fill();
      }
    }
  });
  const face = new Mesh(new PlaneGeometry(0.26, 0.32), new MeshStandardMaterial({ map: grille, roughness: 0.6 }));
  face.position.set(0, 0.26, 0.0605);
  dht.add(body, face);
  for (let i = 0; i < 4; i++) {
    const leg = new Mesh(new BoxGeometry(0.012, 0.07, 0.012), materials.metal);
    leg.position.set(-0.075 + i * 0.05, 0.035, 0);
    dht.add(leg);
  }
  root.add(dht);
}

function makeLeds(root: Group) {
  return [-0.45, -0.25, -0.05].map((x, i) => {
    const g = new Group();
    g.position.set(x, 0.05, 0.38);
    const mat = new MeshStandardMaterial({
      color: new Color(LED_COLORS[i]).multiplyScalar(0.35),
      roughness: 0.25,
      metalness: 0,
      emissive: LED_COLORS[i],
      emissiveIntensity: 0,
      transparent: true,
      opacity: 0.92,
    });
    const body = new Mesh(new CylinderGeometry(0.045, 0.05, 0.07, 24), mat);
    body.position.y = 0.075;
    const dome = new Mesh(new SphereGeometry(0.045, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat);
    dome.position.y = 0.11;
    const rim = new Mesh(new CylinderGeometry(0.056, 0.056, 0.012, 24), mat);
    rim.position.y = 0.045;
    const halo = new Sprite(new SpriteMaterial({ map: glowTexture, color: LED_COLORS[i], transparent: true, blending: AdditiveBlending, depthWrite: false, toneMapped: false, opacity: 0 }));
    halo.position.y = 0.12;
    halo.scale.setScalar(0.5);
    const light = new PointLight(LED_COLORS[i], 0, 1.4, 2);
    light.position.y = 0.2;
    g.add(body, dome, rim, halo, light);
    root.add(g);
    return { mat, halo, light, level: 0 };
  });
}

/** Anéis que se expandem: leitura do sensor (azul) e som do buzzer (vermelho). */
function makeRings(root: Group, count: number, color: number, x: number, y: number, z: number, inner: number) {
  return Array.from({ length: count }, () => {
    const ring = new Mesh(
      new RingGeometry(inner, 1, 64),
      new MeshBasicMaterial({ color, transparent: true, blending: AdditiveBlending, depthWrite: false, toneMapped: false, side: DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(x, y, z);
    root.add(ring);
    return ring;
  });
}

function buildTempGuard(root: Group, { onReading }: TempGuardOptions) {
  makeBoard(root);
  makeSensor(root);
  const buzzer = new Mesh(new CylinderGeometry(0.11, 0.11, 0.1, 40), new MeshStandardMaterial({ color: 0x0b0e16, roughness: 0.4 }));
  buzzer.position.set(-0.62, 0.1, 0.42);
  const buzzerHole = new Mesh(new CircleGeometry(0.025, 20), new MeshBasicMaterial({ color: 0x000000 }));
  buzzerHole.rotation.x = -Math.PI / 2;
  buzzerHole.position.set(-0.62, 0.1505, 0.42);
  root.add(buzzer, buzzerHole);
  const leds = makeLeds(root);
  const readPulses = makeRings(root, 3, 0x6b95ff, -0.55, 0.056, -0.2, 0.96);
  const soundWaves = makeRings(root, 3, 0xff8a8a, -0.62, 0.152, 0.42, 0.94);

  let running = false;
  let elapsed = 0;
  let temp = 24;
  let heating = false;
  let shown = "";

  const animation: ProjectAnimation = {
    play() {
      running = true;
      elapsed = 0;
      temp = 24;
    },
    /* passar o mouse esquenta o sensor */
    hover(on) {
      heating = on;
    },
    tap() {
      heating = !heating;
      running = true;
    },
    update(t, dt) {
      const reduced = motion.reduced;
      if (running) elapsed += dt;
      const hotPhase = running && elapsed % CYCLE < HOT_PART;
      const target = heating ? 38.5 : hotPhase ? 38 : 24;
      if (reduced && running) temp = heating ? 38.5 : 31;
      else temp = damp(temp, target, heating ? 1.1 : target > temp ? 0.55 : 0.8, dt);

      const level = levelFor(temp);
      const key = `${temp.toFixed(1)}-${level}`;
      if (key !== shown) {
        shown = key;
        onReading(temp, level);
      }

      leds.forEach((led, i) => {
        led.level = damp(led.level, i === level && running ? 1 : 0, 12, dt);
        const blink = i === 2 && !reduced ? 0.75 + 0.25 * Math.sin(t * 12) : 1;
        led.mat.emissiveIntensity = led.level * 2.6 * blink;
        led.halo.material.opacity = led.level * 0.9 * blink;
        led.light.intensity = led.level * 2.2 * blink;
      });
      readPulses.forEach((ring, i) => {
        const ph = (t * 0.9 + i / 3) % 1;
        ring.scale.setScalar(0.12 + ph * 0.55);
        ring.material.opacity = running && !reduced ? (1 - ph) * 0.7 : 0;
      });
      soundWaves.forEach((ring, i) => {
        const ph = (t * 1.8 + i / 3) % 1;
        ring.scale.setScalar(0.14 + ph * 0.35);
        ring.material.opacity = level === 2 && running && !reduced ? (1 - ph) * 0.8 : 0;
      });
    },
  };
  return animation;
}

export const createTempGuardScene = (viewport: HTMLElement, options: TempGuardOptions) =>
  createProjectView("TempGuard", viewport, { distance: 3.5, look: [0, 0.2, 0.05] }, (root) => buildTempGuard(root, options));
