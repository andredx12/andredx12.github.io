import { useEffect } from "react";
import { Header } from "./components/Header";
import { PerfPanel } from "./components/PerfPanel";
import { Contato } from "./sections/Contato";
import { Experiencia } from "./sections/Experiencia";
import { Footer } from "./sections/Footer";
import { Projetos } from "./sections/Projetos";
import { Sobre } from "./sections/Sobre";
import { Stack } from "./sections/Stack";

let scenesStarted = false;

function useCareerReveal() {
  useEffect(() => {
    const career = document.getElementById("career");
    const tenure = document.getElementById("tenure");
    if (!career) return;
    const years = Math.floor((Date.now() - new Date(2021, 1, 1).getTime()) / 31557600000);
    if (tenure && years >= 1) tenure.textContent = `, há mais de ${years} ${years === 1 ? "ano" : "anos"}`;
    if (!("IntersectionObserver" in window)) {
      career.classList.add("in");
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          career.classList.add("in");
          io.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    io.observe(career);
    return () => io.disconnect();
  }, []);
}

function useScenes() {
  useEffect(() => {
    if (scenesStarted) return;
    scenesStarted = true;
    import("./three/scenes.js").catch((err) => {
      document.documentElement.classList.add("no-webgl");
      console.warn("Cenas 3D não carregaram", err);
    });
  }, []);
}

export default function App() {
  useCareerReveal();
  useScenes();
  return (
    <>
      <canvas id="gl" aria-hidden="true" />
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
