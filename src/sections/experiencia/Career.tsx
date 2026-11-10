import { useSyncExternalStore, type CSSProperties } from "react";
import { ChipList } from "../../components/ChipList";
import { blintec as experience, CAREER_ANCHOR } from "../../data/experience";
import { projectAnchor } from "../../data/projects";
import { useRevealOnce } from "../../hooks/useRevealOnce";

const YEAR_MS = 365.25 * 24 * 60 * 60 * 1000;

/** Atraso de cada item na revelação escalonada. */
const delay = (seconds: number) => ({ "--d": `${seconds}s` }) as CSSProperties;

const noSubscription = () => () => {};

/** Anos completos desde a entrada. No HTML gerado fica vazio, pra não ficar desatualizado; o navegador completa. */
function useYearsSince(start: Date) {
  return useSyncExternalStore(
    noSubscription,
    () => Math.floor((Date.now() - start.getTime()) / YEAR_MS),
    () => null,
  );
}

/** Trajetória na Blintec, que aparece depois da animação do colete. */
export function Career() {
  const { ref, visible } = useRevealOnce<HTMLDivElement>();
  const years = useYearsSince(experience.since);
  const { highlight } = experience;

  return (
    <div className={visible ? "career in" : "career"} id={CAREER_ANCHOR} ref={ref}>
      <div className="wrap career-grid">
        <div className="career-intro">
          <h2 id="exp-titulo" className="rv">
            Experiência
          </h2>
          <h3 className="company rv" style={delay(0.12)}>
            {experience.company}
          </h3>
          <p className="meta rv" style={delay(0.2)}>
            {experience.about} Desde {experience.sinceLabel}
            {years !== null && years >= 1 && `, há mais de ${years} ${years === 1 ? "ano" : "anos"}`}.
          </p>
          <p className="lead rv" style={delay(0.28)}>
            {experience.summary}
          </p>
        </div>

        <div className="career-body">
          <ol className="rail">
            {experience.roles.map((role, i) => (
              <li key={role.title} className={role.current ? "now rv" : "rv"} style={delay(0.4 + i * 0.15)}>
                <p className="when">{role.when}</p>
                <h4>{role.title}</h4>
                <p>{role.description}</p>
                {role.activities && <ChipList items={role.activities} label="Atividades" />}
              </li>
            ))}
          </ol>
          <div className="learn rv" style={delay(0.75)}>
            <h4>{highlight.title}</h4>
            <p>{highlight.text}</p>
            <a href={`#${projectAnchor(highlight.link.projectId)}`}>{highlight.link.label}</a>
          </div>
        </div>
      </div>
    </div>
  );
}
