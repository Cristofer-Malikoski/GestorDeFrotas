# Fretuno — diretrizes de marca

> **Nome provisório.** "Fretuno" é o nome de trabalho do protótipo, **pendente de
> validação jurídica, registro de marca e disponibilidade de domínio**. O repositório
> continua se chamando `GestorDeFrotas`.

## Essência

| | |
|---|---|
| Categoria | Plataforma web de gestão de transporte rodoviário e frotas |
| Slogan | **Mais estrada. Menos papelada.** |
| Promessa | Sua operação em ordem. Sua frota em movimento. |
| Para quem | Transportadores autônomos, pequenos gestores e transportadoras |
| Personalidade | Confiável, direta, moderna, prática e humana |
| Não somos | ERP antigo, startup genérica de IA, rastreador, produto de luxo |

## Logotipo

O símbolo é uma **rota que desenha a letra F**: o traço sobe e faz a curva como uma
estrada (haste e barra superior), a barra do meio em verde marca o progresso, e o ponto
âmbar à frente é o próximo destino — avanço, não um caminhão de perfil.

| Versão | Arquivo | Uso |
|---|---|---|
| Horizontal (cor) | `frontend/public/brand/fretuno-horizontal.svg` | Cabeçalhos em fundo claro |
| Horizontal negativo | `fretuno-horizontal-negativo.svg` | Fundo azul profundo (sidebar, rodapé) |
| Horizontal mono | `fretuno-horizontal-mono.svg` | Impressão, documentos, 1 cor |
| Símbolo | `fretuno-symbol.svg` | Espaços quadrados em fundo claro |
| Símbolo mono | `fretuno-symbol-mono.svg` | Carimbo, 1 cor |
| Ícone de app / favicon | `fretuno-app-icon.svg`, `frontend/public/favicon.svg` | Aba do navegador, atalhos |

Na aplicação, o logotipo é renderizado pelo componente `Logo` (`src/components/brand/Logo.tsx`),
que usa os mesmos traçados.

Regras:
- Área de proteção: no mínimo a altura do ponto âmbar ao redor de todo o logotipo.
- Tamanho mínimo: símbolo 16 px; horizontal 96 px de largura.
- Não rotacionar, distorcer, aplicar sombra, gradiente ou contorno.
- Não trocar as cores do símbolo fora das versões listadas.

## Cores

| Nome | Hex | Papel | Uso permitido como texto? |
|---|---|---|---|
| Azul profundo | `#101E2B` | Marca, navegação, fundos escuros, **texto principal** | Sim (16,6:1 sobre branco) |
| Verde ação | `#28C6A1` | Botão primário, progresso, confirmação | **Não** sobre branco (2,1:1). Use como fundo com texto azul profundo (7,6:1) |
| Âmbar | `#F4B65E` | Atenção, pendências, detalhes gráficos | **Não** sobre branco. Use como fundo/realce com texto azul profundo |
| Gelo | `#F5F7F9` | Fundo da aplicação | — |
| Ardósia | `#64788A` | Ícones, bordas, texto ≥ 18 px | Somente texto grande ou sobre branco (4,6:1) |
| Branco | `#FFFFFF` | Cartões, tabelas, formulários | — |

### Variações acessíveis (tokens)

| Token | Hex | Para quê |
|---|---|---|
| `go-700` | `#12795F` | Verde como texto / ícone de sucesso (5,4:1) |
| `amber-700` | `#8A5300` | Âmbar como texto (6,3:1) |
| `bad-600` | `#C23A2F` | Erro, prejuízo (5,3:1) |
| `info-600` | `#2D63B8` | Informação, foco do teclado |
| `ink-3` | `#55687A` | Texto secundário pequeno sobre gelo (5,3:1) |

Regra de ouro: **cor nunca é o único sinal**. Ganho/prejuízo, estados e alertas sempre têm
texto ("Prejuízo", "Pendente"), sinal (+/−) ou ícone.

Os tokens vivem em `frontend/src/index.css` (`@theme` do Tailwind v4).

## Tipografia

| Fonte | Papel | Pesos |
|---|---|---|
| **Manrope** | Títulos, marca, números de destaque (KPIs) | 600–800 |
| **Inter** | Formulários, tabelas, navegação, textos operacionais | 400–600 |

- Corpo 16 px, linhas 1,5. Tabelas 14 px. Nunca abaixo de 12 px.
- Números sempre com algarismos tabulares (`num`/`font-kpi`) para alinhar colunas.
- Fontes empacotadas no build (sem Google Fonts), funcionando offline e sem rastreamento.

## Linguagem

Português do Brasil, frases curtas, verbo no início das ações.

| Use | Evite |
|---|---|
| Registrar abastecimento | Inserir registro de combustível |
| Nova viagem | Criar entidade viagem |
| Conferir lançamentos | Auditoria / compliance |
| Resultado do mês | EBITDA, lucro líquido |
| Salvar | Submeter, persistir |
| "Pendente: falta o comprovante" | "Erro de validação 422" |

IA e automação aparecem como **facilidade integrada** ("Preenchemos com o último posto"),
nunca como uma interface separada. Na demonstração, toda leitura de documento é
**simulada** e dita como tal.

## Direção visual

- **Landing page:** editorial, fotografia documental, grid amplo, muito espaço útil.
- **Aplicação:** clara e funcional; sidebar azul profundo para o gestor; cabeçalho simples
  para o motorista; cartões discretos (borda fina, sombra mínima); tabelas legíveis.
- Sem glassmorphism, gradientes chamativos, ilustrações decorativas ou emojis como ícones.
- Modo escuro: **não implementado** nesta versão (só seria entregue com acabamento completo).

## Fotografia

- Transporte rodoviário brasileiro real: caminhões em rodovias, postos, oficinas, cabines.
- Estética documental, luz natural, sem imagens com texto gerado ou veículos futuristas.
- Somente na landing page e no onboarding (tela de entrada) — nunca ocupando espaço de
  telas operacionais.
- Licença compatível e atribuição registrada em `image-assets.md`.
