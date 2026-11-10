import { Career } from "./Career";
import { VestSequence } from "./VestSequence";
import "./experiencia.css";

/** Primeiro a animação do colete; quando ela fecha, entra a trajetória na Blintec. */
export function Experiencia() {
  return (
    <section className="section exp" id="experiencia" aria-labelledby="exp-titulo">
      <VestSequence />
      <Career />
    </section>
  );
}
