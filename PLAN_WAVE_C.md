# Wave C — Replicar telas do PBIX RADKE no menu "Outros"

Origem: `G:/Meu Drive/BGP/CLIENTES/BI/195. RADKE SOLUÇÕES/Radke_bi - Personalizado.pbix`

## Telas descobertas no PBIX Personalizado (9 sections)

| # | Section | Visuals | Fonte de dados | Decisao |
|---|---------|---------|----------------|---------|
| 0 | **Capa** | 66 (line charts Saldo/Receita/Despesa/EBITDA% etc) | Modelo `data` (lancamentos) | Pular — overlap c/ Visão Geral local |
| 1 | **Hierarquia - Campanhas** | 23 (decompositionTree) | Facebook ADS | Pular — visual unico do Power BI |
| 2 | **Análise Profunda** | 47 (multiRowCard CPM/Impressões/Cliques) | Tabela `Facebook ADS` (= `RadkeADS.xlsx`) | ✅ REPLICAR → "Marketing ADS" |
| 3 | **FaturamentoPorProduto** | 34 (line+bar combo, pivot por familia/produto) | Tabela `Produto` (= `FaturamentoPorProduto.xlsx`) | ✅ REPLICAR → "Faturamento por Produto" |
| 4 | **Detalhado** | 28 (Curva ABC: line, bar por familia/ABC/produto) | Tabela `Curva ABC de produtos` (= `CurvaABCPRodutos.xlsx`) | ✅ REPLICAR → "Curva ABC" |
| 5 | **CRM** | 69 (Conversao funil, Vendas vs Meta, Projeção 30D) | Tabela `CRM` (do RD Station — sem export local) | ⚠️ PENDENTE (sem fonte local) |
| 6 | **Profunda cliente** | 28 (tableEx CRM.Conta + bar por contato) | Tabela `CRM` | ⚠️ PENDENTE (sem fonte local) |
| 7 | **Profunda Venda** | 25 (tableEx Produto+Situacao+Conta+Valor) | Tabela `CRM` | ⚠️ PENDENTE (sem fonte local) |
| 8 | Página 1 | 5 (template/teste) | — | Ignorar |

## Sources extras já no Drive (XLSX)

| Arquivo | Linhas | Conteudo |
|---------|--------|----------|
| `CurvaABCPRodutos.xlsx` | 191 | ABC, codigo produto, descricao, marca, modelo, familia, valor faturado, qty, % participacao, valor acumulado |
| `FaturamentoPorProduto.xlsx` | 1058 | Operacao, etapa, situacao, NF, datas (Excel serial), produto, qty, valor mercadoria, vendedor, cliente |
| `RadkeADS.xlsx` (sheet Formatted Report) | 36 | Campanha, conjunto, anuncio, alcance, impressoes, frequencia, valor BRL, CPM, cliques, CPC, CTR, leads |
| `Pagamentos Realizados.xlsx` | 22.474 | Lancamentos baixados (Tipo, Grupo, Categoria, Departamento, Vendedor, datas) |
| `Recebimentos Realizados.xlsx` | 3.893 | Idem para receitas |
| `Por periodo.xlsx` | 26.398 | Lancamentos completos por periodo (overlap com Pagamentos+Recebimentos) |
| `Meta.xlsx` | Ano:12 + Mes:12 | Metas mensais (R$ 1M/mes em 2025) |

## Plano de implementação

### Fase 1 — Ingest XLSX adicionais (sub-tarefa do líder)

Criar script `build-radke-extras.cjs` que le 3 XLSX (ABC, Faturamento, ADS) do Drive, gera `data/radke_extras.json` com agregações compactas, e adiciona bloco `RADKE_EXTRAS` ao `data.js`.

Output (`data/radke_extras.json`):
```json
{
  "abc": [ { abc, descricao, familia, valorFaturado, qtdFaturada, pctValor, valorAcumulado } ],
  "faturamento": {
    "porFamilia": [ { familia, valor, qtd } ],
    "porVendedor": [ { vendedor, valor, qtd } ],
    "porMes": [ { mes, valor } ],
    "totais": { totalValor, totalQtd, ticketMedio, numNFs }
  },
  "ads": {
    "campanhas": [ { campanha, alcance, impressoes, valor, cpm, cpc, ctr, cliques, leads } ],
    "totais": { gastoTotal, alcanceTotal, impressoesTotal, ctrMedio, leads }
  }
}
```

Adicionar em `data.js` no final: `window.BIT_RADKE_EXTRAS = {...JSON inline...};`

### Fase 2 — Criar `pages-3.jsx` com 3 telas (sub-agentes em paralelo)

Estrategia: novo arquivo isolado `pages-3.jsx`, registrar em `build-jsx.cjs` na lista SOURCES, expor `PageProduto`, `PageABC`, `PageMarketing` em `window.*`.

#### Sub-agente A → **PageFaturamentoProduto** (substitui placeholder `indicators` no Sidebar)
- KPIs (3 multiRowCards): Total Mercadoria, Qtd Total, Ticket Medio
- Bar list por **Familia de Produto** (top 12)
- Bar list por **Vendedor** (top 12)
- Trend line de faturamento por mes
- Tabela detalhada (Familia x Produto x Total) com scroll
- Drilldown por familia clica → filtra produtos da tabela

#### Sub-agente B → **PageCurvaABC** (substitui placeholder `reports`)
- 3 KPIs ABC: Qtd produtos A / B / C
- Bar list (top 20) Valor Faturado por Produto, color-coded por classe ABC (verde A, amber B, red C)
- Trend acumulado: % Participacao acumulada (curva ABC tipica: 80/15/5)
- Tabela completa com classes
- Filtro por classe ABC (slicer A/B/C)

#### Sub-agente C → **PageMarketing** (substitui placeholder `invest`)
- KPIs: Gasto total ADS, Alcance, Impressoes, CTR medio, Custo por resultado
- Bar list por campanha (Valor BRL)
- Multi-line chart Cliques vs Impressoes por campanha
- Tabela detalhada com todas as 36 campanhas

### Fase 3 — Ajuste Sidebar `components.jsx` (líder)

Remover badge "EM BREVE" dos 3 placeholders, trocar labels:
- `indicators` → "Faturamento"
- `reports` → "Curva ABC"
- `invest` → "Marketing"

`PAGE_TITLES` correspondente.

### Fase 4 — Build + smoke test

`node build-data.cjs` (se mexer em data.js direto, skip)
`node build-jsx.cjs`
`curl http://localhost:5181/`

## Restrições
- NAO modificar arquivos no Drive (so leitura)
- NAO instalar deps novas (`xlsx` ja esta no node_modules — verificar)
- Edits em `components.jsx` = cirurgicos (Wave A/B tambem editam ele)

## TODO para V2
- Ingest CRM (RD Station export) → `Profunda Cliente`, `Profunda Venda`, tela CRM
- Ingest `Por periodo.xlsx` → drilldown por vendedor/projeto/departamento
- Ingest `Meta.xlsx` → comparativo Realizado vs Meta (ja temos nos KPIs gerais mas nao por mes)
- Hierarquia/Decomposition tree do Facebook ADS por nivel campanha→conjunto→anuncio
