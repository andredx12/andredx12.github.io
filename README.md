# Portfólio de André Quintino

Site pessoal em React 19, TypeScript, Vite e Tailwind CSS 4. Escuro, com azul elétrico, a ideia de camadas e cenas 3D em three.js.

## Rodar no computador

```bash
npm install
npm run dev
```

Abre em http://localhost:5173

## Gerar a versão final

```bash
npm run build
npm run preview
```

O `build` gera a pasta `dist/` e já escreve o HTML de todas as seções dentro do `index.html` (pré-renderização). O texto aparece antes do JavaScript carregar, o que deixa o site mais rápido e fácil de achar no Google.

## Publicar

Cada envio pra branch `main` roda o workflow `.github/workflows/deploy.yml`, que gera o `dist/` e publica em https://andredx12.github.io.

## Onde mexer no conteúdo

- `src/data/profile.ts`: nome, apresentação, links, disponibilidade e dados da formação.
- `src/data/experience.ts`: trajetória na Blintec (cargos, atividades e destaque).
- `src/data/projects.ts`: projetos, na ordem da página. Um projeto novo com cena existente é só mais um item aqui.
- `src/data/stack.ts`: grupos da stack.
- `src/sections/`: uma seção por arquivo; Experiência e Projetos têm pasta própria porque se dividem em partes.
- `src/data/vestSequence.ts`: fases, legendas e etiquetas da animação do colete.
- `src/hooks/useThreeScene.ts`: carrega o 3D sob demanda e monta ou desmonta a cena de cada componente.
- `src/three/`: as cenas 3D, todas num canvas WebGL só.
  - `engine/`: renderizador, laço que pausa fora da tela, qualidade adaptativa e movimento reduzido.
  - `lib/`: interpolação, texturas desenhadas em canvas, formas e luz de estúdio.
  - `scenes/`: Sobre, colete e uma cena por projeto.
- Estilos: as cores e fontes ficam só no `@theme` de `src/index.css`. `src/styles/base.css` tem as peças comuns, e cada seção com 3D tem seu CSS do lado do componente (`sobre.css`, `experiencia.css`, `projetos.css`). `npm run format` formata os CSS.
- `public/models/tenis.glb` e `public/img/`: modelo do tênis e foto recortada.
- `docs/plano-tecnico.md`: pesos, níveis de qualidade e como testar o desempenho (`#dev` no endereço).

Fontes Inter e Space Grotesk sob a SIL Open Font License (licenças em `public/fonts`).
