# Pesquisa UX — Gestor de Frotas

> Documento de pesquisa **secundária** (referências públicas, documentação de produtos e guias de design).
> **Nenhuma entrevista, teste de usabilidade ou medição com usuários reais foi realizada.**
> Tudo que depende de validação com o motorista ou com o gestor está marcado como **Hipótese**.

Última atualização: 13/11/2026.

## 1. Contexto e ponto de partida

O produto nasce de uma planilha operacional mantida pelo pai do fundador para um caminhão
(placa de referência IFL 8I60), com 12 abas mensais e um resumo anual. Segundo a descrição
do projeto, ela concentra:

- fretes (origem, destino, valor, cliente);
- abastecimentos (litros, valor, km);
- despesas (pedágio, alimentação, oficina, estacionamento etc.);
- impostos, seguros e manutenção;
- quilometragem;
- um resumo anual que consolida faturamento, despesas e resultado.

**Limitação desta pesquisa:** a planilha original está com acesso restrito (o link exige
login Google) e não pôde ser inspecionada durante este trabalho. A estrutura de dados foi
inferida a partir da descrição do projeto. As fixtures da demonstração são **sintéticas**
e devem ser revisadas quando a planilha puder ser comparada lado a lado.

### O que a planilha faz bem (e precisa ser preservado)

- Visão do **mês inteiro** em uma tela: o dono sabe "quanto entrou, quanto saiu, quanto sobrou".
- Flexibilidade: qualquer despesa nova vira uma linha.
- Fechamento mensal reconhecível (é o "relatório" que ele já entende).

### Onde a planilha gera trabalho repetitivo (o que o sistema deve eliminar)

| Dor | Por que acontece na planilha | Resposta do sistema |
|---|---|---|
| Redigitar placa, motorista, data, km | Cada linha é independente | Contexto da viagem/veículo pré-preenche tudo |
| Copiar abas a cada mês | Estrutura mensal manual | Mês é um filtro, não uma cópia |
| Somar manualmente / fórmulas quebradas | Fórmulas frágeis | Totais calculados pelo sistema |
| Lançamento duplicado passa despercebido | Sem validação | Detecção de duplicidade antes de salvar |
| Comprovante em papel separado da linha | Sem anexo | Documento anexado ao lançamento |
| Não sabe se um valor foi conferido | Sem status | Estados: rascunho, pendente, aprovado |

## 2. Referências consultadas

### Produtos de frota, TMS e captura de despesas
- Fleetio — Smart Uploads e leitura de comprovantes de combustível: <https://fleetio.com/features/smart-uploads>, <https://updates.fleetio.com/turn-fuel-receipts-into-reliable-fuel-data-without-the-manual-entry-3VKdcA>
- Motive — leitura de recibos de combustível e pedido de comprovante só quando falta detalhe: <https://gomotive.com/blog/ai-fuel-receipt-reading-close-fuel-spend-visibility-gap/>
- Simply Fleet — escaneamento de recibos e notas para frotas: <https://www.simplyfleet.app/blog/scanning-barcodes-receipts-and-invoices-for-fleets-a-practical-guide>
- Jodoo — revisão de abastecimentos atípicos com o motorista: <https://www.jodoo.com/ai/use-cases/fleet-fuel-management-system>
- HVI — registro de abastecimento em app móvel: <https://heavyvehicleinspection.com/case-study/post/the-hvi-mobile-experience>
- Expensify — SmartScan e duplicidade: <https://www.mintlify.com/Expensify/App/features/expenses/smartscan>, <https://help.expensify.com/articles/expensify-classic/expenses/How-to-prevent-duplicate-expenses>
- SAP Concur — verificação de recibo antes do envio (pre-submit receipt check): <https://www.concur.com/blog/article/ai-use-case-pre-submit-receipt-check-expense-compliance>, <https://community.concur.com/t5/What-s-New-in-Product/Pre-submit-receipt-check/ba-p/111967>

### Documento fiscal brasileiro
- Manual do DANFE NFC-e e QR Code (SEFAZ-RR): <https://www.sefaz.rr.gov.br/Manual_do_DANFE_NFC-e_QR_Code.pdf>
- Consulta de NFC-e por QR Code e chave de acesso: <https://nfe.io/blog/nota-fiscal/consulta-nfce/>, <https://simplifique.contmatic.com.br/blogs/consulta-nfc-e-2026>

