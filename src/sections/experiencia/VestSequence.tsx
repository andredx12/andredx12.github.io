import { useRef, useState } from "react";
import { CAREER_ANCHOR } from "../../data/experience";
import { SEQUENCE_END, sequenceDisclaimer, sequenceLabels, sequencePhases, type SequenceLabelId } from "../../data/vestSequence";
import { useThreeScene } from "../../hooks/useThreeScene";

const labelIds = Object.keys(sequenceLabels) as SequenceLabelId[];
const phaseStarts = sequencePhases.map((phase) => phase.start);

/** Versão em texto da animação, pra quando o navegador não tem JavaScript ou WebGL. */
function StaticSequence() {
  return (
    <div className="seq-static wrap">
      <div className="seq-static-body">
        <p className="seq-static-intro">Como um colete balístico segura o projétil, em {sequencePhases.length} fases:</p>
        <ol>
          {sequencePhases.map((p) => (
            <li key={p.label}>
              <strong>{p.title}.</strong> {p.caption}
            </li>
          ))}
        </ol>
        <p className="seq-static-note">{sequenceDisclaimer}</p>
      </div>
    </div>
  );
}

/** Animação do disparo contra o colete, conduzida pela rolagem. */
export function VestSequence() {
  const trackRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const uiRef = useRef<HTMLDivElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const curtainRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
  const labelRefs = useRef<Partial<Record<SequenceLabelId, HTMLDivElement>>>({});
  const [phase, setPhase] = useState(0);

  useThreeScene((three) =>
    three.createVestSequence({
      track: trackRef.current!,
      sticky: stickyRef.current!,
      viewport: viewportRef.current!,
      overlay: {
        fade: [uiRef.current!, labelsRef.current!],
        curtain: curtainRef.current!,
        bar: barRef.current!,
        labels: labelRefs.current as Record<SequenceLabelId, HTMLDivElement>,
      },
      phaseStarts,
      end: SEQUENCE_END,
      onPhase: setPhase,
    }),
  );

  /* o botão leva a rolagem até o ponto da fase */
  const goToPhase = (focus: number) => {
    const track = trackRef.current!;
    const span = track.offsetHeight - stickyRef.current!.offsetHeight;
    const top = window.scrollY + track.getBoundingClientRect().top + focus * SEQUENCE_END * span;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top, behavior: reduced ? "auto" : "smooth" });
  };

  const current = sequencePhases[phase];

  return (
    <div className="seq" ref={trackRef} role="group" aria-label="Animação ilustrativa: disparo contra um colete balístico">
      <div className="seq-sticky" ref={stickyRef}>
        <div className="seq-gl" ref={viewportRef} />
      </div>
      <div className="seq-over">
        <div className="labels" ref={labelsRef} aria-hidden="true">
          {labelIds.map((id) => (
            <div
              key={id}
              className="lbl"
              ref={(node) => {
                if (node) labelRefs.current[id] = node;
              }}
            >
              <span>{sequenceLabels[id]}</span>
            </div>
          ))}
        </div>
        <div className="seq-ui" ref={uiRef}>
          <div className="seq-top">
            <ol className="steps" aria-label="Fases da animação">
              {sequencePhases.map((p, i) => (
                <li key={p.label}>
                  <button
                    type="button"
                    className={i < phase ? "done" : undefined}
                    aria-current={i === phase ? "step" : undefined}
                    onClick={() => goToPhase(p.focus)}
                  >
                    <b>{i + 1}</b>
                    <span>{p.label}</span>
                  </button>
                </li>
              ))}
            </ol>
            <a className="seq-skip" href={`#${CAREER_ANCHOR}`}>
              Pular<span className="seq-skip-long"> animação</span>
            </a>
          </div>
          <div className="seq-bottom">
            <div className="caption">
              <p className="caption-title">{current.title}</p>
              <p className="caption-text">{current.caption}</p>
            </div>
            <div className="seq-note">
              <span>{sequenceDisclaimer}</span>
              <div className="bar" aria-hidden="true">
                <span ref={barRef} />
              </div>
            </div>
          </div>
        </div>
        <div className="seq-curtain" ref={curtainRef} />
      </div>
      <StaticSequence />
    </div>
  );
}
