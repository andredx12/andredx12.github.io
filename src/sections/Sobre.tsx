export function Sobre() {
  return (
      <section className="hero" id="sobre" aria-labelledby="sobre-titulo">
        <div className="wrap">
          <div>
            <h1 id="sobre-titulo">André<br />Quintino</h1>
            <p className="role">Estudante de Engenharia de Software, focado em back-end.</p>
            <p className="intro">Construo APIs e sistemas com Java, Spring Boot e PostgreSQL. Trabalho numa fábrica de coletes balísticos desde 2021, e foi de lá que saiu meu principal projeto.</p>
            <div className="actions">
              <a className="btn btn-primary" href="#projetos">Ver projetos</a>
              <a className="btn btn-ghost" href="https://github.com/andredx12" target="_blank" rel="noreferrer">GitHub</a>
              <a className="btn btn-ghost" href="https://www.linkedin.com/in/andre-quintino-dev/" target="_blank" rel="noreferrer">LinkedIn</a>
            </div>
          </div>
          <div className="hero-media">
            <div className="stage" id="heroStage" tabIndex={0} role="button" aria-pressed="false" aria-label="Foto de André Quintino. Ative pra mostrar ou esconder o tênis, o livro e o halter.">
              <div className="stage-fallback" aria-hidden="true">
                <div className="panel"></div>
                <img src="/img/andre-recorte-960.webp" srcSet="/img/andre-recorte-560.webp 560w, /img/andre-recorte-960.webp 960w" sizes="(min-width:1024px) 440px, (min-width:640px) 380px, 300px" width="960" height="1067" alt="" fetchPriority="high" />
              </div>
              <div className="stage-gl" id="heroGl"></div>
            </div>
            <p className="hint"><i></i><span className="only-mouse">Passe o mouse na foto</span><span className="only-touch">Toque na foto</span></p>
          </div>
        </div>
      </section>
  );
}