### Formulários, erros e carga cognitiva
- NN/g — 4 princípios para reduzir carga cognitiva em formulários: <https://www.nngroup.com/articles/4-principles-reduce-cognitive-load/>
- NN/g — diretrizes de mensagens de erro: <https://www.nngroup.com/articles/error-message-guidelines/>
- NN/g — erros do usuário (slips e mistakes): <https://www.nngroup.com/articles/user-mistakes/>
- NN/g — controle e liberdade do usuário: <https://www.nngroup.com/articles/user-control-and-freedom/>
- Yale Usability — interação sem depender de memória: <https://usability.yale.edu/ux/best-practices/memory-free-interaction>
- GOV.UK Design System — question pages: <https://design-system.service.gov.uk/patterns/question-pages>
- GOV.UK — "one thing per page": <https://designnotes.blog.gov.uk/2015/07/03/one-thing-per-page/>
- Scottish Government Design System — check answers: <https://designsystem.gov.scot/patterns/check-answers>
- DWP Design System — add another thing: <https://design-system.dwp.gov.uk/patterns/add-another-thing/how-it-works>

### Acessibilidade e baixa familiaridade tecnológica
- WCAG 2.2 — novos critérios (Redundant Entry 3.3.7, Target Size 2.5.8, Accessible Authentication 3.3.8): <https://tetralogical.com/blog/2023/10/05/whats-new-wcag-2.2>, <https://dequeuniversity.com/resources/wcag-2.2>
- NIA — Making your website senior friendly (arquivo): <https://webarchive.library.unt.edu/web/20120915102518/http://www.nia.nih.gov/health/publication/making-your-website-senior-friendly>
- HHS — testes com usuários de baixo letramento: <https://health.gov/healthliteracyonline/test/full>
- Alzheimer's Society — design para pessoas mais velhas: <https://www.alzheimers.org.uk/blog/how-design-websites-older-people>

### Dashboards
- Stephen Few, *Information Dashboard Design* (via resumos secundários): <https://staceybarr.com/?p=5649>, <https://speckyboy.com/designing-information-dashboards/>
- IPA — Dashboards for Decisions: <https://data.poverty-action.org/data-science/data-visualization/communicating/monitoring-dashboards.html>
- Domo — erros comuns em dashboards: <https://www.domo.com/it/learn/article/top-10-dashboard-design-mistakes-and-what-to-do-about-them>

### Voz em ambiente de transporte
- Transport Topics — tecnologia de voz no caminhão e ruído: <https://ttnews.com/articles/trucking-technology-begins-find-its-voice>
- NHTSA — avaliação de interfaces de voz veiculares: <https://nhtsa.gov/document/vehicle-voice-control-interface-performance-evaluation-final-report>

**Qualidade das fontes:** grande parte do material sobre frotas, OCR e voz é de fornecedores
(marketing). Números de acurácia ou de economia de tempo citados por eles **não foram
verificados** e não são usados como premissa de design.

## 3. Descobertas

### 3.1 Lançamento manual × foto/OCR × QR Code fiscal × voz

| Método | Força | Risco | Decisão para o MVP web |
|---|---|---|---|
| **Manual com pré-preenchimento** | Previsível, funciona sempre, sem dependência externa | Digitação; erro de vírgula/valor | **Caminho principal.** Pré-preencher veículo, viagem, data, posto anterior e preço por litro recente; pedir só litros + valor + km. |
| **Foto + OCR** | Elimina digitação de vários campos | Leitura incerta (papel térmico, amassado, foto ruim); exige revisão | **Proposta de extração** marcada como incerta campo a campo; nunca salva direto. Na demo, a "leitura" é uma **fixture simulada e rotulada como tal**. |
| **QR Code da NFC-e** | Dado estruturado vindo da SEFAZ (CNPJ, total, data, itens), muito mais confiável que OCR | Consulta varia por estado; nem todo comprovante é NFC-e; erros de "chave inexistente" relatados | **Hipótese forte para o app móvel** — registrado em `api-needs.md`. Não simulado na demo. |
| **Voz** | Mãos livres | Ruído de motor/vento/estrada; correção de erro custa mais que digitar; segurança ao volante | **Fora do MVP.** Reavaliar com piloto real no caminhão. |

Conclusão: o maior ganho imediato **não** está em IA, e sim em **não pedir o que o sistema
já sabe**. OCR/QR entram como aceleradores com revisão explícita, nunca como fonte de
verdade automática para dados financeiros.

### 3.2 Baixa fricção para o motorista
- Fornecedores convergem em **um único lançamento** contendo veículo, motorista, km, quantidade, valor, fornecedor e comprovante — e não telas separadas para cada coisa.
- Motive pede o comprovante **só quando falta informação**, em vez de exigir sempre. → Anexo é opcional; a ausência vira pendência leve, não bloqueio.
- O padrão GOV.UK "uma coisa por página" serve para serviços longos e desconhecidos. Para uma tarefa curta e repetida 3–6 vezes por semana, um wizard aumenta o número de cliques. → **Um formulário curto com campos progressivos**, não wizard.
- WCAG 2.2 — *Redundant Entry* (3.3.7): informação já fornecida no mesmo processo não deve ser pedida de novo. Está alinhado ao princípio 1 do projeto.

