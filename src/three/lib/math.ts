/* Funções de interpolação usadas pelas animações */

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Posição de p dentro do intervalo [a, b], limitada entre 0 e 1. */
export const range = (p: number, a: number, b: number) => clamp((p - a) / (b - a));

export const smooth = (t: number) => t * t * (3 - 2 * t);
export const outCubic = (t: number) => 1 - Math.pow(1 - t, 3);
export const inOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const outBack = (t: number) => {
  const c1 = 1.5;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

/** Aproxima a de b de forma independente da taxa de quadros. */
export const damp = (a: number, b: number, k: number, dt: number) => lerp(a, b, 1 - Math.exp(-k * dt));

/** Pulso gaussiano centrado em c, com largura w. */
export const bump = (p: number, c: number, w: number) => Math.exp(-(((p - c) / w) ** 2));
