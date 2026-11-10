/* Preferência de movimento reduzido e tipo de ponteiro, lidos uma vez e atualizados ao vivo */

const query = matchMedia("(prefers-reduced-motion: reduce)");
let systemReduced = query.matches;
let override: boolean | null = location.hash === "#reduzido" ? true : null;

query.addEventListener("change", (event) => {
  systemReduced = event.matches;
});

export const motion = {
  get reduced() {
    return override ?? systemReduced;
  },
  /** Usado pelo painel de testes pra simular a configuração do sistema. */
  setOverride(value: boolean | null) {
    override = value;
  },
};

/** Tela de toque sem mouse: muda a revelação do Sobre e a qualidade inicial. */
export const coarsePointer = matchMedia("(hover: none)").matches;

/** Testes automáticos pulam a suavização da rolagem pra capturar o quadro exato. */
export const snapScroll = () => Boolean((window as Window & { __snap?: boolean }).__snap);
