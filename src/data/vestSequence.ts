/* Fases da animação do colete: usadas pelos botões, pela legenda e pela cena */

export interface SequencePhase {
  /** Nome curto do botão. */
  label: string;
  title: string;
  caption: string;
  /** Onde a fase começa, de 0 a 1 do tempo da animação. */
  start: number;
  /** Ponto da fase pra onde o botão leva, de 0 a 1 do tempo da animação. */
  focus: number;
}

/** Parte da rolagem usada pela animação; o resto escurece a cena antes da experiência entrar. */
export const SEQUENCE_END = 0.88;

export const sequencePhases: SequencePhase[] = [
  { label: "Colete", title: "O colete", caption: "O painel frontal, com as camadas balísticas por dentro.", start: 0, focus: 0.04 },
  { label: "Arma", title: "A arma", caption: "Estilizada e fora de foco, só pra mostrar de onde vem o disparo.", start: 0.1, focus: 0.16 },
  { label: "Disparo", title: "Disparo", caption: "O clarão marca o começo da trajetória.", start: 0.2, focus: 0.225 },
  { label: "Trajetória", title: "Trajetória", caption: "O projétil em câmera lenta até a superfície.", start: 0.25, focus: 0.35 },
  { label: "Impacto", title: "Impacto", caption: "O impacto se espalha pela área atingida.", start: 0.45, focus: 0.48 },
  { label: "Camadas", title: "Camadas", caption: "O painel se abre: tecido, espuma e camada final.", start: 0.52, focus: 0.6 },
  { label: "Retenção", title: "Retenção", caption: "O projétil fica preso nas primeiras camadas.", start: 0.68, focus: 0.8 },
  { label: "Resultado", title: "Resultado", caption: "As camadas da frente deformam e seguram. A última fica intacta.", start: 0.86, focus: 0.97 },
];

export const sequenceLabels = {
  tecido: "Camadas de tecido",
  espuma: "Espuma",
  final: "Camada final",
  projetil: "Projétil retido",
} as const;

export type SequenceLabelId = keyof typeof sequenceLabels;

export const sequenceDisclaimer = "Representação ilustrativa. Não reproduz ensaio balístico nem resultado de produto certificado.";
