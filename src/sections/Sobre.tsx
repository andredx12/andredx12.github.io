import { useEffect, useRef, useState, type PointerEvent } from "react";
import { profile } from "../data/profile";
import { useThreeScene } from "../hooks/useThreeScene";

const isTouchOnly = () => matchMedia("(hover: none)").matches;

export function Sobre() {
  const stageRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const pointerType = useRef("mouse");
  const [revealed, setRevealed] = useState(false);
  const [is3d, setIs3d] = useState(false);

  const revealedRef = useRef(revealed);

  const scene = useThreeScene((three) => {
    const hero = three.createHeroScene({ stage: stageRef.current!, viewport: viewportRef.current!, onReady: () => setIs3d(true) });
    hero.setRevealed(revealedRef.current);
    return hero;
  });

  useEffect(() => {
    revealedRef.current = revealed;
    scene.current?.setRevealed(revealed);
  }, [revealed, scene]);

  /* no celular os objetos aparecem sozinhos quando a foto entra na tela */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !isTouchOnly()) return;
    let timer = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        timer = window.setTimeout(() => setRevealed(true), 450);
        observer.disconnect();
      },
      { threshold: 0.6 },
    );
    observer.observe(stage);
    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, []);

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse") return;
    const r = event.currentTarget.getBoundingClientRect();
    const x = Math.max(-1, Math.min(1, ((event.clientX - r.left) / r.width) * 2 - 1));
    const y = Math.max(-1, Math.min(1, -(((event.clientY - r.top) / r.height) * 2 - 1)));
    scene.current?.setPointer(x, y);
  };

  return (
    <section className="hero" id="sobre" aria-labelledby="sobre-titulo">
      <div className="wrap">
        <div>
          <h1 id="sobre-titulo">
            André
            <br />
            Quintino
          </h1>
          <p className="role">{profile.role}</p>
          <p className="intro">{profile.intro}</p>
          <div className="actions">
            <a className="btn btn-primary" href="#projetos">
              Ver projetos
            </a>
            <a className="btn btn-ghost" href={profile.links.github} target="_blank" rel="noreferrer">
              GitHub
            </a>
            <a className="btn btn-ghost" href={profile.links.linkedin} target="_blank" rel="noreferrer">
              LinkedIn
            </a>
          </div>
        </div>

        <div className="hero-media">
          <div
            ref={stageRef}
            className={is3d ? "stage is-3d" : "stage"}
            tabIndex={0}
            role="button"
            aria-pressed={revealed}
            aria-label="Foto de André Quintino. Ative pra mostrar ou esconder o tênis, o livro e o halter."
            onPointerDown={(e) => (pointerType.current = e.pointerType)}
            onPointerEnter={(e) => e.pointerType === "mouse" && setRevealed(true)}
            onPointerLeave={(e) => {
              if (e.pointerType !== "mouse") return;
              setRevealed(false);
              scene.current?.setPointer(0, 0);
            }}
            onPointerMove={onPointerMove}
            onClick={() => pointerType.current !== "mouse" && setRevealed((v) => !v)}
            onKeyDown={(e) => {
              if (e.key !== "Enter" && e.key !== " ") return;
              e.preventDefault();
              setRevealed((v) => !v);
            }}
            onFocus={() => !isTouchOnly() && setRevealed(true)}
            onBlur={() => !isTouchOnly() && setRevealed(false)}
          >
            <div className="stage-fallback" aria-hidden="true">
              <div className="panel" />
              <img
                src="/img/andre-recorte-960.webp"
                srcSet="/img/andre-recorte-560.webp 560w, /img/andre-recorte-960.webp 960w"
                sizes="(min-width:1024px) 440px, (min-width:640px) 380px, 300px"
                width="960"
                height="1067"
                alt=""
                fetchPriority="high"
              />
            </div>
            <div className="stage-gl" ref={viewportRef} />
          </div>
          <p className="hint">
            <i />
            <span className="only-mouse">Passe o mouse na foto</span>
            <span className="only-touch">Toque na foto</span>
          </p>
        </div>
      </div>
    </section>
  );
}
