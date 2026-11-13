# Imagens e recursos visuais — origem, licença e uso

Última revisão: 13/11/2026.

## 1. Auditoria da seleção anterior (substituída)

A primeira seleção usava três fotos do Wikimedia Commons (Agência CNT, 2011–2012, CC BY 2.0)
e chegou a considerar `Scania_Brasil.JPG`. Elas foram **removidas** do projeto porque:

| Problema | Onde |
|---|---|
| Origem em thumbnail de 960–1280 px, câmera compacta, ruído e compressão visíveis | Todas |
| Caminhão pequeno no enquadramento, sem intenção de composição | BR-116/MG, BR-343/PI |
| Moldura/vinheta embutida na foto | BR-101/SC |
| Estética amadora, desalinhada ao posicionamento B2B | Todas |
| `Scania_Brasil.JPG`: enquadramento com orla urbana e postes cortando o quadro | (nunca entrou no projeto) |

Licenças estavam corretas; o motivo da substituição é **qualidade**.

## 2. Seleção atual

Critérios: fonte com licença verificada na página da foto, origem ≥ 1920 px para hero, caminhão
grande no quadro, luz natural, espaço negativo para texto, nenhuma pessoa identificável associada
a dados, sem dados de clientes.

| Arquivo (em `frontend/public/images/`) | Uso | Fonte | Autor | Local | Licença | Origem |
|---|---|---|---|---|---|---|
| `hero-estrada-por-do-sol-{2560,1600,960}.{avif,webp}` | Hero da landing (texto sobre a área de céu à esquerda) | [Unsplash — CtFk1YWtbyw](https://unsplash.com/photos/a-truck-on-a-road-CtFk1YWtbyw) | Natalia Marcelewicz ([@nataliila](https://unsplash.com/@nataliila)) | Croácia | [Unsplash License](https://unsplash.com/license) | 2560 × 1700 (baixada) |
| `rodovia-rural-sp-{1600,960}.{avif,webp}` | Seção "Feito para a estrada brasileira" | [Pexels — 19357316](https://www.pexels.com/photo/19357316/) | Raphael Brasileiro | Interior de São Paulo (fotógrafo de SP) | [Pexels License](https://www.pexels.com/license/) | 5184 × 3456 (baixada a 2400) |
| `motorista-cabine-{1600,960}.{avif,webp}` | Seção do motorista | [Pexels — 6720527](https://www.pexels.com/photo/6720527/) | Gustavo Fring | — | [Pexels License](https://www.pexels.com/license/) | 5760 × 3840 (baixada a 2000) |
| `patio-frota-aereo-{1600,960}.{avif,webp}` | Seção "Gestão da frota" (sugerida pelo fundador a partir da busca *gestão de frotas de caminhões* no Unsplash) | [Unsplash — kGoPcmpPT7c](https://unsplash.com/photos/parked-trucks-kGoPcmpPT7c) | Marcin Jozwiak ([@marcinjozwiak](https://unsplash.com/@marcinjozwiak)) | Jankowice, Polônia (vista aérea, sem marcas legíveis) | [Unsplash License](https://unsplash.com/license) | 2400 × 1600 (baixada) |
| `estrada-montanha-{1600,960}.{avif,webp}` | Tela de entrada (onboarding) | [Unsplash — uRPQ-yH23PE](https://unsplash.com/photos/a-blue-semi-truck-driving-down-a-mountain-road-uRPQ-yH23PE) | Juan Pablo Mascanfroni ([@juanmascan1978](https://unsplash.com/@juanmascan1978)) | Mendoza, Argentina | [Unsplash License](https://unsplash.com/license) | 2400 × 1351 (baixada) |

Notas de licença:
- **Unsplash License** e **Pexels License** permitem uso comercial gratuito, sem atribuição
  obrigatória; não permitem revender a foto sem modificação nem sugerir endosso das pessoas ou
  marcas retratadas. Mesmo assim creditamos os autores no rodapé da landing page.
- Logotipos de fabricantes eventualmente visíveis nos caminhões **não** indicam parceria; não
  usamos as fotos para sugerir endosso de marca.

Verificado em 13/11/2026 no build de produção servido como no GitHub Pages (`/GestorDeFrotas/`):
todas as imagens, o favicon, os SVGs da marca e as fontes Inter/Manrope carregam sem erro.

Tratamento aplicado: redimensionamento, conversão para **AVIF** (principal) e **WebP**
(fallback) com `sharp`, remoção de metadados. Nenhuma alteração de conteúdo.
Peso total: ~1,6 MB para 22 arquivos; a landing carrega no máximo 3 imagens por viewport,
com `srcset`/`sizes`, `loading="lazy"` fora da dobra e `fetchpriority="high"` no hero.

### Lacunas assumidas (sem foto, por falta de opção licenciada à altura)
- **Gestão de frota:** além da foto aérea de pátio, a landing mostra a própria interface do
  Fretuno (dados sintéticos), que comunica a gestão melhor que qualquer foto.
- **Abastecimento e oficina brasileiros:** não encontramos fotos de qualidade comercial com
  licença livre. Recomendação para o lançamento: produção fotográfica própria com
  autorização de imagem dos retratados.
- O hero é de uma rodovia na Croácia (escolhido por luz, composição e espaço para texto). Para
  a versão comercial, recomenda-se substituí-lo por produção própria em rodovia brasileira.

## 3. Tipografia

| Fonte | Uso | Licença | Distribuição |
|---|---|---|---|
| Manrope | Títulos, marca, KPIs | SIL Open Font License 1.1 | `@fontsource-variable/manrope` (empacotada no build) |
| Inter | Interface, formulários, tabelas | SIL Open Font License 1.1 | `@fontsource-variable/inter` |

## 4. Ícones

[Lucide](https://lucide.dev) — licença ISC. Nenhum emoji é usado como ícone.

## 5. Logotipo

Símbolo e logotipo Fretuno criados para este projeto (traçado geométrico original; o
logotipo usa o desenho das letras da Manrope convertido em curvas, permitido pela OFL).
Arquivos em `frontend/public/brand/`. Nome e marca **pendentes de validação jurídica e
registro** — ver `brand-guidelines.md`.

## 6. Dados

Placas, pessoas, clientes, postos, CNPJs e valores da demonstração são **sintéticos**
(`frontend/src/data/mock/fixtures.ts`).
