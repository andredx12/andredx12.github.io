import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";

const START = new Date(2021, 1, 1);
const YEAR_MS = 365.25 * 24 * 60 * 60 * 1000;

/** Atraso de cada item na revelação escalonada. */
const delay = (seconds: number) => ({ "--d": `${seconds}s` }) as CSSProperties;

/** Revela o bloco uma vez, quando entra na tela. */
function useRevealOnce<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setVisible(true);
        observer.disconnect();
      },
      { threshold: 0.2 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return { ref, visible };
}

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
  const years = useYearsSince(START);

  return (
    <div className={visible ? "career in" : "career"} ref={ref}>
      <div className="wrap career-grid">
        <div className="career-intro">
          <h2 id="exp-titulo" className="rv">
            Experiência
          </h2>
          <h3 className="company rv" style={delay(0.12)}>
            Blintec
          </h3>
          <p className="meta rv" style={delay(0.2)}>
            Fábrica de coletes balísticos em Mogi das Cruzes, SP. Desde fevereiro de 2021
            {years !== null && years >= 1 && `, há mais de ${years} ${years === 1 ? "ano" : "anos"}`}.
          </p>
          <p className="lead rv" style={delay(0.28)}>
            Entrei na produção como ajudante e passei a cortador. Ao longo desses anos fui assumindo mais etapas do processo e aprendendo como um colete balístico é feito.
          </p>
        </div>
        <div className="career-body">
          <ol className="rail">
            <li className="rv" style={delay(0.4)}>
              <p className="when">Fevereiro de 2021</p>
              <h4>Ajudante</h4>
              <p>Minha entrada na produção de coletes balísticos.</p>
            </li>
            <li className="now rv" style={delay(0.55)}>
              <p className="when">Hoje</p>
              <h4>Cortador</h4>
              <p>Faço o enfesto, o risco e o corte dos tecidos, e corrijo erros de produção.</p>
              <ul className="chips" aria-label="Atividades">
                <li>Enfesto</li>
                <li>Risco</li>
                <li>Corte de tecidos</li>
                <li>Correção de erros de produção</li>
              </ul>
            </li>
          </ol>
          <div className="learn rv" style={delay(0.75)}>
            <h4>Perto da gestão</h4>
            <p>Trabalhando direto com o gerente e o diretor, aprendi sobre a tecnologia dos coletes balísticos, os materiais usados e os processos envolvidos na produção.</p>
            <a href="#p1">Foi daí que saiu o Sistema de Produção Blintec</a>
          </div>
        </div>
      </div>
    </div>
  );
}
