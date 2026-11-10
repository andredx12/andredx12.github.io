/* Painel de testes: só aparece com #dev no endereço */
export function PerfPanel() {
  return (
    <div className="perfbox" id="perfBox" hidden>
      <button type="button" className="perf-btn" id="perfBtn" aria-expanded="false" aria-controls="perfPanel">Desempenho</button>
      <div className="perf-panel" id="perfPanel" hidden>
        <dl id="perfList"></dl>
        <div className="perf-actions">
          <button type="button" id="perfLight">Forçar modo leve</button>
          <button type="button" id="perfReduced">Simular movimento reduzido</button>
        </div>
      </div>
    </div>
  );
}
