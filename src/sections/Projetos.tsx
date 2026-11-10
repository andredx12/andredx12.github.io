export function Projetos() {
  return (
      <section className="section" id="projetos" aria-labelledby="proj-titulo">
        <div className="wrap section-head">
          <h2 id="proj-titulo">Projetos</h2>
          <p>Cada cena mostra o que o projeto faz e começa quando o bloco aparece na tela. Passe o mouse (ou toque) pra repetir ou interagir.</p>
        </div>
        <div className="wrap projects">
          <article className="proj" aria-labelledby="p1">
            <div className="proj-stage" data-scene="blintec" data-name="Blintec" tabIndex={0} aria-label="Animação: rolos de tecido estendem camadas sobre a mesa e formam um enfesto; os moldes de colete são marcados e cortados.">
              <div className="proj-gl"></div>
              <button className="replay" type="button">Repetir</button>
            </div>
            <div>
              <span className="kind">Projeto de estudo</span>
              <h3 id="p1">Sistema de Produção Blintec</h3>
              <p className="pnote">Feito pra estudar e pro portfólio. Não está implantado na fábrica.</p>
              <p className="psum">Planejamento e controle de produção para uma fábrica de coletes balísticos: pedidos, estoque de rolos de tecido, enfesto, produção e um painel com os números do dia a dia.</p>
              <ul className="chips" aria-label="Tecnologias"><li>Java 21</li><li>Spring Boot</li><li>PostgreSQL</li><li>Flyway</li><li>JWT</li><li>React</li></ul>
            </div>
          </article>

          <article className="proj flip" aria-labelledby="p2">
            <div className="proj-stage" data-scene="campus" data-name="EmprestaCampus" tabIndex={0} aria-label="Animação: notebook abre, pede o código de verificação e o cadeado destrava.">
              <div className="proj-gl"></div>
              <button className="replay" type="button">Repetir</button>
            </div>
            <div>
              <span className="kind">Projeto em grupo</span>
              <h3 id="p2">EmprestaCampus</h3>
              <p className="pnote">Projeto Integrador do 7º semestre, feito em três pessoas e apresentado no UMC Summit.</p>
              <p className="psum">Sistema web para emprestar equipamentos da faculdade, com foco em segurança e LGPD. Minha parte foi o back-end em Django e DRF: papéis de usuário, TLS, criptografia em repouso, logs e 2FA.</p>
              <ul className="chips" aria-label="Tecnologias"><li>Python</li><li>Django</li><li>DRF</li><li>PostgreSQL</li><li>pytest</li></ul>
            </div>
          </article>

          <article className="proj" aria-labelledby="p3">
            <div className="proj-stage" data-scene="esp" data-name="TempGuard" tabIndex={0} aria-label="Animação: placa ESP32 lê o sensor DHT22 e acende LEDs verde, amarelo e vermelho conforme a temperatura sobe.">
              <div className="proj-gl"></div>
              <span className="chip" id="tempChip"><i id="tempDot"></i><span id="tempVal">24,0 °C</span></span>
              <button className="replay" type="button">Repetir</button>
            </div>
            <div>
              <span className="kind">Projeto pessoal</span>
              <h3 id="p3">TempGuard</h3>
              <p className="pnote">Simulado no Wokwi, sem hardware físico.</p>
              <p className="psum">Monitor de temperatura e umidade com alertas visuais e sonoros. Um ESP32 lê o sensor DHT22 e aciona LEDs verde, amarelo e vermelho e um buzzer quando os valores saem da faixa.</p>
              <ul className="chips" aria-label="Tecnologias"><li>ESP32</li><li>MicroPython</li><li>DHT22</li><li>Wokwi</li></ul>
            </div>
          </article>

          <article className="proj flip" aria-labelledby="p4">
            <div className="proj-stage" data-scene="estufas" data-name="Estufas" tabIndex={0} aria-label="Animação: numa estufa, o ESP32 lê os sensores e liga a irrigação quando o solo seca, o exaustor quando esquenta e a lâmpada quando escurece. O botão troca a cultura entre alface e repolho.">
              <div className="proj-gl"></div>
              <div className="gh-read" aria-live="off">
                <span className="chip-s"><b id="ghT">22,0 °C</b> ar</span>
                <span className="chip-s"><b id="ghS">68%</b> solo</span>
                <span className="chip-s"><b id="ghL">9.000</b> lux</span>
              </div>
              <div className="gh-relays" aria-hidden="true">
                <span id="ghR0"><i></i>Irrigação</span><span id="ghR1"><i></i>Ventilação</span><span id="ghR2"><i></i>Iluminação</span>
              </div>
              <button className="crop" type="button" id="ghCrop" aria-pressed="false">Cultura: <b>alface</b></button>
            </div>
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
