import { Header } from "./components/Header";
import { PerfPanel } from "./components/PerfPanel";
import { Contato } from "./sections/Contato";
import { Experiencia } from "./sections/experiencia/Experiencia";
import { Footer } from "./sections/Footer";
import { Projetos } from "./sections/projetos/Projetos";
import { Sobre } from "./sections/Sobre";
import { Stack } from "./sections/Stack";

export default function App() {
  return (
    <>
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-surface-2 focus:px-4 focus:py-2 focus:text-ink"
      >
        Pular para o conteúdo
      </a>
      <Header />
      <main id="conteudo" tabIndex={-1} className="outline-none">
        <Sobre />
        <Experiencia />
        <Projetos />
        <Stack />
        <Contato />
      </main>
      <Footer />
      <PerfPanel />
    </>
  );
}
