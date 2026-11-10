/* Cenas 3D do portfólio: um canvas WebGL só, cada cena desenhada no retângulo do seu bloco */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';

const V3 = THREE.Vector3;
const rmq = matchMedia('(prefers-reduced-motion: reduce)');
let reduced = rmq.matches || location.hash === '#reduzido';
rmq.addEventListener?.('change', e => { reduced = e.matches; });
const coarse = matchMedia('(hover: none)').matches;
document.documentElement.classList.toggle('touch', coarse);

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const range = (p, a, b) => clamp((p - a) / (b - a));
const smooth = t => t * t * (3 - 2 * t);
const outCubic = t => 1 - Math.pow(1 - t, 3);
const inOut = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const outBack = t => { const c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
const damp = (a, b, k, dt) => lerp(a, b, 1 - Math.exp(-k * dt));
const bump = (p, c, w) => Math.exp(-(((p - c) / w) ** 2));

const canvas = document.getElementById('gl');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
} catch (err) {
  document.documentElement.classList.add('no-webgl');
  throw err;
}
/* qualidade: começa pelo teto do aparelho e desce sozinha se o quadro passar do orçamento */
const lowEnd = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 3;
const quality = { max: Math.min(devicePixelRatio, coarse ? 1.5 : 2), dpr: 1, tier: 'alta', forced: location.hash === '#leve', lowEnd };
quality.dpr = quality.forced ? .75 : lowEnd ? Math.min(1, quality.max) : quality.max;
quality.tier = quality.forced ? 'leve' : lowEnd ? 'média' : 'alta';
renderer.setPixelRatio(quality.dpr);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.setClearColor(0x000000, 0);
renderer.autoClear = false;
const envTex = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;

/* texturas desenhadas em canvas */
function canvasTex(w, h, draw, { srgb = true, repeat = null } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  t.anisotropy = 4;
  return t;
}
const glowTex = canvasTex(128, 128, (g, w, h) => {
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.22, 'rgba(255,255,255,.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
});
const starTex = canvasTex(256, 256, (g, w, h) => {
  g.translate(128, 128);
  for (let i = 0; i < 6; i++) {
    g.rotate(Math.PI / 3);
    const gr = g.createLinearGradient(0, 0, 124, 0);
    gr.addColorStop(0, 'rgba(255,255,255,.95)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.beginPath(); g.moveTo(0, -6); g.lineTo(124, 0); g.lineTo(0, 6); g.fill();
  }
});
const weave = canvasTex(64, 64, g => {
  g.fillStyle = '#7a7a7a'; g.fillRect(0, 0, 64, 64);
  for (let y = 0; y < 64; y += 8) for (let x = 0; x < 64; x += 8) {
    const o = ((x + y) / 8) % 2;
    g.fillStyle = o ? '#c8c8c8' : '#3c3c3c';
    if (o) g.fillRect(x + 1, y + 2, 6, 4); else g.fillRect(x + 2, y + 1, 4, 6);
  }
}, { srgb: false, repeat: [22, 22] });
const shadowTex = canvasTex(256, 256, (g, w, h) => {
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, 'rgba(1,3,9,.75)'); gr.addColorStop(.5, 'rgba(1,3,9,.35)'); gr.addColorStop(1, 'rgba(1,3,9,0)');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
});

/* formas */
function rrShape(w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}
function rrRing(w, h, r, t) {
  const s = rrShape(w, h, r);
  s.holes.push(rrShape(w - 2 * t, h - 2 * t, Math.max(.001, r - t)));
  return new THREE.ShapeGeometry(s, 16);
}
function planeUV(geo, w, h) {
  const p = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / w + .5, p.getY(i) / h + .5);
  uv.needsUpdate = true; return geo;
}
function vestShape(s = 1) {
  const sh = new THREE.Shape(), P = (x, y) => [x * s, y * s];
  sh.moveTo(...P(0, -.62)); sh.lineTo(...P(.38, -.62));
  sh.quadraticCurveTo(...P(.47, -.62), ...P(.47, -.53));
  sh.lineTo(...P(.48, .06));
  sh.bezierCurveTo(...P(.48, .2), ...P(.33, .24), ...P(.3, .4));
  sh.lineTo(...P(.27, .6)); sh.quadraticCurveTo(...P(.265, .64), ...P(.22, .64));
  sh.lineTo(...P(.15, .64));
  sh.bezierCurveTo(...P(.13, .46), ...P(.07, .38), ...P(0, .37));
  sh.bezierCurveTo(...P(-.07, .38), ...P(-.13, .46), ...P(-.15, .64));
  sh.lineTo(...P(-.22, .64)); sh.quadraticCurveTo(...P(-.265, .64), ...P(-.27, .6));
  sh.lineTo(...P(-.3, .4));
  sh.bezierCurveTo(...P(-.33, .24), ...P(-.48, .2), ...P(-.48, .06));
  sh.lineTo(...P(-.47, -.53)); sh.quadraticCurveTo(...P(-.47, -.62), ...P(-.38, -.62));
  sh.lineTo(...P(0, -.62));
  return sh;
}

/* luz de estúdio igual em todas as cenas */
function rig(scene, { key = 2.4, rim = 3.5, fill = .35, env = .45 } = {}) {
  scene.environment = envTex; scene.environmentIntensity = env;
  const k = new THREE.DirectionalLight(0xfff3e6, key); k.position.set(-2.5, 4, 3.5);
  const r = new THREE.DirectionalLight(0x2f6bff, rim); r.position.set(3, 2.2, -3.5);
  const h = new THREE.HemisphereLight(0x6b95ff, 0x05070d, fill);
  scene.add(k, r, h);
  return { k, r, h, base: { key, rim, fill } };
}
const mat = {
  graphite: new THREE.MeshStandardMaterial({ color: 0x1b2340, roughness: .5, metalness: .35 }),
  graphiteDark: new THREE.MeshStandardMaterial({ color: 0x0f1527, roughness: .7, metalness: .2 }),
  metal: new THREE.MeshStandardMaterial({ color: 0xd3d9e6, roughness: .24, metalness: 1 }),
  electric: new THREE.MeshStandardMaterial({ color: 0x2f6bff, roughness: .3, metalness: .55, emissive: 0x2f6bff, emissiveIntensity: .25 }),
  fabric: new THREE.MeshStandardMaterial({ color: 0xb4c1e0, roughness: .78, bumpMap: weave, bumpScale: .5, side: THREE.DoubleSide }),
  fabric2: new THREE.MeshStandardMaterial({ color: 0x9caed6, roughness: .78, bumpMap: weave, bumpScale: .5, side: THREE.DoubleSide }),
};

/* canvas único: cada vista desenha no retângulo do seu elemento */
const views = [];
let W = 0, H = 0, T = 0, last = performance.now(), running = false, inView = 0;
const perf = { frames: 0, fps: 0, ms: 0, calls: 0, tris: 0, drawing: [], state: 'pausado', samples: [], pauses: 0 };
renderer.info.autoReset = false;
function resize(force) {
  const w = document.documentElement.clientWidth, h = window.innerHeight;
  if (!force && w === W && h === H) return;
  W = w; H = h; renderer.setSize(W, H, true);
}
function setDpr(v, tier) { quality.dpr = v; quality.tier = tier; renderer.setPixelRatio(v); resize(true); perf.samples = []; }
const io = new IntersectionObserver(es => {
  for (const e of es) { const v = e.target.__view; if (v.inView !== e.isIntersecting) { v.inView = e.isIntersecting; inView += e.isIntersecting ? 1 : -1; } }
  if (inView > 0 && !running) { running = true; perf.state = 'rodando'; last = performance.now(); requestAnimationFrame(loop); }
});
function addView(v) { v.inView = false; v.el.__view = v; views.push(v); io.observe(v.el); }
function loop(now) {
  if (inView <= 0) {
    renderer.setScissorTest(false); renderer.clear(true, true, false);
    running = false; perf.state = 'pausado'; perf.pauses++; perf.drawing = []; return;
  }
  const raw = now - last, dt = Math.min(.05, raw / 1000); last = now; T += dt;
  resize();
  canvas.style.transform = `translate3d(0,${window.scrollY}px,0)`;
  renderer.info.reset();
  renderer.setScissorTest(false); renderer.clear(true, true, false);
  renderer.setScissorTest(true);
  const drawing = [];
  for (const v of views) {
    const r = v.el.getBoundingClientRect();
    if (!(r.bottom > 0 && r.top < H && r.right > 0 && r.left < W && r.width > 0 && r.height > 0)) continue;
    drawing.push(v.name);
    v.update(T, dt, r);
    const x = Math.round(r.left), y = Math.round(H - r.bottom), w = Math.round(r.width), h = Math.round(r.height);
    renderer.setViewport(x, y, w, h); renderer.setScissor(x, y, w, h);
    if (Math.abs(v.camera.aspect - w / h) > 1e-4) { v.camera.aspect = w / h; v.onAspect?.(w / h); v.camera.updateProjectionMatrix(); }
    renderer.clearDepth();
    renderer.render(v.scene, v.camera);
  }
  perf.frames++; perf.drawing = drawing; perf.calls = renderer.info.render.calls; perf.tris = renderer.info.render.triangles;
  if (raw < 250) perf.samples.push(raw);
  if (perf.samples.length >= 90 && !quality.forced) {
    const avg = perf.samples.reduce((a, b) => a + b, 0) / perf.samples.length; perf.samples = [];
    if (avg > 34 && quality.dpr <= 1 && quality.dpr > .75) setDpr(.75, 'leve');
    else if (avg > 22 && quality.dpr > 1) setDpr(1, 'média');
  }
  requestAnimationFrame(loop);
}
let fpsF = 0, fpsT = performance.now();
setInterval(() => { const n = performance.now(); perf.fps = Math.round((perf.frames - fpsF) * 1000 / (n - fpsT)); perf.ms = perf.fps ? +(1000 / perf.fps).toFixed(1) : 0; fpsF = perf.frames; fpsT = n; }, 1000);

