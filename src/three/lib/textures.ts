/* Texturas desenhadas em canvas 2D: nada é baixado da rede */
import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from "three";

type Draw = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;

export function canvasTexture(w: number, h: number, draw: Draw, { srgb = true, repeat }: { srgb?: boolean; repeat?: [number, number] } = {}) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!, w, h);
  const t = new CanvasTexture(c);
  if (srgb) t.colorSpace = SRGBColorSpace;
  if (repeat) {
    t.wrapS = t.wrapT = RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  t.anisotropy = 4;
  return t;
}

/* Texturas compartilhadas entre cenas: marcadas pra não serem descartadas por uma cena só. */
function shared<T extends CanvasTexture>(t: T) {
  t.userData.shared = true;
  return t;
}

export const glowTexture = shared(
  canvasTexture(128, 128, (g, w, h) => {
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, "rgba(255,255,255,1)");
    gr.addColorStop(0.22, "rgba(255,255,255,.6)");
    gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
  }),
);

export const starTexture = shared(
  canvasTexture(256, 256, (g) => {
    g.translate(128, 128);
    for (let i = 0; i < 6; i++) {
      g.rotate(Math.PI / 3);
      const gr = g.createLinearGradient(0, 0, 124, 0);
      gr.addColorStop(0, "rgba(255,255,255,.95)");
      gr.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = gr;
      g.beginPath();
      g.moveTo(0, -6);
      g.lineTo(124, 0);
      g.lineTo(0, 6);
      g.fill();
    }
  }),
);

/** Trama de tecido usada como relevo nos tecidos balísticos. */
export const weaveTexture = shared(
  canvasTexture(
    64,
    64,
    (g) => {
      g.fillStyle = "#7a7a7a";
      g.fillRect(0, 0, 64, 64);
      for (let y = 0; y < 64; y += 8) {
        for (let x = 0; x < 64; x += 8) {
          const over = ((x + y) / 8) % 2;
          g.fillStyle = over ? "#c8c8c8" : "#3c3c3c";
          if (over) g.fillRect(x + 1, y + 2, 6, 4);
          else g.fillRect(x + 2, y + 1, 4, 6);
        }
      }
    },
    { srgb: false, repeat: [22, 22] },
  ),
);

export const shadowTexture = shared(
  canvasTexture(256, 256, (g, w, h) => {
    const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    gr.addColorStop(0, "rgba(1,3,9,.75)");
    gr.addColorStop(0.5, "rgba(1,3,9,.35)");
    gr.addColorStop(1, "rgba(1,3,9,0)");
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
  }),
);
