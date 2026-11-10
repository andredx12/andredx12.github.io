import type { CSSProperties } from "react";

export function Experiencia() {
  return (
      <section className="section exp" id="experiencia" aria-labelledby="exp-titulo">
        <div className="seq" id="seq" role="group" aria-label="Animação ilustrativa: disparo contra um colete balístico">
          <div className="seq-sticky">
            <div className="seq-gl" id="seqGl"></div>
            <p className="gl-msg">O navegador não abriu o WebGL, então a cena não aparece aqui.</p>
          </div>
          <div className="seq-over">
            <div className="labels" id="seqLabels" aria-hidden="true">
              <div className="lbl" data-a="tecido"><span>Camadas de tecido</span></div>
              <div className="lbl" data-a="espuma"><span>Espuma</span></div>
              <div className="lbl" data-a="final"><span>Camada final</span></div>
              <div className="lbl" data-a="projetil"><span>Projétil retido</span></div>
            </div>
            <div className="seq-ui">
              <ol className="steps" id="steps" aria-label="Fases da animação">
                <li><button type="button" data-p="0.035"><b>1</b><span>Colete</span></button></li>
                <li><button type="button" data-p="0.141"><b>2</b><span>Arma</span></button></li>
                <li><button type="button" data-p="0.198"><b>3</b><span>Disparo</span></button></li>
                <li><button type="button" data-p="0.308"><b>4</b><span>Trajetória</span></button></li>
                <li><button type="button" data-p="0.422"><b>5</b><span>Impacto</span></button></li>
                <li><button type="button" data-p="0.528"><b>6</b><span>Camadas</span></button></li>
                <li><button type="button" data-p="0.704"><b>7</b><span>Retenção</span></button></li>
                <li><button type="button" data-p="0.854"><b>8</b><span>Resultado</span></button></li>
              </ol>
              <div className="seq-bottom">
                <div className="caption" aria-live="polite"><h3 id="capT">O colete</h3><p id="capP">O painel frontal, com as camadas balísticas por dentro.</p></div>
                <div className="seq-note"><span>Representação ilustrativa. Não reproduz ensaio balístico nem resultado de produto certificado.</span><div className="bar" aria-hidden="true"><span id="bar"></span></div></div>
              </div>
            </div>
            <div className="seq-curtain" id="seqCurtain"></div>
          </div>
        </div>

        <div className="career" id="career">
          <div className="wrap career-grid">
            <div className="career-intro">
              <h2 id="exp-titulo" className="rv">Experiência</h2>
              <h3 className="company rv" style={{ "--d": ".12s" } as CSSProperties}>Blintec</h3>
              <p className="meta rv" style={{ "--d": ".2s" } as CSSProperties}>Fábrica de coletes balísticos em Mogi das Cruzes, SP. Desde fevereiro de 2021<span id="tenure"></span>.</p>
              <p className="lead rv" style={{ "--d": ".28s" } as CSSProperties}>Entrei na produção como ajudante e passei a cortador. Ao longo desses anos fui assumindo mais etapas do processo e aprendendo como um colete balístico é feito.</p>
            </div>
            <div className="career-body">
              <ol className="rail">
                <li className="rv" style={{ "--d": ".4s" } as CSSProperties}>
                  <p className="when">Fevereiro de 2021</p>
                  <h4>Ajudante</h4>
                  <p>Minha entrada na produção de coletes balísticos.</p>
                </li>
                <li className="now rv" style={{ "--d": ".55s" } as CSSProperties}>
                  <p className="when">Hoje</p>
                  <h4>Cortador</h4>
                  <p>Faço o enfesto, o risco e o corte dos tecidos, e corrijo erros de produção.</p>
                  <ul className="chips" aria-label="Atividades"><li>Enfesto</li><li>Risco</li><li>Corte de tecidos</li><li>Correção de erros de produção</li></ul>
                </li>
              </ol>
              <div className="learn rv" style={{ "--d": ".75s" } as CSSProperties}>
                <h4>Perto da gestão</h4>
                <p>Trabalhando direto com o gerente e o diretor, aprendi sobre a tecnologia dos coletes balísticos, os materiais usados e os processos envolvidos na produção.</p>
                <a href="#p1">Foi daí que saiu o Sistema de Produção Blintec</a>
              </div>
            </div>
          </div>
        </div>
      </section>
  );
}
