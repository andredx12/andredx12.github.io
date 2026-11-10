import { useRef, useState } from "react";
import { SEQUENCE_END, sequenceDisclaimer, sequenceLabels, sequencePhases, type SequenceLabelId } from "../../data/vestSequence";
import { useThreeScene } from "../../hooks/useThreeScene";

const labelIds = Object.keys(sequenceLabels) as SequenceLabelId[];
const phaseStarts = sequencePhases.map((phase) => phase.start);

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
        <p className="gl-msg">O navegador não abriu o WebGL, então a cena não aparece aqui.</p>
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
          <div className="seq-bottom">
            <div className="caption" aria-live="polite">
              <h3>{current.title}</h3>
              <p>{current.caption}</p>
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
    </div>
  );
}