/* ---------------- SOBRE ---------------- */
function makeHero() {
  const stage = document.getElementById('heroStage'), el = document.getElementById('heroGl');
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(30, 1, .1, 40);
  const L = rig(scene, { key: 2.6, rim: 5, fill: .45, env: .55 });
  L.k.position.set(-3, 3.2, 4); L.r.position.set(3, 1.5, -2.5);
  const root = new THREE.Group(); scene.add(root);
  const SH = 1 / .9, PB = -SH / 2, PH = .8, PT = PB + PH, R = .064;

  const panelTex = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#141c33'; g.fillRect(0, 0, w, h);
    const gr = g.createRadialGradient(w * .5, h * .12, 0, w * .5, h * .12, w * .8);
    gr.addColorStop(0, 'rgba(47,107,255,.5)'); gr.addColorStop(1, 'rgba(47,107,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const g2 = g.createLinearGradient(0, 0, 0, h);
    g2.addColorStop(0, 'rgba(5,7,13,0)'); g2.addColorStop(1, 'rgba(5,7,13,.6)');
    g.fillStyle = g2; g.fillRect(0, 0, w, h);
  });
  const panelMat = new THREE.MeshBasicMaterial({ map: panelTex, toneMapped: false });
  const panel = new THREE.Mesh(planeUV(new THREE.ShapeGeometry(rrShape(1, PH, R), 16), 1, PH), panelMat);
  panel.position.y = PB + PH / 2; root.add(panel);
  const border = new THREE.Mesh(rrRing(1, PH, R, .004), new THREE.MeshBasicMaterial({ color: 0x2f4170, toneMapped: false }));
  border.position.set(0, PB + PH / 2, .001); root.add(border);

  const plyDefs = [
    { fill: 0x141c33, line: 0x2f6bff, rest: [.03, -.03, -.05], open: [.05, -.045, -.22] },
    { fill: 0x0b1020, line: 0x24304f, rest: [.06, -.06, -.1], open: [.1, -.09, -.44] },
    { fill: null, line: 0x24304f, rest: [.09, -.09, -.15], open: [.15, -.135, -.66] },
  ];
  const plies = plyDefs.map(d => {
    const g = new THREE.Group();
    if (d.fill !== null) g.add(new THREE.Mesh(new THREE.ShapeGeometry(rrShape(1, PH, R), 16), new THREE.MeshBasicMaterial({ color: d.fill, toneMapped: false })));
    const ln = new THREE.Mesh(rrRing(1, PH, R, .004), new THREE.MeshBasicMaterial({ color: d.line, toneMapped: false, transparent: true, opacity: .8 }));
    ln.position.z = .001; g.add(ln); root.add(g);
    return { g, d };
  });

  let photoReady = false;
  const photoSrc = matchMedia('(max-width: 639px)').matches ? import.meta.env.BASE_URL + 'img/andre-recorte-560.webp' : import.meta.env.BASE_URL + 'img/andre-recorte-960.webp';
  const photoTex = new THREE.TextureLoader().load(photoSrc, () => { photoReady = true; });
  photoTex.colorSpace = THREE.SRGBColorSpace; photoTex.anisotropy = 4;
  const photoMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { map: { value: photoTex }, size: { value: new THREE.Vector2(1, SH) }, pb: { value: PB }, pt: { value: PT }, rad: { value: R }, lift: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      uniform sampler2D map; uniform vec2 size; uniform float pb, pt, rad, lift; varying vec2 vUv;
      float sdRR(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
      void main(){
        vec4 c = texture2D(map, vUv);
        vec2 p = (vUv - 0.5) * size;
        float d = sdRR(p - vec2(0.0, (pb + pt) * 0.5), vec2(0.5, (pt - pb) * 0.5), rad);
        float clipA = p.y > pt ? 1.0 : 1.0 - smoothstep(-0.0015, 0.0015, d);
        float fade = mix(0.3, 1.0, smoothstep(pb, pb + 0.2, p.y));
        vec3 col = c.rgb * mix(vec3(1.0), vec3(0.9, 0.96, 1.08), 0.5) * (1.0 + lift * 0.05);
        gl_FragColor = vec4(col, c.a * clipA * fade);
        #include <colorspace_fragment>
      }`,
  });
  const photo = new THREE.Mesh(new THREE.PlaneGeometry(1, SH), photoMat);
  photo.position.z = .012; photo.renderOrder = 2; root.add(photo);

  /* livro */
  function makeBook() {
    const g = new THREE.Group(), Wb = .3, Hb = .42, Tb = .064;
    const vLines = canvasTex(128, 64, (c, w, h) => { c.fillStyle = '#eef0f5'; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(110,120,150,.35)'; for (let x = 0; x < w; x += 3) c.fillRect(x, 0, 1, h); });
    const hLines = canvasTex(64, 128, (c, w, h) => { c.fillStyle = '#eef0f5'; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(110,120,150,.35)'; for (let y = 0; y < h; y += 3) c.fillRect(0, y, w, 1); });
    const pv = new THREE.MeshStandardMaterial({ map: vLines, roughness: .9 }), ph = new THREE.MeshStandardMaterial({ map: hLines, roughness: .9 });
    const pages = new THREE.Mesh(new THREE.BoxGeometry(Wb - .014, Hb - .018, Tb - .014), [pv, pv, ph, ph, pv, pv]);
    pages.position.x = .004; g.add(pages);
    const cover = new THREE.MeshStandardMaterial({ color: 0x1f46c8, roughness: .48, metalness: .1 });
    const board = new RoundedBoxGeometry(Wb, Hb, .008, 2, .003);
    const f = new THREE.Mesh(board, cover); f.position.z = Tb / 2 - .004; g.add(f);
    const b = new THREE.Mesh(board, cover); b.position.z = -(Tb / 2 - .004); g.add(b);
    const spine = new THREE.Mesh(new RoundedBoxGeometry(.016, Hb, Tb, 2, .006), cover); spine.position.x = -Wb / 2 + .008; g.add(spine);
    const foilMat = new THREE.MeshBasicMaterial({ color: 0xbcd0ff, toneMapped: false });
    const foil = new THREE.Mesh(rrRing(.18, .07, .008, .0035), foilMat); foil.position.set(.012, .08, Tb / 2 + .0006); g.add(foil);
    const line = new THREE.Mesh(new THREE.PlaneGeometry(.12, .006), foilMat); line.position.set(.012, -.02, Tb / 2 + .0006); g.add(line);
    const ribbon = new THREE.Mesh(new THREE.PlaneGeometry(.016, .11), new THREE.MeshStandardMaterial({ color: 0x22d3ee, roughness: .5, side: THREE.DoubleSide, emissive: 0x22d3ee, emissiveIntensity: .2 }));
    ribbon.position.set(.07, -Hb / 2 - .045, 0); ribbon.rotation.z = .12; g.add(ribbon);
    return g;
  }
  /* halter */
  function makeDumbbell() {
    const g = new THREE.Group(), inner = new THREE.Group(); g.add(inner);
    const rubber = new THREE.MeshStandardMaterial({ color: 0x1c2338, roughness: .6, metalness: .05, flatShading: true });
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(.017, .017, .2, 24), mat.metal); handle.rotation.z = Math.PI / 2; inner.add(handle);
    for (const s of [-1, 1]) {
      const head = new THREE.Mesh(new THREE.CylinderGeometry(.072, .072, .085, 6), rubber); head.rotation.z = Math.PI / 2; head.position.x = s * .142; inner.add(head);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(.042, .042, .006, 6), mat.electric); cap.rotation.z = Math.PI / 2; cap.position.x = s * (.142 + .044); inner.add(cap);
      const collar = new THREE.Mesh(new THREE.CylinderGeometry(.026, .026, .016, 24), mat.metal); collar.rotation.z = Math.PI / 2; collar.position.x = s * .092; inner.add(collar);
    }
    g.userData.inner = inner;
    return g;
  }
  const shoe = new THREE.Group(), book = makeBook(), dumb = makeDumbbell();
  root.add(shoe, book, dumb);
  new GLTFLoader().loadAsync(import.meta.env.BASE_URL + 'models/tenis.glb').then(gltf => {
    const m = gltf.scene;
    const box = new THREE.Box3().setFromObject(m), size = box.getSize(new V3()), c = box.getCenter(new V3());
    m.position.sub(c);
    const pivot = new THREE.Group(); pivot.add(m);
    if (size.z > size.x) pivot.rotation.y = Math.PI / 2;
    pivot.scale.setScalar(.42 / Math.max(size.x, size.z));
    m.traverse(o => { if (o.isMesh) { o.material.envMapIntensity = 1; } });
    shoe.add(pivot);
  }).catch(err => console.warn('Tênis não carregou', err));

  const items = [
    { o: shoe, delay: 0, show: [-.34, -.42, .36], hide: [-.12, -.25, -.3], rot: [.35, .5, -.12], spin: 1, depth: 1, fa: .011, fw: 1.3, fp: 0, rw: .37 },
    { o: dumb, delay: .12, show: [.44, -.16, .3], hide: [.1, -.15, -.3], rot: [.3, -.55, .5], spin: -1, depth: .8, fa: .013, fw: 1.05, fp: 1.9, rw: .29 },
    { o: book, delay: .22, show: [.32, .43, -.24], hide: [.12, .05, -.3], rot: [.12, -.5, .2], spin: 1, depth: -.5, fa: .01, fw: .85, fp: 3.3, rw: .23 },
  ];

  if (window.innerWidth < 640) { for (const it of items) it.show[0] *= .8; items[1].show[1] = -.32; }
  let reveal = 0, target = false, px = 0, py = 0, tpx = 0, tpy = 0, shown3d = false;
  const setTarget = v => { target = v; stage.setAttribute('aria-pressed', String(v)); };
  stage.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') setTarget(true); });
  stage.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') { setTarget(false); tpx = 0; tpy = 0; } });
  stage.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    const r = stage.getBoundingClientRect();
    tpx = clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1);
    tpy = clamp(-(((e.clientY - r.top) / r.height) * 2 - 1), -1, 1);
  });
  let ptype = 'mouse';
  stage.addEventListener('pointerdown', e => { ptype = e.pointerType; });
  stage.addEventListener('click', () => { if (ptype !== 'mouse') setTarget(!target); });
  stage.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setTarget(!target); } });
  stage.addEventListener('focus', () => { if (!coarse) setTarget(true); });
  stage.addEventListener('blur', () => { if (!coarse) setTarget(false); });
  if (coarse) {
    let done = false;
    new IntersectionObserver(es => { for (const e of es) if (e.isIntersecting && !done) { done = true; setTimeout(() => setTarget(true), 450); } }, { threshold: .6 }).observe(stage);
  }

  addView({
    name: 'Sobre', el, scene, camera,
    update(t, dt, r) {
      reveal = target ? Math.min(1, reveal + dt / .9) : Math.max(0, reveal - dt / .55);
      if (coarse && !reduced) { tpx = Math.sin(t * .3) * .3; tpy = Math.sin(t * .23) * .2; }
      px = damp(px, reduced ? 0 : tpx, 5, dt); py = damp(py, reduced ? 0 : tpy, 5, dt);
      const S = stage.getBoundingClientRect(), u = 1 / S.width;
      const D = (r.height * u) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
      root.position.set(((S.left + S.width / 2) - (r.left + r.width / 2)) * u, -((S.top + S.height / 2) - (r.top + r.height / 2)) * u, 0);
      camera.position.set(root.position.x + px * .04, root.position.y + py * .03, D);
      camera.lookAt(root.position.x, root.position.y, 0);
      const k = smooth(reveal);
      plies.forEach(({ g, d }) => g.position.set(lerp(d.rest[0], d.open[0], k), PB + PH / 2 + lerp(d.rest[1], d.open[1], k), lerp(d.rest[2], d.open[2], k)));
      panelMat.color.setScalar(1 + .3 * k);
      photoMat.uniforms.lift.value = k;
      for (const it of items) {
        const lin = clamp((reveal - it.delay) / .72);
        const e = reduced ? smooth(lin) : outBack(lin);
        const o = it.o;
        o.visible = lin > .002;
        o.position.set(lerp(it.hide[0], it.show[0], e), lerp(it.hide[1], it.show[1], e), lerp(it.hide[2], it.show[2], e));
        if (!reduced) {
          o.position.y += Math.sin(t * it.fw + it.fp) * it.fa * lin;
          o.position.x += px * .025 * it.depth * lin; o.position.y += py * .02 * it.depth * lin;
        }
        o.scale.setScalar(Math.max(.001, lerp(.35, 1, e)));
        const spin = reduced ? 0 : (1 - lin) * Math.PI * .5 * it.spin;
        const wob = reduced ? 0 : 1;
        o.rotation.set(it.rot[0] + Math.sin(t * it.rw * 1.6 + it.fp) * .05 * wob, it.rot[1] + spin + Math.sin(t * it.rw + it.fp) * .12 * wob + px * .06, it.rot[2] + Math.sin(t * it.rw * .7 + it.fp) * .03 * wob);
      }
      if (dumb.userData.inner && !reduced) dumb.userData.inner.rotation.x = t * .25;
      if (photoReady && !shown3d) { shown3d = true; requestAnimationFrame(() => stage.classList.add('is-3d')); }
    },
  });
}

/* ---------------- EXPERIÊNCIA ---------------- */
function makeSeq() {
  const seq = document.getElementById('seq'), sticky = seq.querySelector('.seq-sticky'), el = document.getElementById('seqGl');
  const scene = new THREE.Scene(); scene.fog = new THREE.Fog(0x05070d, 3, 11);
  const camera = new THREE.PerspectiveCamera(34, 1, .02, 60);
  const L = rig(scene, { key: 3, rim: 4.5, fill: .3, env: .35 });
  L.k.position.set(-2.2, 3, 3.4); L.r.position.set(2.6, 1.6, -3);
  const spot = new THREE.SpotLight(0xdfe8ff, 22, 9, .55, .7, 1.5); spot.position.set(.8, 3.2, 1.8); scene.add(spot, spot.target);

  const IX = .04, IY = .02;
  const vest = new THREE.Group(); scene.add(vest);
  const fabric = new THREE.MeshPhysicalMaterial({ color: 0x141a2b, roughness: .85, sheen: .3, sheenColor: new THREE.Color(0xa4b6e0), sheenRoughness: .5, bumpMap: weave, bumpScale: 1.0, transparent: true });
  const fabricBack = fabric.clone(); fabricBack.color.set(0x121829);
  const webbing = new THREE.MeshStandardMaterial({ color: 0x0f1729, roughness: .9, transparent: true });
  const patchMat = new THREE.MeshStandardMaterial({ color: 0x29355a, roughness: 1, transparent: true });
  let cg = new THREE.ExtrudeGeometry(vestShape(1), { depth: .06, bevelEnabled: true, bevelThickness: .022, bevelSize: .02, bevelSegments: 4, curveSegments: 20 });
  cg.translate(0, 0, -.03); cg = toCreasedNormals(cg, Math.PI / 3);
  const front = new THREE.Mesh(cg, fabric); vest.add(front);
  const back = new THREE.Mesh(cg, fabricBack); back.position.z = -.44; back.rotation.y = Math.PI; back.scale.x = .98; vest.add(back);
  const molle = new THREE.InstancedMesh(new RoundedBoxGeometry(.1, .03, .012, 2, .004), webbing, 24);
  { let k = 0; const m4 = new THREE.Matrix4(); for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) { m4.makeTranslation(-.3 + c * .12, -.5 + r * .085, .056); molle.setMatrixAt(k++, m4); } }
  vest.add(molle);
  const patch = new THREE.Mesh(new RoundedBoxGeometry(.32, .11, .01, 2, .005), patchMat); patch.position.set(0, .2, .055); vest.add(patch);
  function strap(points, w, t, material) {
    const sh = new THREE.Shape(); sh.moveTo(-t / 2, -w / 2); sh.lineTo(t / 2, -w / 2); sh.lineTo(t / 2, w / 2); sh.lineTo(-t / 2, w / 2); sh.closePath();
    return new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { steps: 40, bevelEnabled: false, extrudePath: new THREE.CatmullRomCurve3(points.map(p => new V3(...p))) }), material);
  }
  const straps = [];
  for (const s of [-1, 1]) {
    straps.push(strap([[s * .205, .6, .035], [s * .205, .7, -.05], [s * .205, .75, -.21], [s * .205, .7, -.37], [s * .205, .6, -.45]], .11, .022, webbing));
    straps.push(strap([[s * .462, -.3, .0], [s * .56, -.3, -.09], [s * .6, -.3, -.22], [s * .56, -.3, -.35], [s * .462, -.3, -.44]], .02, .24, webbing));
  }
  straps.forEach(m => vest.add(m));

  /* pacote balístico: 8 tecido + espuma + camada final */
  const N = 10, GW = 1, GHt = 1.3;
  const mask = hole => canvasTex(256, 333, (g, w, h) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.beginPath();
    vestShape(.92).getPoints(16).forEach((p, i) => { const X = (p.x / GW + .5) * w, Y = (1 - (p.y / GHt + .5)) * h; i ? g.lineTo(X, Y) : g.moveTo(X, Y); });
    g.closePath(); g.fill();
    if (hole) { g.fillStyle = '#000'; g.beginPath(); g.arc((IX / GW + .5) * w, (1 - (IY / GHt + .5)) * h, .026 / GW * w, 0, Math.PI * 2); g.fill(); }
  }, { srgb: false });
  const maskIntact = mask(false), maskHole = mask(true);
  const pkg = new THREE.Group(); vest.add(pkg);
  const baseGeo = new THREE.PlaneGeometry(GW, GHt, 44, 57);
  const ringGeo = new THREE.RingGeometry(.026, .04, 40);
  const layers = [];
  for (let i = 0; i < N; i++) {
    const foam = i === 8;
    const geo = baseGeo.clone();
    const m = new THREE.MeshStandardMaterial({ color: foam ? 0x2b3552 : 0x7486b4, roughness: foam ? 1 : .8, transparent: i < 3, side: THREE.DoubleSide, alphaMap: maskIntact, alphaTest: .5, bumpMap: foam ? null : weave, bumpScale: .5, emissive: 0x2f6bff, emissiveIntensity: 0 });
    const mesh = new THREE.Mesh(geo, m); pkg.add(mesh);
    let scar = null;
    if (i < 3) { scar = new THREE.Mesh(ringGeo, new THREE.MeshStandardMaterial({ color: 0x4a5679, roughness: 1, side: THREE.DoubleSide, transparent: true })); scar.position.set(IX, IY, 0); scar.visible = false; mesh.add(scar); }
    layers.push({ mesh, geo, m, base: Float32Array.from(geo.attributes.position.array), A: .12 * Math.pow(1 - i / (N + 1), 1.5), s2: 2 * Math.pow(.07 + .014 * i, 2), scar });
  }
  let lastD = -1;
  function deform(D) {
    if (Math.abs(D - lastD) < .002) return; lastD = D;
    for (const Ly of layers) {
      const pos = Ly.geo.attributes.position, a = pos.array, b = Ly.base;
      for (let j = 0; j < pos.count; j++) {
        const x = b[j * 3], y = b[j * 3 + 1], dx = x - IX, dy = y - IY;
        a[j * 3 + 2] = -.05 * x * x - D * Ly.A * Math.exp(-(dx * dx + dy * dy) / Ly.s2);
      }
      pos.needsUpdate = true; Ly.geo.computeVertexNormals();
      if (Ly.scar) Ly.scar.position.z = -D * Ly.A + .0015;
    }
  }
  deform(0);
  const layerZ = gap => { const z = []; let acc = .02; for (let i = 0; i < N; i++) { z.push(acc); acc -= gap * (i === 7 || i === 8 ? 1.5 : 1); } return z; };

  /* projétil (ogiva e forma amassada como morph) */
  const prof = m => {
    const R = .016;
    const a = [[0, 0], [R * .92, 0], [R, .004], [R, .034], [R * .96, .042], [R * .84, .05], [R * .62, .056], [R * .32, .0595], [0, .06]];
    const b = [[0, 0], [R * 1.05, 0], [R * 1.3, .005], [R * 1.9, .01], [R * 2.35, .014], [R * 2.55, .017], [R * 2.3, .0195], [R * 1.5, .0215], [0, .022]];
    return (m ? b : a).map(([x, y]) => new THREE.Vector2(x, y));
  };
  const bg = new THREE.LatheGeometry(prof(0), 32), bm = new THREE.LatheGeometry(prof(1), 32);
  bg.rotateX(-Math.PI / 2); bm.rotateX(-Math.PI / 2);
  bg.morphAttributes.position = [bm.attributes.position]; bg.morphAttributes.normal = [bm.attributes.normal];
  const bullet = new THREE.Mesh(bg, new THREE.MeshStandardMaterial({ color: 0xc8834f, metalness: 1, roughness: .28 }));
  bullet.morphTargetInfluences = [0]; pkg.add(bullet);

  const trailTex = canvasTex(256, 16, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, 'rgba(160,190,255,0)'); gr.addColorStop(1, 'rgba(225,236,255,.95)'); g.fillStyle = gr; g.fillRect(0, h * .3, w, h * .4); });
  const trailMat = new THREE.MeshBasicMaterial({ map: trailTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide, fog: false });
  const trail = new THREE.Group(); trail.rotation.y = Math.PI / 2;
  for (const rx of [0, Math.PI / 2]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(1, .009), trailMat); p.rotation.x = rx; trail.add(p); }
  scene.add(trail);

  const MZ = 2.4;
  const sprite = (tex, color, s) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, toneMapped: false })); sp.scale.setScalar(s); return sp; };
  const flashGlow = sprite(glowTex, 0xffd2a0, 1), flashStar = sprite(starTex, 0xfff1dc, 1.2);
  flashGlow.position.set(IX, IY, MZ); flashStar.position.set(IX, IY, MZ); scene.add(flashGlow, flashStar);
  const flashLight = new THREE.PointLight(0xffc48a, 0, 6, 1.6); flashLight.position.set(IX, IY, MZ - .2); scene.add(flashLight);
  const hitGlow = sprite(glowTex, 0xcfe0ff, .5); hitGlow.position.set(IX, IY, .08); scene.add(hitGlow);
  const hitLight = new THREE.PointLight(0x9fbcff, 0, 2.5, 1.6); hitLight.position.set(IX, IY, .3); scene.add(hitLight);
  const retGlow = sprite(glowTex, 0x8fb2ff, .3); scene.add(retGlow);
  const retLight = new THREE.PointLight(0x9fbcff, 0, 1.6, 1.8); scene.add(retLight);
  const ring = new THREE.Mesh(new THREE.RingGeometry(.95, 1, 64), new THREE.MeshBasicMaterial({ color: 0xa8c2ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false }));
  ring.position.set(IX, IY, .062); scene.add(ring);
  const NF = 60, fDir = [], fGeo = new THREE.BufferGeometry(), fPos = new Float32Array(NF * 3);
  for (let i = 0; i < NF; i++) { const a = Math.random() * Math.PI * 2, s = .3 + Math.random() * .7; fDir.push(new V3(Math.cos(a) * s, Math.sin(a) * s, .4 + Math.random() * .9).multiplyScalar(.2 + Math.random() * .25)); }
  fGeo.setAttribute('position', new THREE.BufferAttribute(fPos, 3));
  const fibers = new THREE.Points(fGeo, new THREE.PointsMaterial({ color: 0xe3ebff, size: .012, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  scene.add(fibers);

  /* arma estilizada e desfocada: silhueta lateral, só pra indicar a origem do disparo */
  const gunTex = canvasTex(512, 256, g => {
    const shape = col => {
      g.fillStyle = col; g.strokeStyle = col;
      g.beginPath(); g.roundRect(70, 64, 410, 56, 12); g.rect(470, 82, 30, 24); g.roundRect(160, 114, 250, 30, 10); g.fill();
      g.beginPath(); g.moveTo(84, 112); g.lineTo(172, 112); g.lineTo(142, 236); g.quadraticCurveTo(138, 248, 126, 248); g.lineTo(54, 248); g.quadraticCurveTo(40, 248, 43, 235); g.closePath(); g.fill();
      g.lineWidth = 9; g.beginPath(); g.moveTo(172, 142); g.quadraticCurveTo(196, 200, 240, 170); g.lineTo(240, 144); g.stroke();
    };
    for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; g.save(); g.globalAlpha = .1; g.translate(Math.cos(a) * 7, Math.sin(a) * 7); shape('#3c4870'); g.restore(); }
    g.globalAlpha = .8; shape('#2b3554');
    g.globalAlpha = .6; g.strokeStyle = '#6b95ff'; g.lineWidth = 6; g.beginPath(); g.moveTo(96, 68); g.lineTo(470, 68); g.stroke();
  });
  const gunMat = new THREE.MeshBasicMaterial({ map: gunTex, transparent: true, depthWrite: false, toneMapped: false, fog: false, side: THREE.DoubleSide });
  const gun = new THREE.Mesh(new THREE.PlaneGeometry(1, .5), gunMat);
  gun.rotation.y = Math.PI / 2; scene.add(gun);
  const gunZ = MZ + .477 + .03, gunY = IY - (.5 - 94 / 256) * .5;

  /* trajeto da câmera: 8 fases */
  const KT = [0, .08, .17, .25, .34, .42, .45, .52, .64, .76, .86, 1];
  const KP = [[1.5, .35, 2.35], [0, .12, 2.6], [3.2, .45, 1.6], [3.0, .4, 1.65], [1.1, .2, 2.0], [.9, .18, 1.2], [.8, .22, 1.05], [1.2, .35, 1.5], [1.9, .75, 1.9], [1.45, .42, 1.45], [1.2, .34, 1.15], [2.7, .95, 2.5]];
  const KL = [[0, .02, 0], [0, .04, 0], [0, .05, 1.5], [0, .05, 1.45], [.05, .04, 1.5], [.05, .04, .6], [.05, .03, .05], [.03, .02, 0], [0, 0, -.3], [.07, .02, -.18], [.08, .02, -.2], [0, -.05, -.35]];
  const KW = [.6, .6, 1, 1, .7, .4, .3, .5, 1, .15, .1, 1];
  const cp = new THREE.CatmullRomCurve3(KP.map(p => new V3(...p)), false, 'centripetal');
  const cl = new THREE.CatmullRomCurve3(KL.map(p => new V3(...p)), false, 'centripetal');
  const seg = p => { let k = 0; while (k < KT.length - 2 && p > KT[k + 1]) k++; const u = (p - KT[k]) / (KT[k + 1] - KT[k]); return { k, u, s: (k + u) / (KT.length - 1) }; };

  const steps = [...document.querySelectorAll('#steps button')];
  const caps = [
    ['O colete', 'O painel frontal, com as camadas balísticas por dentro.'],
    ['A arma', 'Estilizada e fora de foco, só pra mostrar de onde vem o disparo.'],
    ['Disparo', 'O clarão marca o começo da trajetória.'],
    ['Trajetória', 'O projétil em câmera lenta até a superfície.'],
    ['Impacto', 'O impacto se espalha pela área atingida.'],
    ['Camadas', 'O painel se abre: tecido, espuma e camada final.'],
    ['Retenção', 'O projétil fica preso nas primeiras camadas.'],
    ['Resultado', 'As camadas da frente deformam e seguram. A última fica intacta.'],
  ];
  const phaseStart = [0, .10, .20, .25, .45, .52, .68, .86];
  const capT = document.getElementById('capT'), capP = document.getElementById('capP'), bar = document.getElementById('bar');
  const curtain = document.getElementById('seqCurtain'), ui = seq.querySelector('.seq-ui'), labelsEl = document.getElementById('seqLabels');
  const END = .88;
  let phase = -1;
  steps.forEach(b => b.addEventListener('click', () => {
    const r = seq.getBoundingClientRect(), top = window.scrollY + r.top, span = seq.offsetHeight - sticky.offsetHeight;
    window.scrollTo({ top: top + Number(b.dataset.p) * span, behavior: reduced ? 'auto' : 'smooth' });
  }));
  const labels = Object.fromEntries([...document.querySelectorAll('#seqLabels .lbl')].map(n => [n.dataset.a, n]));

  let p = 0, intro = 0, started = false, mult = 1;
  const tmp = new V3(), tgt = new V3(), bw = new V3();
  addView({
    name: 'Experiência', el, scene, camera,
    onAspect(a) { mult = a < 1.3 ? clamp(1.3 / a, 1, 2.4) : 1; camera.fov = a < 1 ? 40 : 34; },
    update(t, dt, r) {
      const sr = seq.getBoundingClientRect(), span = sr.height - sticky.offsetHeight;
      const raw = clamp(-sr.top / span);
      p = window.__snap ? raw : damp(p, raw, 6, dt);
      if (sr.top < H * .7) started = true;
      if (started) intro = window.__snap || reduced ? 1 : Math.min(1, intro + dt / 1.6);
      /* a animação usa 88% da rolagem; o resto apaga as luzes e fecha a cena antes da experiência entrar */
      const P = clamp(p / END), ki = outCubic(intro);
      const out = smooth(range(p, .9, .96)), lit = 1 - out;
      ui.style.opacity = labelsEl.style.opacity = (1 - smooth(range(p, .88, .93))).toFixed(3);
      curtain.style.opacity = smooth(range(p, .94, 1)).toFixed(3);

      const retK = smooth(range(P, .68, .74)) * (1 - .45 * smooth(range(P, .88, .96)));
      const dim = (1 - .55 * range(P, .14, .22) * (1 - range(P, .5, .6))) * (1 - .55 * retK);
      L.k.intensity = L.base.key * ki * dim * lit; L.r.intensity = L.base.rim * ki * lit; spot.intensity = 22 * ki * dim * lit;
      scene.environmentIntensity = .35 * ki * (1 - .5 * retK) * lit;
      vest.position.y = lerp(-.2, 0, ki);
      vest.rotation.y = lerp(-.7, 0, ki);

      const ga = smooth(range(P, .1, .17)) * (1 - range(P, .3, .36));
      const fl = reduced ? 0 : bump(P, .225, .012);
      gun.visible = ga > .002; gunMat.opacity = ga;
      gun.position.set(IX, gunY, gunZ + (1 - ga) * .5 + (reduced ? 0 : bump(P, .232, .012) * .07));
      flashGlow.material.opacity = fl; flashGlow.scale.setScalar(.3 + fl * 1.1); flashStar.scale.setScalar(.2 + fl * .75); flashStar.material.opacity = fl * .7;
      flashStar.material.rotation = P * 30; flashLight.intensity = fl * 30;

      const ex = smooth(range(P, .52, .64)), gap = lerp(.0045, .085, ex), z = layerZ(gap);
      const D = smooth(range(P, .45, .5)); deform(D);
      const w = range(P, .7, .84) * 12;
      layers.forEach((Ly, i) => {
        Ly.mesh.position.set(i * .012 * ex, -i * .006 * ex, z[i]);
        if (i < 3) {
          const hole = P > .462; if ((Ly.m.alphaMap === maskHole) !== hole) Ly.m.alphaMap = hole ? maskHole : maskIntact; Ly.scar.visible = hole;
          Ly.m.opacity = 1 - .7 * smooth(range(P, .68, .74)); Ly.scar.material.opacity = Ly.m.opacity; Ly.scar.visible = hole && Ly.m.opacity > .6;
        }
        Ly.m.emissiveIntensity = (reduced ? .5 : 1) * 1.8 * Math.exp(-((w - i) ** 2) / 1.5) * (1 - i / 12) * (P > .7 && P < .9 ? 1 : 0);
      });

      const fade = range(P, .52, .6);
      fabric.opacity = 1 - fade * .9; fabric.depthWrite = fade < .02;
      for (const m of [fabricBack, webbing, patchMat]) { m.opacity = 1 - fade; m.depthWrite = fade < .02; }
      back.visible = molle.visible = patch.visible = fade < .99;
      straps.forEach(s => s.visible = fade < .99);

      const Lm = .022, front = .052, start = MZ;
      const retZ = z[3] - layers[3].A * D + Lm + .003;
      let zb, morph = 0;
      if (P < .45) zb = lerp(start, front + .06, range(P, .23, .45));
      else { const k = smooth(range(P, .45, .52)); zb = lerp(front + .06, retZ, k); morph = smooth(range(P, .45, .5)); }
      bullet.visible = P > .226;
      bullet.position.set(IX + .012 * ex * 3, IY - .006 * ex * 3, zb);
      bullet.morphTargetInfluences[0] = morph;
      bullet.rotation.z = P * 14;

      const tl = clamp(start - zb, 0, .7), tv = P > .226 && P < .47 ? 1 - range(P, .44, .47) : 0;
      trail.visible = tv > 0; trail.scale.set(Math.max(.001, tl), 1, 1); trail.position.set(IX, IY, zb + .06 + tl / 2); trailMat.opacity = tv * .7;

      const hg = reduced ? 0 : bump(P, .455, .012);
      hitGlow.material.opacity = hg * .8; hitGlow.scale.setScalar(.12 + hg * .45); hitLight.intensity = hg * 3.5;
      const rr = range(P, .45, .54);
      ring.visible = rr > 0 && rr < 1; ring.scale.setScalar(.02 + outCubic(rr) * .32); ring.material.opacity = (1 - rr) * .8;
      const fr = range(P, .45, .53);
      fibers.visible = fr > 0 && fr < 1;
      for (let i = 0; i < NF; i++) { const d = fDir[i]; fPos[i * 3] = IX + d.x * outCubic(fr); fPos[i * 3 + 1] = IY + d.y * outCubic(fr) - fr * fr * .05; fPos[i * 3 + 2] = .06 + d.z * outCubic(fr); }
      fGeo.attributes.position.needsUpdate = true; fibers.material.opacity = 1 - fr;

      vest.updateMatrixWorld();
      bullet.getWorldPosition(bw);
      const pulse = reduced ? 1 : .85 + .15 * Math.sin(t * 3);
      retGlow.position.copy(bw); retGlow.material.opacity = retK * .75 * pulse * lit; retGlow.scale.setScalar(.15 + retK * .3);
      retLight.position.copy(bw).add(tmp.set(.15, .12, .25)); retLight.intensity = retK * 1.5 * lit;
      spot.target.position.copy(bw).multiplyScalar(retK); spot.intensity += retK * 5 * lit;

      const { k, u, s } = seg(P);
      cp.getPoint(s, tmp); cl.getPoint(s, tgt);
      const wv = lerp(KW[k], KW[k + 1], u), mm = 1 + (mult - 1) * wv;
      tmp.sub(tgt).multiplyScalar(mm).add(tgt);
      if (!reduced) { const sh = bump(P, .465, .02) * .01; tmp.x += Math.sin(t * 61) * sh; tmp.y += Math.sin(t * 47 + 1) * sh; }
      camera.position.copy(tmp); camera.lookAt(tgt);
      scene.fog.near = 2.6 * mm; scene.fog.far = 10 * mm;

      let ph = 0; for (let i = 0; i < phaseStart.length; i++) if (P >= phaseStart[i] - .001) ph = i;
      if (ph !== phase) {
        phase = ph; capT.textContent = caps[ph][0]; capP.textContent = caps[ph][1];
        steps.forEach((b, i) => { b.removeAttribute('aria-current'); b.classList.toggle('done', i < ph); if (i === ph) b.setAttribute('aria-current', 'step'); });
      }
      bar.style.width = (P * 100).toFixed(1) + '%';

      const lab = (n, v, vis) => {
        n.style.opacity = vis.toFixed(3);
        if (vis <= 0) return;
        tmp.copy(v).applyMatrix4(pkg.matrixWorld).project(camera);
        n.style.transform = `translate(${((tmp.x + 1) / 2 * r.width).toFixed(1)}px, ${((1 - tmp.y) / 2 * r.height - 10).toFixed(1)}px)`;
      };
      const lv = Math.max(range(P, .58, .62) * (1 - range(P, .66, .69)), range(P, .9, .95));
      lab(labels.tecido, new V3(.43, .22, z[2]), lv);
      lab(labels.espuma, new V3(.45, -.12, z[8]), lv);
      lab(labels.final, new V3(.42, -.42, z[9]), lv);
      lab(labels.projetil, new V3(IX + .05, IY - .04, retZ - .01), range(P, .72, .76) * (1 - range(P, .88, .9)));
    },
  });
}

/* ---------------- PROJETOS ---------------- */
function projectKit() {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(30, 4 / 3, .05, 40);
  const L = rig(scene, { key: 2.6, rim: 4.5, fill: .4, env: .5 });
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 3.6), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, toneMapped: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = .001; scene.add(shadow);
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.38, 1.4, 128), new THREE.MeshBasicMaterial({ color: 0x2f6bff, transparent: true, opacity: .75, toneMapped: false, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = .002; scene.add(ring);
  const root = new THREE.Group(); scene.add(root);
  return { scene, camera, root, L };
}
function projectView(id, build, { dist = 5, look = [0, .35, 0] } = {}) {
  const stage = document.querySelector(`[data-scene="${id}"]`), el = stage.querySelector('.proj-gl');
  const kit = projectKit(), s = build(kit, stage);
  let started = false;
  new IntersectionObserver(es => { for (const e of es) if (e.isIntersecting && !started) { started = true; s.play(); } }, { threshold: .45 }).observe(stage);
  stage.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse' && started) s.hover(true); });
  stage.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') s.hover(false); });
  let ptype = 'mouse';
  stage.addEventListener('pointerdown', e => { ptype = e.pointerType; });
  stage.addEventListener('click', e => { if (e.target.closest('.replay')) return; if (ptype !== 'mouse') s.tap(); });
  stage.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); s.tap(); } });
  stage.querySelector('.replay')?.addEventListener('click', () => { started = true; s.play(); });
  const lookV = new V3(...look), baseAz = Math.atan2(1, 1.15), el0 = .52;
  addView({
    name: stage.dataset.name, el, scene: kit.scene, camera: kit.camera,
    update(t, dt) {
      const az = baseAz;
      const c = kit.camera;
      c.position.set(Math.sin(az) * Math.cos(el0) * dist, Math.sin(el0) * dist + look[1], Math.cos(az) * Math.cos(el0) * dist);
      c.lookAt(lookV);
      s.update(t, dt);
    },
  });
}

/* Blintec: rolos, enfesto, marcação e corte */
function buildBlintec({ root }) {
  const table = new THREE.Mesh(new RoundedBoxGeometry(2.5, .08, 1.4, 3, .025), mat.graphite); table.position.y = .04; root.add(table);
  const TOP = .08, SL = 1.8, SW = 1.0, SX = .28, NL = 6;
  const sheets = [];
  for (let k = 0; k < NL; k++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(SL, SW), k % 2 ? mat.fabric2 : mat.fabric);
    m.rotation.x = -Math.PI / 2; m.position.set(SX + (Math.sin(k * 7.3) * .006), TOP + .007 * (k + 1), Math.cos(k * 3.1) * .006);
    m.visible = false; root.add(m); sheets.push(m);
  }
  const spiral = (col, edge) => canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = col; g.fillRect(0, 0, w, h); g.strokeStyle = edge; g.lineWidth = 1.2; g.beginPath();
    for (let a = 0; a < Math.PI * 2 * 9; a += .05) { const rr = 18 + a * 1.6; g.lineTo(64 + Math.cos(a) * rr, 64 + Math.sin(a) * rr); }
    g.stroke(); g.fillStyle = '#3a4562'; g.beginPath(); g.arc(64, 64, 16, 0, 7); g.fill(); g.fillStyle = '#0b0f1a'; g.beginPath(); g.arc(64, 64, 9, 0, 7); g.fill();
  });
  function makeRoll(body) {
    const g = new THREE.Group();
    const side = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 48, 1, true), body); side.rotation.x = Math.PI / 2; g.add(side);
    const endMat = new THREE.MeshStandardMaterial({ map: spiral(body === mat.fabric ? '#b4c1e0' : '#9caed6', 'rgba(60,72,110,.45)'), roughness: .8 });
    for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.CircleGeometry(1, 48), endMat); e.position.z = s * .5; e.rotation.y = s > 0 ? 0 : Math.PI; g.add(e); }
    root.add(g); return g;
  }
  const r0 = .13;
  const rolls = [makeRoll(mat.fabric), makeRoll(mat.fabric2), makeRoll(mat.fabric)];
  const stack = [[-1.07, TOP + r0], [-.81, TOP + r0], [-.94, TOP + r0 * 2.75]];
  const scanMat = new THREE.MeshBasicMaterial({ color: 0x9fbcff, transparent: true, blending: THREE.AdditiveBlending, toneMapped: false, depthWrite: false });
  const scan = new THREE.Mesh(new THREE.BoxGeometry(.012, .012, SW + .1), scanMat); root.add(scan);
  const scanGlow = new THREE.Mesh(new THREE.PlaneGeometry(.14, SW + .1), new THREE.MeshBasicMaterial({ map: canvasTex(64, 8, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, 'rgba(47,107,255,0)'); gr.addColorStop(.5, 'rgba(107,149,255,.8)'); gr.addColorStop(1, 'rgba(47,107,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }), transparent: true, blending: THREE.AdditiveBlending, toneMapped: false, depthWrite: false }));
  scanGlow.rotation.x = -Math.PI / 2; root.add(scanGlow);
  const pieces = [-.25, .3, .85].map((x, i) => {
    const g = new THREE.Group();
    const shp = vestShape(.62);
    const fill = new THREE.Mesh(new THREE.ShapeGeometry(shp, 12), new THREE.MeshStandardMaterial({ color: 0xdbe3f6, roughness: .7, bumpMap: weave, bumpScale: .4, transparent: true, emissive: 0x2f6bff, emissiveIntensity: 0 }));
    const line = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(shp.getPoints(14)), new THREE.LineBasicMaterial({ color: 0xa9c4ff, transparent: true, toneMapped: false }));
    line.position.z = .002; g.add(fill, line);
    g.rotation.x = -Math.PI / 2; g.rotation.z = i % 2 ? Math.PI : 0; g.position.set(x, 0, 0); root.add(g);
    return { g, fill, line, x };
  });
  let st = 99, hoverWanted = false;
  const DUR = 6.4;
  function pose(t) {
    rolls.forEach((rl, i) => {
      const e = outCubic(clamp((t - i * .22) / .7));
      const [x, y] = stack[i];
      rl.position.set(lerp(-2.4, x, e), y, i === 2 ? 0 : (i ? -.06 : .06));
      rl.rotation.z = -(rl.position.x - x) / r0;
      rl.scale.set(r0, r0, SW + .04);
    });
    const passT = .38, t0 = 1.1;
    let rx = rolls[2].position.x, ry = rolls[2].position.y, rrad = r0, rotz = 0;
    const lift = clamp((t - .8) / .3);
    if (t > .8) { rx = lerp(stack[2][0], SX - SL / 2, smooth(lift)); ry = lerp(stack[2][1], TOP + .007 + r0, smooth(lift)); }
    sheets.forEach((sh, k) => {
      const ts = t - t0 - k * passT, f = clamp(ts / passT), dir = k % 2 ? -1 : 1;
      sh.visible = ts > 0;
      sh.scale.x = Math.max(.001, f);
      const startX = SX - dir * SL / 2;
      sh.position.x = startX + dir * SL * f / 2;
      if (ts > 0 && ts <= passT + .001) { rrad = r0 - .008 * k; rx = startX + dir * SL * f; ry = TOP + .007 * (k + 1) + rrad; rotz = -dir * (SL * f) / rrad; }
      if (k === NL - 1 && ts > passT) { rrad = r0 - .008 * k; rx = startX + dir * SL; ry = TOP + .007 * (k + 1) + rrad; }
    });
    rolls[2].position.set(rx, ry, 0); rolls[2].scale.set(rrad, rrad, SW + .04); if (rotz) rolls[2].rotation.z = rotz;
    const topY = TOP + .007 * NL + .002;
    const ts = t - (t0 + NL * passT + .2), sx = lerp(SX - SL / 2 - .05, SX + SL / 2 + .05, clamp(ts / 1.1));
    const sv = ts > 0 && ts < 1.3 ? 1 - range(ts, 1.1, 1.3) : 0;
    scan.visible = scanGlow.visible = sv > 0; scan.position.set(sx, topY + .006, 0); scanGlow.position.set(sx, topY + .003, 0); scanMat.opacity = sv; scanGlow.material.opacity = sv;
    const cutT = t - (t0 + NL * passT + 1.6);
    pieces.forEach((pc, i) => {
      const vis = smooth(clamp((sx - (pc.x - .3)) / .3)) * (ts > 0 ? 1 : 0);
      pc.line.material.opacity = vis; pc.fill.material.opacity = cutT > 0 ? smooth(clamp(cutT / .3)) : vis * .25;
      pc.g.visible = vis > 0;
      const lf = outBack(clamp((cutT - i * .12) / .5));
      pc.g.position.y = topY + (cutT > 0 ? lf * .07 : 0);
      pc.fill.material.emissiveIntensity = cutT > 0 ? .35 * bump(cutT - i * .12, .4, .25) : 0;
    });
  }
  pose(0);
  return {
    play() { st = reduced ? DUR : 0; },
    hover(on) { hoverWanted = on; if (on && st > DUR) st = 0; },
    tap() { st = 0; },
    update(t, dt) { if (st < 90) st += dt; pose(Math.min(st, DUR + 2)); },
  };
}

/* EmprestaCampus: notebook e cadeado */
function buildCampus({ root }) {
  const shell = new THREE.MeshStandardMaterial({ color: 0x2a3352, metalness: .7, roughness: .36 });
  const base = new THREE.Mesh(new RoundedBoxGeometry(1.6, .06, 1.05, 3, .02), shell); base.position.y = .03; root.add(base);
  const deck = new THREE.Mesh(new THREE.PlaneGeometry(1.4, .52), new THREE.MeshStandardMaterial({ color: 0x0e1322, roughness: .8 })); deck.rotation.x = -Math.PI / 2; deck.position.set(0, .0605, -.1); root.add(deck);
  const keys = new THREE.InstancedMesh(new RoundedBoxGeometry(.082, .014, .078, 1, .006), new THREE.MeshStandardMaterial({ color: 0x1c2440, roughness: .6, metalness: .2 }), 56);
  { let k = 0; const m4 = new THREE.Matrix4(); for (let r = 0; r < 4; r++) for (let c = 0; c < 14; c++) { m4.makeTranslation(-.62 + c * .0955, .066, -.31 + r * .1); keys.setMatrixAt(k++, m4); } }
  root.add(keys);
  const space = new THREE.Mesh(new RoundedBoxGeometry(.5, .014, .078, 1, .006), keys.material); space.position.set(0, .066, .09); root.add(space);
  const pad = new THREE.Mesh(new THREE.PlaneGeometry(.46, .24), new THREE.MeshStandardMaterial({ color: 0x232c48, roughness: .5, metalness: .3 })); pad.rotation.x = -Math.PI / 2; pad.position.set(0, .061, .33); root.add(pad);
  const hinge = new THREE.Group(); hinge.position.set(0, .06, -.525); root.add(hinge);
  const lid = new THREE.Mesh(new RoundedBoxGeometry(1.6, .035, 1.03, 3, .015), shell); lid.position.set(0, .0175, .515); hinge.add(lid);
  const sc = document.createElement('canvas'); sc.width = 640; sc.height = 400;
  const scTex = new THREE.CanvasTexture(sc); scTex.colorSpace = THREE.SRGBColorSpace; scTex.anisotropy = 4;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.46, .9), new THREE.MeshBasicMaterial({ map: scTex, toneMapped: false }));
  screen.rotation.x = Math.PI / 2; screen.position.set(0, -.0008, .5); hinge.add(screen);
  function drawScreen(filled, ok) {
    const g = sc.getContext('2d'), w = 640, h = 400;
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#0d1430'); gr.addColorStop(1, '#141c33'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(47,107,255,.18)'; g.fillRect(0, 0, w, 44);
    g.fillStyle = '#eef2ff'; g.font = '600 20px Inter, system-ui, sans-serif'; g.fillText('EmprestaCampus', 24, 29);
    g.fillStyle = '#0b1020'; g.strokeStyle = '#24304f'; g.lineWidth = 2;
    g.beginPath(); g.roundRect(150, 78, 340, 270, 18); g.fill(); g.stroke();
    if (!ok) {
      g.fillStyle = '#eef2ff'; g.font = '600 22px Inter, system-ui, sans-serif'; g.textAlign = 'center'; g.fillText('Verificação em 2 etapas', 320, 132);
      g.fillStyle = '#94a3b8'; g.font = '16px Inter, system-ui, sans-serif'; g.fillText('Digite o código do app', 320, 160);
      for (let i = 0; i < 6; i++) {
        const x = 180 + i * 48;
        g.fillStyle = i < filled ? 'rgba(47,107,255,.25)' : '#141c33'; g.strokeStyle = i < filled ? '#6b95ff' : '#24304f';
        g.beginPath(); g.roundRect(x, 198, 40, 52, 8); g.fill(); g.stroke();
        if (i < filled) { g.fillStyle = '#eef2ff'; g.beginPath(); g.arc(x + 20, 224, 6, 0, 7); g.fill(); }
      }
      g.fillStyle = filled === 6 ? '#2962f2' : '#24304f'; g.beginPath(); g.roundRect(180, 280, 280, 44, 10); g.fill();
      g.fillStyle = '#fff'; g.font = '600 17px Inter, system-ui, sans-serif'; g.fillText('Entrar', 320, 308);
    } else {
      g.fillStyle = 'rgba(34,197,94,.15)'; g.beginPath(); g.arc(320, 170, 46, 0, 7); g.fill();
      g.strokeStyle = '#22c55e'; g.lineWidth = 7; g.lineCap = 'round'; g.beginPath(); g.moveTo(298, 170); g.lineTo(314, 186); g.lineTo(344, 154); g.stroke();
      g.fillStyle = '#eef2ff'; g.font = '600 24px Inter, system-ui, sans-serif'; g.textAlign = 'center'; g.fillText('Acesso liberado', 320, 260);
      g.fillStyle = '#94a3b8'; g.font = '16px Inter, system-ui, sans-serif'; g.fillText('Sessão protegida por TLS', 320, 290);
    }
    g.textAlign = 'left'; scTex.needsUpdate = true;
  }
  let drawn = '';
  const lock = new THREE.Group(); lock.position.set(-.92, .5, .3); root.add(lock);
  const body = new THREE.Mesh(new RoundedBoxGeometry(.34, .28, .13, 3, .04), new THREE.MeshStandardMaterial({ color: 0x2f6bff, metalness: .6, roughness: .28 })); lock.add(body);
  const holeMat = new THREE.MeshBasicMaterial({ color: 0x6b95ff, toneMapped: false });
  const hole = new THREE.Mesh(new THREE.CircleGeometry(.026, 24), holeMat); hole.position.set(0, .02, .066); lock.add(hole);
  const slot = new THREE.Mesh(new THREE.PlaneGeometry(.014, .05), holeMat); slot.position.set(0, -.02, .066); lock.add(slot);
  const shackle = new THREE.Group(); shackle.position.set(-.095, .14, 0); lock.add(shackle);
  const legGeo = new THREE.CylinderGeometry(.022, .022, .2, 20);
  const l1 = new THREE.Mesh(legGeo, mat.metal); l1.position.set(0, .04, 0); shackle.add(l1);
  const l2 = new THREE.Mesh(legGeo, mat.metal); l2.position.set(.19, .04, 0); shackle.add(l2);
  const arc = new THREE.Mesh(new THREE.TorusGeometry(.095, .022, 14, 36, Math.PI), mat.metal); arc.position.set(.095, .14, 0); shackle.add(arc);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0x22c55e, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); glow.scale.setScalar(.5); glow.position.set(0, 0, .08); lock.add(glow);
  let st = 99;
  const green = new THREE.Color(0x22c55e), blue = new THREE.Color(0x6b95ff);
  function pose(t) {
    const open = inOut(clamp(t / 1.1));
    hinge.rotation.x = -1.9 * open;
    const on = clamp((t - .8) / .4);
    screen.material.color.setScalar(on);
    const filled = Math.max(0, Math.min(6, Math.floor((t - 1.6) / .2) + 1));
    const ok = t > 3.35;
    const key = (t < .8 ? 'off' : '') + filled + ok;
    if (key !== drawn) { drawn = key; drawScreen(t < 1.6 ? 0 : filled, ok); }
    const ls = outBack(clamp((t - 1.2) / .4));
    lock.scale.setScalar(Math.max(.001, ls)); lock.visible = ls > .002;
    const up = outCubic(clamp((t - 3.0) / .25)), sw = inOut(clamp((t - 3.25) / .35));
    shackle.position.y = .14 + up * .075; shackle.rotation.y = -1.15 * sw;
    const u = clamp((t - 3.1) / .3);
    holeMat.color.copy(blue).lerp(green, u);
    glow.material.opacity = u * .7;
    lock.rotation.y = .45;
  }
  pose(0); screen.material.color.setScalar(0);
  return {
    play() { st = reduced ? 9 : 0; },
    hover(on) { if (on && st > 4) st = 1.45; },
    tap() { st = st > 4 ? 1.45 : st; },
    update(t, dt) { if (st < 90) st += dt; pose(Math.min(st, 9)); },
  };
}

/* TempGuard: ESP32, DHT22, LEDs e buzzer */
function buildEsp({ root }, stage) {
  const pcb = new THREE.Mesh(new RoundedBoxGeometry(2.0, .05, 1.25, 3, .02), new THREE.MeshStandardMaterial({ color: 0x0c1631, roughness: .45, metalness: .25 })); pcb.position.y = .025; root.add(pcb);
  const tr = canvasTex(512, 320, (g, w, h) => {
    const X = x => (x / 2 + .5) * w, Z = z => (z / 1.25 + .5) * h;
    g.clearRect(0, 0, w, h); g.strokeStyle = 'rgba(107,149,255,.55)'; g.lineWidth = 3; g.lineJoin = 'round';
    const path = pts => { g.beginPath(); pts.forEach(([x, z], i) => i ? g.lineTo(X(x), Z(z)) : g.moveTo(X(x), Z(z))); g.stroke(); };
    path([[.24, -.1], [-.2, -.1], [-.2, -.2], [-.48, -.2]]);
    path([[.24, .02], [-.05, .02], [-.05, .3], [-.05, .38]]);
    path([[.24, .1], [-.2, .1], [-.25, .3], [-.25, .38]]);
    path([[.24, .18], [-.3, .18], [-.45, .3], [-.45, .38]]);
    path([[.24, .26], [.1, .26], [.1, .5], [-.62, .5], [-.62, .45]]);
    g.fillStyle = 'rgba(214,180,90,.9)';
    [[-.48, -.2], [-.05, .38], [-.25, .38], [-.45, .38], [-.62, .45]].forEach(([x, z]) => { g.beginPath(); g.arc(X(x), Z(z), 5, 0, 7); g.fill(); });
  }, { srgb: true });
  const traces = new THREE.Mesh(new THREE.PlaneGeometry(1.96, 1.21), new THREE.MeshBasicMaterial({ map: tr, transparent: true, toneMapped: false })); traces.rotation.x = -Math.PI / 2; traces.position.y = .0505; root.add(traces);
  const dev = new THREE.Mesh(new RoundedBoxGeometry(.62, .03, 1.0, 2, .01), new THREE.MeshStandardMaterial({ color: 0x090c15, roughness: .5 })); dev.position.set(.55, .065, 0); root.add(dev);
  const can = new THREE.Mesh(new RoundedBoxGeometry(.4, .045, .46, 2, .01), new THREE.MeshStandardMaterial({ color: 0xc7cfdd, metalness: 1, roughness: .32 })); can.position.set(.55, .1, -.16); root.add(can);
  const ant = new THREE.Mesh(new THREE.PlaneGeometry(.4, .1), new THREE.MeshStandardMaterial({ color: 0x1e2a4a, roughness: .5 })); ant.rotation.x = -Math.PI / 2; ant.position.set(.55, .081, -.43); root.add(ant);
  const pins = new THREE.InstancedMesh(new THREE.BoxGeometry(.03, .05, .03), new THREE.MeshStandardMaterial({ color: 0xd6b45a, metalness: 1, roughness: .3 }), 28);
  { let k = 0; const m4 = new THREE.Matrix4(); for (const s of [-1, 1]) for (let i = 0; i < 14; i++) { m4.makeTranslation(.55 + s * .27, .095, -.42 + i * .065); pins.setMatrixAt(k++, m4); } }
  root.add(pins);
  const dht = new THREE.Group(); dht.position.set(-.55, .05, -.2); root.add(dht);
  const dbody = new THREE.Mesh(new RoundedBoxGeometry(.3, .38, .12, 3, .02), new THREE.MeshStandardMaterial({ color: 0xe6ebf4, roughness: .55 })); dbody.position.y = .25; dht.add(dbody);
  const grid = canvasTex(128, 160, (g, w, h) => { g.fillStyle = '#e6ebf4'; g.fillRect(0, 0, w, h); g.fillStyle = '#9aa6bf'; for (let r = 0; r < 7; r++) for (let c = 0; c < 4; c++) { g.beginPath(); g.roundRect(14 + c * 27, 14 + r * 19, 19, 11, 4); g.fill(); } });
  const face = new THREE.Mesh(new THREE.PlaneGeometry(.26, .32), new THREE.MeshStandardMaterial({ map: grid, roughness: .6 })); face.position.set(0, .26, .0605); dht.add(face);
  for (let i = 0; i < 4; i++) { const leg = new THREE.Mesh(new THREE.BoxGeometry(.012, .07, .012), mat.metal); leg.position.set(-.075 + i * .05, .035, 0); dht.add(leg); }
  const buz = new THREE.Mesh(new THREE.CylinderGeometry(.11, .11, .1, 40), new THREE.MeshStandardMaterial({ color: 0x0b0e16, roughness: .4 })); buz.position.set(-.62, .1, .42); root.add(buz);
  const buzHole = new THREE.Mesh(new THREE.CircleGeometry(.025, 20), new THREE.MeshBasicMaterial({ color: 0x000000 })); buzHole.rotation.x = -Math.PI / 2; buzHole.position.set(-.62, .1505, .42); root.add(buzHole);
  const ledCols = [0x22c55e, 0xfacc15, 0xef4444];
  const leds = [-.45, -.25, -.05].map((x, i) => {
    const g = new THREE.Group(); g.position.set(x, .05, .38); root.add(g);
    const m = new THREE.MeshStandardMaterial({ color: new THREE.Color(ledCols[i]).multiplyScalar(.35), roughness: .25, metalness: 0, emissive: ledCols[i], emissiveIntensity: 0, transparent: true, opacity: .92 });
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(.045, .05, .07, 24), m); cyl.position.y = .075; g.add(cyl);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(.045, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), m); dome.position.y = .11; g.add(dome);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(.056, .056, .012, 24), m); rim.position.y = .045; g.add(rim);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: ledCols[i], transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, opacity: 0 })); halo.position.y = .12; halo.scale.setScalar(.5); g.add(halo);
    const light = new THREE.PointLight(ledCols[i], 0, 1.4, 2); light.position.y = .2; g.add(light);
    return { m, halo, light, v: 0 };
  });
  const ringMat = () => new THREE.MeshBasicMaterial({ color: 0x6b95ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
  const pulses = [0, 1, 2].map(() => { const r = new THREE.Mesh(new THREE.RingGeometry(.96, 1, 64), ringMat()); r.rotation.x = -Math.PI / 2; r.position.set(-.55, .056, -.2); root.add(r); return r; });
  const waves = [0, 1, 2].map(() => { const r = new THREE.Mesh(new THREE.RingGeometry(.94, 1, 64), ringMat()); r.material.color.set(0xff8a8a); r.rotation.x = -Math.PI / 2; r.position.set(-.62, .152, .42); root.add(r); return r; });
  const chipVal = document.getElementById('tempVal'), chipDot = document.getElementById('tempDot');
  let running = false, st = 0, temp = 24, heat = false;
  const fmt = v => v.toFixed(1).replace('.', ',') + ' °C';
  return {
    play() { running = true; st = 0; temp = 24; },
    hover(on) { heat = on; },
    tap() { heat = !heat; running = true; },
    update(t, dt) {
      if (running) st += dt;
      const cyc = st % 9.5;
      const tgt = heat ? 38.5 : (running && cyc < 5.6 ? 38 : 24);
      temp = reduced && running ? (heat ? 38.5 : 31) : damp(temp, tgt, heat ? 1.1 : (tgt > temp ? .55 : .8), dt);
      chipVal.textContent = fmt(temp);
      const state = temp >= 34 ? 2 : temp >= 30 ? 1 : 0;
      chipDot.style.background = ['#22c55e', '#facc15', '#ef4444'][state];
      leds.forEach((L, i) => {
        L.v = damp(L.v, i === state && running ? 1 : 0, 12, dt);
        const blink = i === 2 && !reduced ? .75 + .25 * Math.sin(t * 12) : 1;
        L.m.emissiveIntensity = L.v * 2.6 * blink; L.halo.material.opacity = L.v * .9 * blink; L.light.intensity = L.v * 2.2 * blink;
      });
      pulses.forEach((r, i) => {
        const ph = ((t * .9 + i / 3) % 1);
        const a = running && !reduced ? 1 : 0;
        r.scale.setScalar(.12 + ph * .55); r.material.opacity = (1 - ph) * .7 * a;
      });
      waves.forEach((r, i) => {
        const ph = ((t * 1.8 + i / 3) % 1), a = state === 2 && running && !reduced ? 1 : 0;
        r.scale.setScalar(.14 + ph * .35); r.material.opacity = (1 - ph) * .8 * a;
      });
    },
  };
}

/* Estufas: sensores lidos pelo ESP32 e relés de irrigação, ventilação e iluminação */
function buildEstufas({ root }, stage) {
  const W = 2.0, D = 1.2, H = .95;
  const soilMat = new THREE.MeshStandardMaterial({ color: 0x3a2c22, roughness: .95 });
  const base = new THREE.Mesh(new RoundedBoxGeometry(W + .1, .06, D + .1, 3, .02), mat.graphite); base.position.y = .03; root.add(base);
  const beds = [-.27, .27].map(z => { const b = new THREE.Mesh(new RoundedBoxGeometry(W - .3, .1, .36, 2, .02), soilMat.clone()); b.position.set(.05, .11, z); root.add(b); return b; });
  /* estrutura */
  const bar = (len, x, y, z, rx = 0, rz = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(.025, len, .025), mat.metal); m.position.set(x, y, z); m.rotation.set(rx, 0, rz); root.add(m); return m; };
  const ridge = H + .32, half = D / 2, slope = Math.hypot(half, .32), ang = Math.atan2(half, .32);
  for (const x of [-W / 2, 0, W / 2]) {
    for (const z of [-half, half]) bar(H, x, .06 + H / 2, z);
    bar(slope, x, .06 + H + .16, -half / 2, ang, 0);
    bar(slope, x, .06 + H + .16, half / 2, -ang, 0);
  }
  for (const z of [-half, half]) { const m = bar(W, 0, .06 + H, z, 0, Math.PI / 2); }
  bar(W, 0, .06 + ridge, 0, 0, Math.PI / 2);
  const glass = new THREE.MeshStandardMaterial({ color: 0x9fb6ff, roughness: .1, metalness: 0, transparent: true, opacity: .07, side: THREE.DoubleSide, depthWrite: false });
  const pane = (w, h, x, y, z, ry = 0, rx = 0) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), glass); p.position.set(x, y, z); p.rotation.set(rx, ry, 0, 'YXZ'); root.add(p); };
  pane(W, H, 0, .06 + H / 2, -half);
  pane(D, H, -W / 2, .06 + H / 2, 0, Math.PI / 2);
  pane(W, slope, 0, .06 + H + .16, -half / 2, 0, -(Math.PI / 2 - ang));
  /* plantas: alface e repolho trocam conforme a cultura */
  const spots = []; for (const z of [-.27, .27]) for (let i = 0; i < 5; i++) spots.push([-.6 + i * .32, z]);
  const lettuceMat = new THREE.MeshStandardMaterial({ color: 0x7ccf5a, roughness: .7 });
  const cabbageMat = new THREE.MeshStandardMaterial({ color: 0x6f9f8c, roughness: .6 });
  const leafGeo = new THREE.SphereGeometry(.07, 14, 8); leafGeo.scale(1, .45, 1.6); leafGeo.translate(0, 0, .06);
  const headGeo = new THREE.SphereGeometry(.1, 20, 14);
  const NL = spots.length * 7;
  const lettuce = new THREE.InstancedMesh(leafGeo, lettuceMat, NL), cabbage = new THREE.InstancedMesh(headGeo, cabbageMat, spots.length), cabLeaves = new THREE.InstancedMesh(leafGeo, cabbageMat, spots.length * 5);
  root.add(lettuce, cabbage, cabLeaves);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new V3(), ps = new V3();
  const placePlants = (kL, kC) => {
    let a = 0, b = 0;
    spots.forEach(([x, z], si) => {
      for (let k = 0; k < 7; k++) { e.set(-.35 - (k % 2) * .25, k * .9 + si, 0, 'YXZ'); q.setFromEuler(e); sc.setScalar(Math.max(.001, kL * (k < 4 ? 1 : .75))); ps.set(x, .17 + (k < 4 ? 0 : .03) * kL, z); m4.compose(ps, q, sc); lettuce.setMatrixAt(a++, m4); }
      sc.setScalar(Math.max(.001, kC)); ps.set(x, .16 + .08 * kC, z); q.identity(); m4.compose(ps, q, sc); cabbage.setMatrixAt(si, m4);
      for (let k = 0; k < 5; k++) { e.set(-.2, k * 1.26 + si, 0, 'YXZ'); q.setFromEuler(e); sc.set(kC * 1.3, kC, kC * 1.2); ps.set(x, .17, z); m4.compose(ps, q, sc); cabLeaves.setMatrixAt(b++, m4); }
    });
    lettuce.instanceMatrix.needsUpdate = cabbage.instanceMatrix.needsUpdate = cabLeaves.instanceMatrix.needsUpdate = true;
  };
  /* irrigação: um cano por canteiro e gotas */
  const pipes = [-.27, .27].map(z => { const p = new THREE.Mesh(new THREE.CylinderGeometry(.014, .014, W - .3, 12), new THREE.MeshStandardMaterial({ color: 0x2f6bff, roughness: .35, metalness: .3 })); p.rotation.z = Math.PI / 2; p.position.set(.05, .62, z); root.add(p); return p; });
  const ND = 36, drops = new THREE.InstancedMesh(new THREE.SphereGeometry(.012, 8, 6), new THREE.MeshBasicMaterial({ color: 0x8fb4ff, transparent: true, opacity: .9, toneMapped: false }), ND);
  const dropX = [], dropZ = [], dropT = []; for (let i = 0; i < ND; i++) { dropX.push(-.75 + (i % 9) * .2 + .05); dropZ.push(i % 2 ? .27 : -.27); dropT.push(Math.random()); }
  root.add(drops);
  /* exaustor na parede do fundo */
  const fan = new THREE.Group(); fan.position.set(-W / 2 + .02, .62, 0); fan.rotation.y = Math.PI / 2; root.add(fan);
  const housing = new THREE.Mesh(new THREE.TorusGeometry(.2, .025, 10, 40), mat.graphite); fan.add(housing);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, .05, 20), mat.metal); hub.rotation.x = Math.PI / 2; fan.add(hub);
  const blades = new THREE.Group(); fan.add(blades);
  for (let i = 0; i < 4; i++) { const bl = new THREE.Mesh(new THREE.BoxGeometry(.06, .17, .008), mat.metal); bl.position.y = .1; const g = new THREE.Group(); g.rotation.z = i * Math.PI / 2; bl.rotation.y = .4; g.add(bl); blades.add(g); }
  /* lâmpada sob a cumeeira */
  const lampMat = new THREE.MeshStandardMaterial({ color: 0x1b2340, emissive: 0xffe6a8, emissiveIntensity: 0, roughness: .4 });
  const lamp = new THREE.Mesh(new RoundedBoxGeometry(1.4, .04, .08, 2, .015), lampMat); lamp.position.set(.05, .06 + H + .02, 0); root.add(lamp);
  const lampLight = new THREE.PointLight(0xffe2a0, 0, 2.6, 1.6); lampLight.position.set(.05, .06 + H - .05, 0); root.add(lampLight);
  const lampGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffd98a, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, opacity: 0 })); lampGlow.position.copy(lamp.position); lampGlow.scale.set(1.9, .5, 1); root.add(lampGlow);
  /* sensores e placa */
  const esp = new THREE.Mesh(new RoundedBoxGeometry(.26, .03, .16, 2, .008), new THREE.MeshStandardMaterial({ color: 0x0c1631, roughness: .45 })); esp.position.set(W / 2 - .12, .075, -.47); root.add(esp);
  const espLed = new THREE.Mesh(new THREE.SphereGeometry(.012, 10, 8), new THREE.MeshBasicMaterial({ color: 0x6b95ff, toneMapped: false })); espLed.position.set(W / 2 - .05, .095, -.43); root.add(espLed);
  const dht = new THREE.Mesh(new RoundedBoxGeometry(.07, .1, .035, 2, .008), new THREE.MeshStandardMaterial({ color: 0xe6ebf4, roughness: .55 })); dht.position.set(W / 2 - .03, .5, -half + .03); root.add(dht);
  const probes = [[.7, -.27], [.7, .27]].map(([x, z]) => { const p = new THREE.Mesh(new THREE.BoxGeometry(.03, .16, .012), new THREE.MeshStandardMaterial({ color: 0x2f6bff, roughness: .4 })); p.position.set(x, .2, z); root.add(p); return p; });
  const ldr = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, .015, 20), new THREE.MeshStandardMaterial({ color: 0xd9a441, roughness: .4 })); ldr.position.set(.6, .06 + ridge - .1, -.18); root.add(ldr);

  const el = { T: document.getElementById('ghT'), S: document.getElementById('ghS'), L: document.getElementById('ghL'), r: [0, 1, 2].map(i => document.getElementById('ghR' + i)), crop: document.getElementById('ghCrop') };
  const CROPS = { alface: { vent: 24, irr: 60 }, repolho: { vent: 20, irr: 70 } };
  let crop = 'alface', grow = { L: 1, C: 0 }, running = false, st = 0, temp = 22, soil = 68, lux = 9000;
  const relay = [false, false, false], vis = [0, 0, 0];
  let fanAng = 0;
  const setCrop = c => { crop = c; el.crop.innerHTML = 'Cultura: <b>' + c + '</b>'; el.crop.setAttribute('aria-pressed', String(c === 'repolho')); };
  el.crop.addEventListener('click', e => { e.stopPropagation(); setCrop(crop === 'alface' ? 'repolho' : 'alface'); running = true; });
  placePlants(1, 0);
  return {
    play() { running = true; st = 0; temp = 22; soil = 68; lux = 9000; },
    hover() {},
    tap() { setCrop(crop === 'alface' ? 'repolho' : 'alface'); running = true; },
    update(t, dt) {
      if (running) st += dt;
      const c = CROPS[crop], cyc = st % 14;
      /* ambiente: a tarde esquenta, o solo seca e no fim do ciclo escurece */
      const amb = running ? (cyc < 1.5 ? 21 : cyc < 8 ? 28 : 19) : 22;
      const sun = running ? (cyc > 7 && cyc < 12.5 ? 2600 : 9200) : 9000;
      temp += ((amb - temp) * .45 - (relay[1] ? 2.4 : 0)) * dt;
      soil = clamp(soil + (running ? (relay[0] ? 8 : -3.4) : 0) * dt, 35, 85);
      lux = damp(lux, sun, 1.2, dt);
      if (reduced && running) { temp = amb - (relay[1] ? 3 : 0); }
      /* histerese: liga no limite e só desliga com folga */
      if (running) {
        if (soil < c.irr) relay[0] = true; else if (soil > c.irr + 5) relay[0] = false;
        if (temp > c.vent) relay[1] = true; else if (temp < c.vent - 1) relay[1] = false;
        if (lux < 5000) relay[2] = true; else if (lux > 6000) relay[2] = false;
      }
      el.T.textContent = temp.toFixed(1).replace('.', ',') + ' °C';
      el.S.textContent = Math.round(soil) + '%';
      el.L.textContent = Math.round(lux / 100) * 100 >= 1000 ? (Math.round(lux / 100) * 100).toLocaleString('pt-BR') : Math.round(lux);
      relay.forEach((on, i) => { vis[i] = damp(vis[i], on ? 1 : 0, 8, dt); el.r[i].classList.toggle('on', on); });
      /* troca de cultura: uma planta encolhe e a outra cresce */
      grow.L = damp(grow.L, crop === 'alface' ? 1 : 0, 6, dt); grow.C = damp(grow.C, crop === 'repolho' ? 1 : 0, 6, dt);
      placePlants(grow.L, grow.C);
      const dry = clamp((c.irr + 5 - soil) / 25);
      beds.forEach(b => b.material.color.setRGB(.075 + .07 * dry, .05 + .045 * dry, .035 + .03 * dry));
      /* gotas caem só com a irrigação ligada */
      let k = 0;
      for (let i = 0; i < ND; i++) {
        dropT[i] = (dropT[i] + dt * 1.6) % 1;
        const y = .6 - dropT[i] * .42, a = vis[0] > .05 && !reduced ? 1 : 0;
        sc.setScalar(a ? 1 : .0001); ps.set(dropX[i], y, dropZ[i]); q.identity(); m4.compose(ps, q, sc); drops.setMatrixAt(k++, m4);
      }
      drops.instanceMatrix.needsUpdate = true; drops.material.opacity = vis[0] * .9;
      if (reduced) { drops.visible = false; pipes.forEach(p => p.material.emissive?.set(0x2f6bff)); pipes.forEach(p => { p.material.emissiveIntensity = vis[0] * .8; }); } else drops.visible = true;
      fanAng += dt * vis[1] * (reduced ? 0 : 16); blades.rotation.z = fanAng;
      lampMat.emissiveIntensity = vis[2] * 2.2; lampLight.intensity = vis[2] * 3; lampGlow.material.opacity = vis[2] * .55;
      espLed.material.color.setHex(Math.sin(t * 6) > 0 && running ? 0x6b95ff : 0x1b2340);
    },
  };
}

makeHero();
makeSeq();
projectView('blintec', buildBlintec, { dist: 4.2, look: [0, .2, 0] });
projectView('campus', buildCampus, { dist: 3.9, look: [0, .38, 0] });
projectView('esp', buildEsp, { dist: 3.5, look: [0, .2, .05] });
projectView('estufas', buildEstufas, { dist: 4.5, look: [0, .5, 0] });
window.__proto = { views, perf, quality, contexts: 1 };

/* painel de desempenho */
{
  document.getElementById('perfBox').hidden = location.hash !== '#dev';
  const btn = document.getElementById('perfBtn'), panel = document.getElementById('perfPanel'), list = document.getElementById('perfList');
  const bLight = document.getElementById('perfLight'), bRed = document.getElementById('perfReduced');
  btn.addEventListener('click', () => { panel.hidden = !panel.hidden; btn.setAttribute('aria-expanded', String(!panel.hidden)); });
  const sync = () => { bLight.setAttribute('aria-pressed', String(quality.forced)); bRed.setAttribute('aria-pressed', String(reduced)); };
  bLight.addEventListener('click', () => {
    quality.forced = !quality.forced;
    if (quality.forced) setDpr(.75, 'leve'); else setDpr(lowEnd ? Math.min(1, quality.max) : quality.max, lowEnd ? 'média' : 'alta');
    sync();
  });
  bRed.addEventListener('click', () => { reduced = !reduced; sync(); });
  sync();
  setInterval(() => {
    if (panel.hidden) return;
    const rows = [
      ['Canvas', perf.state === 'rodando' ? 'rodando' : 'pausado (0 quadros)'],
      ['Quadros por segundo', perf.state === 'rodando' ? perf.fps : 0],
      ['Tempo de quadro', perf.state === 'rodando' ? perf.ms + ' ms' : 'sem quadros'],
      ['Cenas desenhando', perf.drawing.length ? perf.drawing.join(', ') : 'nenhuma'],
      ['Chamadas de desenho', perf.state === 'rodando' ? perf.calls : 0],
      ['Triângulos', perf.state === 'rodando' ? perf.tris.toLocaleString('pt-BR') : 0],
      ['Qualidade', quality.tier + ' (' + quality.dpr + 'x)'],
      ['Contextos WebGL', '1'],
      ['Movimento reduzido', reduced ? 'sim' : 'não'],
    ];
    list.innerHTML = rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
  }, 500);
}
