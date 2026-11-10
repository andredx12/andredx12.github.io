import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import { useThreeScene, type ThreeModule } from "../../hooks/useThreeScene";

interface ProjectSceneHandle {
  play(): void;
  hover(on: boolean): void;
  tap(): void;
  dispose(): void;
}

interface ProjectStageProps<H extends ProjectSceneHandle> {
  /** Cria a cena dentro da área de desenho. */
  create(three: ThreeModule, viewport: HTMLElement): H;
  /** Descrição da animação pra leitores de tela. */
  description: string;
  showReplay?: boolean;
  /** Recebe a cena criada, pra componentes que mandam comandos próprios (ex.: trocar a cultura). */
  sceneRef?: RefObject<H | null>;
  children?: ReactNode;
}

/**
 * Palco das cenas de projeto: começa quando quase metade do bloco aparece,
 * repete no hover, responde a toque e teclado e tem o botão Repetir.
 */
export function ProjectStage<H extends ProjectSceneHandle>({ create, description, showReplay = true, sceneRef, children }: ProjectStageProps<H>) {
  const stageRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  const pointerType = useRef("mouse");

  const scene = useThreeScene((three) => {
    const handle = create(three, viewportRef.current!);
    if (sceneRef) sceneRef.current = handle;
    if (started.current) handle.play();
    return handle;
  });

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        started.current = true;
        scene.current?.play();
        observer.disconnect();
      },
      { threshold: 0.45 },
    );
    observer.observe(stage);
    return () => observer.disconnect();
  }, [scene]);

  return (
    <div
      ref={stageRef}
      className="proj-stage"
      tabIndex={0}
      aria-label={description}
      onPointerDown={(e) => (pointerType.current = e.pointerType)}
      onPointerEnter={(e) => e.pointerType === "mouse" && started.current && scene.current?.hover(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && scene.current?.hover(false)}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("button")) return;
        if (pointerType.current !== "mouse") scene.current?.tap();
      }}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget || (e.key !== "Enter" && e.key !== " ")) return;
        e.preventDefault();
        scene.current?.tap();
      }}
    >
      <div className="proj-gl" ref={viewportRef} />
      {children}
      {showReplay && (
        <button
          className="replay"
          type="button"
          onClick={() => {
            started.current = true;
            scene.current?.play();
          }}
        >
          Repetir
        </button>
      )}
    </div>
  );
}
