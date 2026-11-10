/* Trajetória profissional, mostrada depois da animação do colete */

export interface Role {
  title: string;
  when: string;
  description: string;
  /** Marca o cargo atual na linha do tempo. */
  current?: boolean;
  activities?: string[];
}

export interface Experience {
  company: string;
  about: string;
  /** Primeiro dia, usado pra calcular há quantos anos. */
  since: Date;
  sinceLabel: string;
  summary: string;
  roles: Role[];
  highlight: {
    title: string;
    text: string;
    link: { label: string; projectId: string };
  };
}

export const blintec: Experience = {
  company: "Blintec",
  about: "Fábrica de coletes balísticos em Mogi das Cruzes, SP.",
  since: new Date(2021, 1, 1),
  sinceLabel: "fevereiro de 2021",
  summary:
    "Entrei na produção como ajudante e passei a cortador. Ao longo desses anos fui assumindo mais etapas do processo e aprendendo como um colete balístico é feito.",
  roles: [
    {
      title: "Ajudante",
      when: "Fevereiro de 2021",
      description: "Minha entrada na produção de coletes balísticos.",
    },
    {
      title: "Cortador",
      when: "Hoje",
      current: true,
      description: "Faço o enfesto, o risco e o corte dos tecidos, e corrijo erros de produção.",
      activities: ["Enfesto", "Risco", "Corte de tecidos", "Correção de erros de produção"],
    },
  ],
  highlight: {
    title: "Perto da gestão",
    text: "Trabalhando direto com o gerente e o diretor, aprendi sobre a tecnologia dos coletes balísticos, os materiais usados e os processos envolvidos na produção.",
    link: { label: "Foi daí que saiu o Sistema de Produção Blintec", projectId: "blintec" },
  },
};
