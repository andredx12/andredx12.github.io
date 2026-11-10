/* Formas 2D reaproveitadas pelas cenas */
import { Shape, ShapeGeometry, type BufferGeometry } from "three";

/** Retângulo de cantos arredondados, centrado na origem. */
export function roundedRectShape(w: number, h: number, r: number) {
  const s = new Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

/** Contorno de retângulo arredondado com espessura t. */
export function roundedRectRing(w: number, h: number, r: number, t: number) {
  const s = roundedRectShape(w, h, r);
  s.holes.push(roundedRectShape(w - 2 * t, h - 2 * t, Math.max(0.001, r - t)));
  return new ShapeGeometry(s, 16);
}

/** Recalcula as UVs de uma forma plana pra textura cobrir o retângulo w × h. */
export function planarUV<T extends BufferGeometry>(geo: T, w: number, h: number) {
  const p = geo.attributes.position;
  const uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / w + 0.5, p.getY(i) / h + 0.5);
  uv.needsUpdate = true;
  return geo;
}

/** Silhueta frontal de um colete, usada no painel, nas camadas e nos moldes de corte. */
export function vestShape(scale = 1) {
  const sh = new Shape();
  const P = (x: number, y: number): [number, number] => [x * scale, y * scale];
  sh.moveTo(...P(0, -0.62));
  sh.lineTo(...P(0.38, -0.62));
  sh.quadraticCurveTo(...P(0.47, -0.62), ...P(0.47, -0.53));
  sh.lineTo(...P(0.48, 0.06));
  sh.bezierCurveTo(...P(0.48, 0.2), ...P(0.33, 0.24), ...P(0.3, 0.4));
  sh.lineTo(...P(0.27, 0.6));
  sh.quadraticCurveTo(...P(0.265, 0.64), ...P(0.22, 0.64));
  sh.lineTo(...P(0.15, 0.64));
  sh.bezierCurveTo(...P(0.13, 0.46), ...P(0.07, 0.38), ...P(0, 0.37));
  sh.bezierCurveTo(...P(-0.07, 0.38), ...P(-0.13, 0.46), ...P(-0.15, 0.64));
  sh.lineTo(...P(-0.22, 0.64));
  sh.quadraticCurveTo(...P(-0.265, 0.64), ...P(-0.27, 0.6));
  sh.lineTo(...P(-0.3, 0.4));
  sh.bezierCurveTo(...P(-0.33, 0.24), ...P(-0.48, 0.2), ...P(-0.48, 0.06));
  sh.lineTo(...P(-0.47, -0.53));
  sh.quadraticCurveTo(...P(-0.47, -0.62), ...P(-0.38, -0.62));
  sh.lineTo(...P(0, -0.62));
  return sh;
}
