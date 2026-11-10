import type { ComponentType } from "react";
import { ChipList } from "../../components/ChipList";
import { projectAnchor, type Project, type ProjectScene } from "../../data/projects";
import { BlintecScene, CampusScene, EstufasScene, TempGuardScene, type SceneProps } from "./ProjectScenes";

const scenes: Record<ProjectScene, ComponentType<SceneProps>> = {
  blintec: BlintecScene,
  campus: CampusScene,
  tempguard: TempGuardScene,
  estufas: EstufasScene,
};

interface ProjectCardProps {
  project: Project;
  /** Inverte a ordem de cena e texto, pra alternar os blocos. */
  flip: boolean;
}

export function ProjectCard({ project, flip }: ProjectCardProps) {
  const Scene = scenes[project.scene];
  const titleId = `${projectAnchor(project.id)}-titulo`;

  return (
    <article className={flip ? "proj flip" : "proj"} id={projectAnchor(project.id)} aria-labelledby={titleId}>
      <Scene description={project.sceneDescription} />
      <div>
        <span className="kind">{project.kind}</span>
        <h3 id={titleId}>{project.title}</h3>
        <p className="pnote">{project.note}</p>
        <p className="psum">{project.summary}</p>
        <ChipList items={project.tech} label="Tecnologias" />
      </div>
    </article>
  );
}
