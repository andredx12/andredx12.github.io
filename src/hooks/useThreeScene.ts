import { useEffect, useRef } from "react";
import { onIdle } from "../lib/idle";

export type ThreeModule = typeof import("../three");

interface Cleanup {
  dispose(): void;
}

let modulePromise: Promise<ThreeModule> | null = null;

/** Baixa o three.js e as cenas uma vez só, quando o navegador fica livre, pra não disputar com o texto e a foto. Sem WebGL, marca a página pra mostrar a versão estática. */
export function loadThree() {
  modulePromise ??= new Promise<void>((resolve) => onIdle(resolve, 1500))
    .then(() => import("../three"))
    .catch((err: unknown) => {
      document.documentElement.classList.add("no-webgl");
      console.warn("Cenas 3D não carregaram", err);
      throw err;
    });
  return modulePromise;
}

/**
 * Monta uma cena quando o componente aparece e desmonta quando ele sai.
 * O setup roda uma vez com os elementos já no DOM; o que ele devolve é descartado na limpeza.
 */
export function useThreeScene<T extends Cleanup>(setup: (three: ThreeModule) => T | null) {
  const sceneRef = useRef<T | null>(null);
  const setupRef = useRef(setup);

  useEffect(() => {
    let active = true;
    loadThree()
      .then((three) => {
        if (active) sceneRef.current = setupRef.current(three);
      })
      .catch(() => {});
    return () => {
      active = false;
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
  }, []);

  return sceneRef;
}
