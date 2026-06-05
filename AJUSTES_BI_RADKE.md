# Ajustes BI Radke — rodada Junho/2026

Fonte: `BI Radke.docx` (Downloads, 03/06/2026). 16 ajustes do cliente (Helmut).
Ordem de execução acordada com Thomas: **A → B → C → D → E** (entrega incremental).

## Contexto de dados (3 fontes)
- **Omie API ListarMovimentos** (auto diário GHA) → Receita, Despesa, Fluxo. ✅ atual.
- **Omie API CRM** (`fetch-omie-crm.cjs`, migrado commit a345f0f) → CRM. ✅ atual.
- **XLSX manual do Drive** (`build-radke-extras.cjs`) → Faturamento, Detalhado, Curva ABC,
  Profunda Cliente, Saldos. ❌ **defasado: parou em Abril/2026**. Bloco C migra p/ API.

## Buckets

### A — Frontend puro  ✅ FEITO + verificado (Playwright) — bundle compilado
- [x] #1  QTDE (data-labels) no gráfico de Leads (CRM) — pages-4.jsx, labels cyan sobre cada ponto
- [x] #3  Filtro do CRM por vendedor — pages-4.jsx, dropdown em .actions (7 opts), filtra rows+projeção
- [x] #7  Título "Vendas por Anúncio" → "VENDAS POR CATEGORIA" — pages-3.jsx (só título)
- [→] #9  Curva ABC filtro por ano — MOVIDO PRA BLOCO C (ABC vem de XLSX pré-agregado SEM dimensão de ano)
- [x] #12+1  1 mês filtrado → gráfico Receita×Despesa vira DIÁRIO — pages-1.jsx (OverviewBars tick adaptativo + dailyData de ALL_TX)

### B — Lógica nos movimentos  ✅ FEITO + verificado (Playwright)
- [x] #10  Faturamento bruto (gross): headline "Faturamento total" + porCat/porCli/chart somam gross (realizado+previsto). Combinado com #11 corrige a percepção de "recebido".
- [x] #11  Faturamento Serviço+Total por EMISSÃO (r[9] em ALL_TX, fallback r[1]) — pages-3.jsx
- [x] #12  Previsão de recebimento p/ receita prevista — build-data.cjs normalizeMovimento (dDtPrevisao em vez de dDtVenc só p/ natureza R prevista)
- [x] #15  Receita por COMPETÊNCIA/emissão — pages-1.jsx PageReceita reescrita lendo ALL_TX por r[9], drilldown próprio. Regime de caixa (Overview/Fluxo/Despesa) intacto.
- INFRA: build-data.cjs ALL_TX ganhou idx 9 (emissaoYM) e 10 (emissaoDia). data.js 1711→1811KB.

### C — Migração faturamento → API Omie  ✅ FEITO + RECONCILIADO NO CENTAVO
METODOLOGIA DESCOBERTA (2026-06-04): o XLSX/PBI = PEDIDOS DE VENDA (ListarPedidos), não NFs!
  Regra exata: faturado='S' && cancelado!=='S', mês por dFat, soma valor_mercadoria por item.
  Reconcile: jan 260864 EXATO · fev 829541 EXATO · abr 425104 EXATO · mar +0,27% (staleness).
  (Tentativa por ListarNF NÃO reconciliava — números 30-150% maiores. Pedidos é a fonte.)
- [x] #5  fetch-omie-pedidos.cjs (novo) + step no daily-refresh.yml (sem continue-on-error).
      Maio/2026 apareceu com R$ 1,3M que o XLSX nunca teve.
- [x] #4  Dedup remessa futura: excluir CFOP 5116/6116/5117/6117 (entrega) e manter 5922/6922
      (venda na data da venda). 47 itens / R$ 1.580.403,66 de dupla contagem removidos.
      ⚠️ PREMISSA p/ validar com Helmut: toda entrega futura teve "simples faturamento" antes.
- [x] #6  valor = vMerc + IPI por item (det.imposto.ipi.valor_ipi) em todo o lado produto.
- [x] #8  Profunda Cliente: fonte trocada p/ itens de pedidos faturados (c/ IPI).
- [x] #9  Curva ABC: filtro de ano (2021-2026) recomputando 80/15/5 client-side de itemsAll.
CONSISTÊNCIA: Faturamento = Curva ABC = Profunda Cliente = R$ 2.368.204,08 (2026).
NOTA: números novos ≠ PBI antigo de propósito (dedup #4 + IPI #6 + freshness #5) — avisar cliente.

### D — Pedidos não faturados  ✅ FEITO
- [x] #14  Série ROXA "Pedidos não faturados" no gráfico Receitas×Despesas (modo Tudo),
      empilhada na torre de receita + legenda. Conta só pedidos CONFIRMADOS sem NF
      (etapas 10/20/50; etapa 00=orçamento fica fora — eram R$ 26,7M de propostas mortas).
      Hoje: 6 pedidos / R$ 237.932 (R$ 198k previstos jun/2026). Mês = data_previsao.

### E — Modal de oportunidades  ✅ FEITO + verificado
- [x] #2  Clicar em vendedor/origem/motivo no CRM → modal (drawer-overlay) com oportunidades
      individuais (descricao, conta, fase, situação, ticket). pages-4.jsx. 62 ops no teste, ok.

### F — 🚫 BLOQUEADO
- [ ] #16  Filtro incluir/não contas fixas na projeção (Despesa).
      Thomas não sabe o critério de "conta fixa". Definir com Helmut/cliente.
      Proposta de heurística pendente: categorias recorrentes todo mês com valor estável.

## Notas técnicas
- Build pipeline: `.jsx` (pages-1/2/3, components) → `build-jsx.cjs` → `app.bundle.js`.
- Dados: `fetch-omie*.cjs` → `data/*.json` → `build-data.cjs`/`build-radke-extras.cjs` → `data.js`/`data-extras.js`.
- Campos Omie movimento: dDtVenc, dDtPrevisao, dDtEmissao, dDtPagamento, cStatus, cGrupo, cNatureza.
- Imagens dos ajustes extraídas em `.docx_imgs/` (gitignored).
