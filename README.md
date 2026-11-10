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

- `src/data/profile.ts`: nome, apresentação, links e dados da formação.
- `src/data/stack.ts`: grupos da stack.
- `src/sections/`: uma seção por arquivo (Sobre, Experiência, Projetos, Stack, Contato, rodapé).
- `src/three/scenes.js`: as cenas 3D (Sobre, sequência do colete e projetos), todas num canvas WebGL só.
- `src/styles/scenes.css`: estilos das seções com 3D.
- `public/models/tenis.glb` e `public/img/`: modelo do tênis e foto recortada.
- `docs/plano-tecnico.md`: pesos, níveis de qualidade e como testar o desempenho (`#dev` no endereço).

Fontes Inter e Space Grotesk sob a SIL Open Font License (licenças em `public/fonts`).
