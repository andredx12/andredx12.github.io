import { Fragment, useEffect, useState } from "react";
import { loadThree, type ThreeModule } from "../hooks/useThreeScene";

type Stats = ReturnType<ThreeModule["devTools"]["stats"]>;

/** Painel de testes de desempenho. Só aparece com #dev no endereço. */
export function PerfPanel() {
  const [tools, setTools] = useState<ThreeModule["devTools"] | null>(null);
  const [open, setOpen] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (location.hash !== "#dev") return;
    loadThree()
      .then((three) => {
        setTools(three.devTools);
        setReduced(three.devTools.reducedMotion);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!tools || !open) return;
    const id = setInterval(() => setStats(tools.stats()), 500);
    return () => clearInterval(id);
  }, [tools, open]);

  if (!tools) return null;

  const running = stats?.state === "rodando";
  const rows: [string, string | number][] = stats
    ? [
        ["Canvas", running ? "rodando" : "pausado (0 quadros)"],
        ["Quadros por segundo", stats.fps],
        ["Tempo de quadro", running ? `${stats.frameMs} ms` : "sem quadros"],
        ["Cenas desenhando", stats.drawing.length ? stats.drawing.join(", ") : "nenhuma"],
        ["Chamadas de desenho", stats.calls],
        ["Triângulos", stats.triangles.toLocaleString("pt-BR")],
        ["Qualidade", `${stats.tier} (${stats.dpr}x)`],
        ["Contextos WebGL", 1],
        ["Movimento reduzido", reduced ? "sim" : "não"],
      ]
    : [];

  return (
    <div className="perfbox">
      <button type="button" className="perf-btn" aria-expanded={open} aria-controls="perf-panel" onClick={() => setOpen((v) => !v)}>
        Desempenho
      </button>
      <div className="perf-panel" id="perf-panel" hidden={!open}>
        <dl>
          {rows.map(([label, value]) => (
            <Fragment key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </Fragment>
          ))}
        </dl>
        <div className="perf-actions">
          <button
            type="button"
            aria-pressed={stats?.forcedLight ?? false}
            onClick={() => {
              tools.setForcedLight(!(stats?.forcedLight ?? false));
              setStats(tools.stats());
            }}
          >
            Forçar modo leve
          </button>
          <button
            type="button"
            aria-pressed={reduced}
            onClick={() => {
              tools.setReducedMotion(!reduced);
              setReduced(!reduced);
            }}
          >
            Simular movimento reduzido
          </button>
        </div>
      </div>
    </div>
  );
}
