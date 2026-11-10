import { projects } from "../../data/projects";
import { ProjectCard } from "./ProjectCard";

export function Projetos() {
  return (
    <section className="section" id="projetos" aria-labelledby="proj-titulo">
      <div className="wrap section-head">
        <h2 id="proj-titulo">Projetos</h2>
        <p>Cada cena mostra o que o projeto faz e começa quando o bloco aparece na tela. Passe o mouse (ou toque) pra repetir ou interagir.</p>
      </div>
      <div className="wrap projects">
        {projects.map((project, i) => (
          <ProjectCard key={project.id} project={project} flip={i % 2 === 1} />
        ))}
      </div>
    </section>
  );
}
