# Plano técnico do 3D

Documento interno do projeto. Nada daqui aparece pro visitante.

## Painel de testes
Abrir a página com `#dev` no fim do endereço (ex.: `http://localhost:5173/#dev`). Aparece o botão Desempenho com FPS, tempo de quadro, cenas desenhando, chamadas de desenho, triângulos, nível de qualidade e estado do canvas. Dá pra forçar o modo leve e simular movimento reduzido.

## Confirmações
- three.js r170: 676 KB sem compressão, 171 KB com gzip, 136 KB com Brotli.
- Um contexto WebGL só: um canvas e um renderizador pra todas as cenas.
- O laço de desenho para por completo quando nenhuma cena está na tela (0 quadros) e volta quando uma cena entra.
- Lê `prefers-reduced-motion` e reage se a configuração mudar com a página aberta.

## Ordem de carregamento
1. HTML pré-renderizado, CSS e a foto do Sobre: o texto aparece sem esperar JavaScript.
2. React (78 KB com gzip) hidrata a página.
3. three.js e as cenas (170 KB com gzip) quando o navegador fica livre, no máximo 1,5 s depois.
4. Tênis (470 KB) na primeira vez que o visitante revela os objetos ou quando o navegador fica livre de novo, no máximo 4 s depois.
5. Painel de testes (2 KB) só com `#dev`.

## Peso dos recursos
| Recurso | Peso |
|---|---|
| three.js (gzip / Brotli) | 171 / 136 KB |
| Tênis (único modelo baixado) | 470 KB |
| Texturas | 0 KB, geradas em código |
| Colete, arma, livro, halter e projetos | 0 KB, geometria em código |
| Foto recortada (celular / computador) | 23 / 46 KB |
| Total do 3D com Brotli | 606 KB |

O tênis fica em `public/models/tenis.glb`.

## Níveis de qualidade
1. Alta: resolução até 2x no computador e 1,5x no celular.
2. Média: 1x. Começa assim com até 4 núcleos ou até 3 GB de memória, ou cai pra cá se a média passar de 22 ms por quadro.
3. Leve: 0,75x, se continuar acima de 34 ms.
4. Sem WebGL: foto recortada no Sobre e ilustrações estáticas no resto.

## Medições (renderização por software)
| Cena | Chamadas | Triângulos |
|---|---|---|
| Sobre, objetos visíveis | 28 | 25 mil |
| Experiência | 22 a 32 | cerca de 95 mil (estimado) |
| Blintec | 23 | 10 mil |
| EmprestaCampus | 58 | 16 mil |
| TempGuard | 41 | 7 mil |

## Sobre
- Computador: hover na foto revela; Tab faz o mesmo. Celular: aparece sozinho ao entrar na tela, toque alterna.
- Tênis e halter na frente, livro atrás da cabeça. Entrada escalonada (0, 0,12 s e 0,22 s), depois flutuação e giro independentes, parallax pelo mouse.
- Tênis: Materials Variants Shoe (Shopify, CC BY 4.0), variante Midnight, reduzido de 7,8 MB pra 470 KB.

## Experiência
A rolagem da seção é dividida assim:
| Trecho da rolagem | O que acontece |
|---|---|
| 0 a 88% | Animação: colete, arma, disparo, trajetória, impacto, camadas, retenção, resultado |
| 88 a 93% | Legendas, fases e aviso somem |
| 90 a 96% | Luzes apagam |
| 94 a 100% | Cena escurece até o fundo |
| Depois | A cena solta e a experiência na Blintec entra, com revelação escalonada e a linha do tempo desenhando |

Fases dentro da animação (em % da animação): Colete 0 a 10, Arma 10 a 20, Disparo 20 a 25, Trajetória 25 a 45, Impacto 45 a 52, Camadas 52 a 68, Retenção 68 a 86, Resultado 86 a 100.

- Seção presa por 5,6 alturas de tela (4,6 no celular). Rolagem suavizada.
- Retenção é o ápice: luz geral baixa, foco no projétil, camadas da frente translúcidas e onda azul atravessando as camadas.
- Movimento reduzido: sem clarão, sem tremor e sem pulsação. A revelação da experiência vira só um fade curto.
- O aviso de representação ilustrativa fica visível durante toda a animação.

## Projetos
- Começa quando o bloco aparece 45% na tela; hover ou toque repete.
- Câmera parada; só se mexe o que é etapa do sistema.
- Estufas IoT: ciclo de 14 s com tarde quente, solo secando e fim de tarde escuro. O ESP32 liga a irrigação abaixo do mínimo de umidade do solo, a ventilação acima do limite de temperatura e a iluminação abaixo de 5.000 lux, com histerese (5 pontos, 1 °C, 1.000 lux). O botão troca a cultura: alface (24 °C, 60%) ou repolho (20 °C, 70%). Tudo em código, 0 KB.
- IA: cena da rede de nós guardada, fora da página até existir um projeto de IA real.
