import { ProjectStage } from "./ProjectStage";
import { EstufasStage, TempGuardStage } from "./SensorStages";

export function Projetos() {
  return (
    <section className="section" id="projetos" aria-labelledby="proj-titulo">
      <div className="wrap section-head">
        <h2 id="proj-titulo">Projetos</h2>
        <p>Cada cena mostra o que o projeto faz e começa quando o bloco aparece na tela. Passe o mouse (ou toque) pra repetir ou interagir.</p>
      </div>
      <div className="wrap projects">
        <article className="proj" aria-labelledby="p1">
          <ProjectStage
            description="Animação: rolos de tecido estendem camadas sobre a mesa e formam um enfesto; os moldes de colete são marcados e cortados."
            create={(three, viewport) => three.createBlintecScene(viewport)}
          />
          <div>
            <span className="kind">Projeto de estudo</span>
            <h3 id="p1">Sistema de Produção Blintec</h3>
            <p className="pnote">Feito pra estudar e pro portfólio. Não está implantado na fábrica.</p>
            <p className="psum">Planejamento e controle de produção para uma fábrica de coletes balísticos: pedidos, estoque de rolos de tecido, enfesto, produção e um painel com os números do dia a dia.</p>
            <ul className="chips" aria-label="Tecnologias"><li>Java 21</li><li>Spring Boot</li><li>PostgreSQL</li><li>Flyway</li><li>JWT</li><li>React</li></ul>
          </div>
        </article>

        <article className="proj flip" aria-labelledby="p2">
          <ProjectStage
            description="Animação: notebook abre, pede o código de verificação e o cadeado destrava."
            create={(three, viewport) => three.createCampusScene(viewport)}
          />
          <div>
            <span className="kind">Projeto em grupo</span>
            <h3 id="p2">EmprestaCampus</h3>
            <p className="pnote">Projeto Integrador do 7º semestre, feito em três pessoas e apresentado no UMC Summit.</p>
            <p className="psum">Sistema web para emprestar equipamentos da faculdade, com foco em segurança e LGPD. Minha parte foi o back-end em Django e DRF: papéis de usuário, TLS, criptografia em repouso, logs e 2FA.</p>
            <ul className="chips" aria-label="Tecnologias"><li>Python</li><li>Django</li><li>DRF</li><li>PostgreSQL</li><li>pytest</li></ul>
          </div>
        </article>

        <article className="proj" aria-labelledby="p3">
          <TempGuardStage />
          <div>
            <span className="kind">Projeto pessoal</span>
            <h3 id="p3">TempGuard</h3>
            <p className="pnote">Simulado no Wokwi, sem hardware físico.</p>
            <p className="psum">Monitor de temperatura e umidade com alertas visuais e sonoros. Um ESP32 lê o sensor DHT22 e aciona LEDs verde, amarelo e vermelho e um buzzer quando os valores saem da faixa.</p>
            <ul className="chips" aria-label="Tecnologias"><li>ESP32</li><li>MicroPython</li><li>DHT22</li><li>Wokwi</li></ul>
          </div>
        </article>

        <article className="proj flip" aria-labelledby="p4">
          <EstufasStage />
          <div>
            <span className="kind">Projeto em grupo</span>
            <h3 id="p4">Estufas IoT</h3>
            <p className="pnote">Trabalho da disciplina de Internet das Coisas na UMC, feito em três pessoas. Simulado no Wokwi.</p>
            <p className="psum">Controlador automático para duas estufas, uma de alface e outra de repolho. Um ESP32 lê temperatura, umidade do ar, umidade do solo e luminosidade, e liga por relés a irrigação, a ventilação e a iluminação conforme os limites de cada cultura.</p>
            <ul className="chips" aria-label="Tecnologias"><li>ESP32</li><li>MicroPython</li><li>DHT22</li><li>Relés</li><li>Wokwi</li></ul>
          </div>
        </article>
      </div>
    </section>
  );
}
