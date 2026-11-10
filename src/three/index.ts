/* Ponto de entrada do 3D. Carregado sob demanda pelo useThreeScene, fora do pacote principal. */
import { getEngine } from "./engine/engine";
import { motion } from "./engine/motion";

export { createHeroScene } from "./scenes/hero";
export { createVestSequence } from "./scenes/vestSequence";
export { createBlintecScene } from "./scenes/projects/blintec";
export { createCampusScene } from "./scenes/projects/campus";
export { createTempGuardScene } from "./scenes/projects/tempGuard";
export { createEstufasScene } from "./scenes/projects/estufas";

/** Controles do painel de testes (#dev). */
export const devTools = {
  stats: () => getEngine().stats(),
  setForcedLight: (on: boolean) => getEngine().setForcedLight(on),
  setReducedMotion: (on: boolean | null) => motion.setOverride(on),
  get reducedMotion() {
    return motion.reduced;
  },
};

/** Cria o renderizador já na carga do módulo: sem WebGL, o import falha e a página fica sem 3D. */
getEngine();
