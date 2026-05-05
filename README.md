# RADKE BI

BI financeiro standalone para **RADKE Soluções Intralogísticas**, alimentado pelo Omie.
Baseado no template `molde-gobi`. Sem build, sem banco, sem dependências npm.

## Como rodar

Modo um-clique (Windows):

```
START.bat
```

Ou manual:

```
node build-data.cjs        # gera data.js a partir de data/*.json
py -m http.server 5181     # serve em http://localhost:5181
```

> Não abra `index.html` direto no browser (`file://`) — os scripts JSX são
> carregados via `<script src=>` e quebram fora de um servidor HTTP.

## Estrutura

```
radke-bi/
├── data/                  # JSONs do Omie (gerados por fetch-omie.cjs)
│   ├── empresa.json
│   ├── categorias.json
│   ├── departamentos.json
│   ├── clientes.json
│   ├── contas_pagar.json
│   ├── contas_receber.json
│   ├── movimentos.json
│   └── _summary.json
├── assets/
│   └── bgp-logo-white.png
├── fetch-omie.cjs         # puxa dados do Omie -> data/
├── build-data.cjs         # transforma data/*.json -> data.js
├── data.js                # gerado (window.BIT.*) — NÃO editar à mão
├── data.mock.js           # dados sintéticos do template (referência)
├── index.html             # entrypoint
├── styles.css             # design system (não tocar sem alinhar)
├── components.jsx
├── pages-1.jsx            # Visão geral, Indicadores, Receita, Despesa
├── pages-2.jsx            # Fluxo, Tesouraria, Comparativo
├── START.bat
└── README.md
```

## Atualizar dados

Sempre que quiser refrescar os números do Omie:

```
node fetch-omie.cjs        # 2-5 min (paginação Omie)
node build-data.cjs        # ~1s
```

Aí dá refresh no browser. O `START.bat` faz o `build-data` automaticamente
no startup, mas **não** chama `fetch-omie.cjs` (que demora muito e bate em
rate-limit). Rode o fetch separadamente quando precisar.

## Filtro de status

No header tem um seletor segmentado:

- **Realizado** (default): só `status_titulo == 'PAGO'` ou `'RECEBIDO'`
- **A pagar/receber**: pendentes (`A VENCER`, `ATRASADO`, `VENCE HOJE`)
- **Tudo**: pago + pendente (cancelados sempre são excluídos)

A escolha persiste em `localStorage` (`radke.statusFilter`). Trocar o filtro
re-monta `window.BIT` instantaneamente sem reload.

Internamente, o `build-data.cjs` pré-calcula os 3 cortes em `window.BIT_SEGMENTS`,
então a troca é zero-custo.

## Limitações conhecidas (V1)

- **Sem saldos bancários reais**: a página Tesouraria mostra saldo acumulado
  derivado do fluxo realizado, não saldo bancário extraído do Omie.
- **Sem segregação de impostos**: as métricas EBITDA / Impostos foram removidas
  da V1 — Omie não retorna isso por categoria sem mapeamento manual.
- **Sem regime de competência separado**: os cortes "Realizado / A pagar/receber"
  cobrem 90% do uso. O filtro `caixa/competência` herdado do molde está inerte.
- **Comparativo fixo (Trim 1 vs Trim 2 do ano-ref)**. Para arbitrário,
  precisa rodar `build-data.cjs` com flags ou implementar agregação no client.

## Relatório IA

A 8ª aba do BI (**Relatório IA**) mostra uma análise executiva escrita pela
Anthropic Claude, com 6 seções (Visão Geral, Receita, Despesa, Fluxo,
Tesouraria, Comparativo) + conclusão e recomendações.

### Como gerar / regenerar

O relatório é gerado **offline** por `generate-report.cjs` (Node 18+). Não
roda no browser porque exigiria expor a `ANTHROPIC_API_KEY`.

```
node generate-report.cjs           # respeita cache de 1h se ja existe
node generate-report.cjs --force   # forca regeneracao
```

O `START.bat` chama esse passo automaticamente. A chave fica em `.env`
(gitignored). Saida: `report.json` no diretório do projeto.

Custo aproximado: ~7 chamadas a `claude-opus-4-7`, ~30s no total.

### Como exportar PDF

1. Abra o BI no browser (`http://localhost:5181`).
2. Clique em **Relatório IA** na sidebar.
3. Clique em **Exportar PDF** (ou pressione Ctrl+P).
4. No diálogo do browser: **Destination = Save as PDF**, layout A4, marque
   "Background graphics" se quiser preservar cores.
5. Salve.

O CSS `@media print` (em `styles.css`) força layout A4, esconde sidebar/
header/toolbar e quebra uma seção por página. Capa + 6 seções + conclusão
ficam em ~9 páginas.

### Limitações V1

- Apenas o segmento **Realizado** é coberto. Trocar o filtro Status no header
  não regenera o relatório (está congelado no `report.json`).
- Para refletir filtro `Tudo` ou `A pagar/receber`, V2 precisa gerar 3
  variantes (`report.realizado.json`, etc) e o frontend escolher conforme o
  filtro ativo.
