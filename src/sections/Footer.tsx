import { profile } from "../data/profile";

export function Footer() {
  return (
    <footer className="border-t border-line/60">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-muted sm:px-6 lg:px-8">
        <p>{profile.name}, 2026</p>
        <a href="#sobre" className="transition-colors hover:text-ink">
          Voltar ao topo
        </a>
        <p className="w-full text-[13px]">
          Tênis 3D:{" "}
          <a
            href="https://github.khronos.org/glTF-Assets/model/MaterialsVariantsShoe"
            target="_blank"
            rel="noreferrer"
            className="text-glow"
          >
            Materials Variants Shoe
          </a>
          , da Shopify, licença{" "}
          <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer" className="text-glow">
            CC BY 4.0
          </a>
          , variante Midnight com texturas reduzidas.
        </p>
      </div>
    </footer>
  );
}
