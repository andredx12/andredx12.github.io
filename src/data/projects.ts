/* Projetos do portfólio, na ordem em que aparecem */

/** Cena 3D que acompanha o projeto. */
export type ProjectScene = "blintec" | "campus" | "tempguard" | "estufas";

export interface Project {
  /** Usado no id do bloco, pra links como #projeto-blintec. */
  id: string;
  scene: ProjectScene;
  kind: string;
  title: string;
  /** Contexto curto: onde foi feito, com quem e em que estado está. */
  note: string;
  summary: string;
  tech: string[];
  /** O que a animação mostra, pra quem usa leitor de tela. */
  sceneDescription: string;
}

export const projects: Project[] = [
  {
    id: "blintec",
    scene: "blintec",
    kind: "Projeto de estudo",
    title: "Sistema de Produção Blintec",
    note: "Feito pra estudar e pro portfólio. Não está implantado na fábrica.",
    summary:
      "Planejamento e controle de produção para uma fábrica de coletes balísticos: pedidos, estoque de rolos de tecido, enfesto, produção e um painel com os números do dia a dia.",
    tech: ["Java 21", "Spring Boot", "PostgreSQL", "Flyway", "JWT", "React"],
    sceneDescription: "Animação: rolos de tecido estendem camadas sobre a mesa e formam um enfesto; os moldes de colete são marcados e cortados.",
  },
  {
    id: "emprestacampus",
    scene: "campus",
    kind: "Projeto em grupo",
    title: "EmprestaCampus",
    note: "Projeto Integrador do 7º semestre, feito em três pessoas e apresentado no UMC Summit.",
    summary:
      "Sistema web para emprestar equipamentos da faculdade, com foco em segurança e LGPD. Minha parte foi o back-end em Django e DRF: papéis de usuário, TLS, criptografia em repouso, logs e 2FA.",
    tech: ["Python", "Django", "DRF", "PostgreSQL", "pytest"],
    sceneDescription: "Animação: notebook abre, pede o código de verificação e o cadeado destrava.",
  },
  {
    id: "tempguard",
    scene: "tempguard",
    kind: "Projeto pessoal",
    title: "TempGuard",
    note: "Simulado no Wokwi, sem hardware físico.",
    summary:
      "Monitor de temperatura e umidade com alertas visuais e sonoros. Um ESP32 lê o sensor DHT22 e aciona LEDs verde, amarelo e vermelho e um buzzer quando os valores saem da faixa.",
    tech: ["ESP32", "MicroPython", "DHT22", "Wokwi"],
    sceneDescription: "Animação: placa ESP32 lê o sensor DHT22 e acende LEDs verde, amarelo e vermelho conforme a temperatura sobe.",
  },
  {
    id: "estufas",
    scene: "estufas",
    kind: "Projeto em grupo",
    title: "Estufas IoT",
    note: "Trabalho da disciplina de Internet das Coisas na UMC, feito em três pessoas. Simulado no Wokwi.",
    summary:
      "Controlador automático para duas estufas, uma de alface e outra de repolho. Um ESP32 lê temperatura, umidade do ar, umidade do solo e luminosidade, e liga por relés a irrigação, a ventilação e a iluminação conforme os limites de cada cultura.",
    tech: ["ESP32", "MicroPython", "DHT22", "Relés", "Wokwi"],
    sceneDescription:
      "Animação: numa estufa, o ESP32 lê os sensores e liga a irrigação quando o solo seca, o exaustor quando esquenta e a lâmpada quando escurece. O botão troca a cultura entre alface e repolho.",
  },
];

export const projectAnchor = (id: string) => `projeto-${id}`;