### 3.3 Uso de dados anteriores e sugestões
- Yale e NN/g: pré-preencher o que o sistema sabe reduz carga de memória.
- Sugestões aplicáveis: veículo vinculado ao motorista; viagem em andamento; último posto; km anterior (para validar o novo km); preço médio do litro recente; categorias de despesa mais usadas pelo motorista.
- Sugestão deve ser **visível como sugestão** (ex.: "Último: Posto Serra Azul") e editável com um clique.

### 3.4 Informação incompleta sem bloquear a operação
- Concur trata problemas **antes do envio** com sugestões acionáveis, em vez de rejeitar depois.
- Decisão: o motorista pode **salvar com pendência** (ex.: sem comprovante, km não informado). O lançamento entra como "Pendente de conferência" e aparece na fila do gestor com o motivo explícito. Somente campos que tornam o registro inútil (valor, tipo) são obrigatórios.

### 3.5 Confirmação rápida de dados extraídos e revisão de documentos incertos
- Não encontramos documentação pública de como Expensify/Concur exibem confiança por campo. Inferência de design: mostrar o documento **ao lado** dos campos, destacar campos de baixa confiança, e exigir **confirmação explícita** quando a incerteza afeta valor, data ou litros (princípio 7).
- Na conferência do gestor: comparar valor lido × valor informado, mostrar divergência numericamente ("R$ 12,40 a mais que o informado") em vez de só um ícone.

### 3.6 Duplicidade
- Expensify sinaliza como duplicado o mesmo valor no mesmo dia; Concur compara data, tipo e valor (com tolerância).
- Decisão: verificar antes de salvar — mesmo veículo + mesmo tipo + valor igual (±1%) + data igual ou km muito próximo. Ação oferecida: "É outro lançamento" ou "Cancelar este". Não bloquear: abastecimentos reais repetidos no mesmo dia existem.

### 3.7 Dashboards úteis × decorativos
- Few: dashboard é a informação **necessária para um objetivo**, legível de relance; reduzir tinta não-informativa; preferir barras a medidores/velocímetros.
- IPA: se um número não muda nenhuma decisão, não pertence ao dashboard.
- Decisão para o gestor: 4 números (faturamento, despesas, resultado, custo por km), evolução mensal em barras com resultado em linha, lista de **ações pendentes** (conferências, viagens sem frete, divergências). Nada de gauges, mapas decorativos ou "número de logins".

### 3.8 Feedback, erros e correção
- NN/g: erro perto do campo, em linguagem simples, só depois que o erro acontece (não ao focar).
- Desfazer é preferível a confirmar para ações reversíveis; confirmação explícita fica para o irreversível ou financeiro.
- Decisão: toast "Abastecimento registrado — Desfazer" após salvar; confirmação explícita só para aprovar/rejeitar valores na conferência e para excluir.

### 3.9 Pouca familiaridade tecnológica
- Palavras conhecidas ("Abastecer", "Pedágio", "Viagem"), sem jargão ("lançamento" é usado com parcimônia).
- Alvos de clique ≥ 44 px no fluxo do motorista (acima do mínimo de 24 px da WCAG 2.2).
- Texto base 16 px, contraste AA, rótulos sempre visíveis (não usar placeholder como rótulo — NN/g).
- Layout consistente: a ação principal sempre no mesmo lugar.

## 4. Hipóteses não validadas

| # | Hipótese | Como validar |
|---|---|---|
| H1 | O motorista prefere lançar o abastecimento logo após abastecer, não no fim do dia | Observação/diário de uso no piloto |
| H2 | Litros + valor + km são os únicos campos que o motorista precisa digitar no abastecimento | Medir campos editados vs. aceitos no piloto |
| H3 | A leitura do QR Code da NFC-e cobre a maioria dos abastecimentos em postos de rodovia | Coletar amostra de comprovantes reais |
| H4 | O pai do fundador reconhece o "Relatório mensal" como equivalente à aba mensal da planilha | Sessão guiada com a demo, sem instruções prévias |
| H5 | Salvar com pendência não gera acúmulo excessivo na fila do gestor | Contar pendências/semana no piloto |
| H6 | Custo por km é o indicador que mais muda decisões de preço de frete | Entrevista com o gestor |
| H7 | Voz não compensa no ambiente da cabine | Piloto com medição de erros |

## 5. Decisões resultantes (resumo)

1. Formulários curtos, de uma tela, com campos progressivos — sem wizard.
2. Pré-preenchimento a partir de veículo, viagem em andamento e histórico.
3. "Salvar com pendência" em vez de bloquear.
4. Extração de documento é **proposta** com revisão campo a campo; na demo, simulada e rotulada.
5. Verificação de duplicidade antes de salvar, com escolha do usuário.
6. Motorista não vê faturamento, resultado ou margens.
7. Dashboard do gestor orientado a decisão + fila de ações.
8. Relatório mensal espelha a lógica da planilha (entradas, saídas, resultado) e exporta CSV.
9. Desfazer após salvar; confirmação explícita para aprovação financeira.
