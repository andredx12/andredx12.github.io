export const profile = {
  name: "André Quintino",
  role: "Estudante de Engenharia de Software, focado em back-end.",
  intro:
    "Construo APIs e sistemas com Java, Spring Boot e PostgreSQL. Trabalho numa fábrica de coletes balísticos desde 2021, e foi de lá que saiu meu principal projeto.",
  availability:
    "Procuro estágio em back-end, de manhã ou à tarde. Presencial ou híbrido em Mogi das Cruzes, Suzano e São Paulo. Em outras cidades, remoto.",
  facts: [
    { label: "Formação", value: "Engenharia de Software na UMC, 7º semestre" },
    { label: "Formatura", value: "Julho de 2027" },
    { label: "Base", value: "Mogi das Cruzes, SP" },
  ],
  links: {
    github: "https://github.com/andredx12",
    linkedin: "https://www.linkedin.com/in/andre-quintino-dev/",
    email: "andre_quintino30@hotmail.com",
  },
} as const;

export const navLinks = [
  { href: "#sobre", label: "Sobre" },
  { href: "#experiencia", label: "Experiência" },
  { href: "#projetos", label: "Projetos" },
  { href: "#stack", label: "Stack" },
  { href: "#contato", label: "Contato" },
] as const;
