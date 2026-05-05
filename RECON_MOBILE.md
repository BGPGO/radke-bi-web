# Recon mobile — radke-bi-web (viewport 390×844 / iPhone 14)

Varredura de 16 telas em viewport mobile. Métricas coletadas via Playwright + DOM walk.

## Issue #1 — `bar-list.with-bars` estoura horizontalmente quando rótulos são longos

**Causa raiz:** `.bar-list.with-bars .row-meta` é `display: flex` com `.label` (nowrap+ellipsis+overflow:hidden) e `.val` (nowrap). Mas `.label` não tem `min-width: 0` nem `flex: 1 1 auto`, e `.val` não tem `flex-shrink: 0`. Resultado: nomes longos forçam a row-meta a expandir além do container, empurrando o valor pra fora do viewport.

**Cards afetados (sw = scrollWidth, w = clientWidth, viewW = 390):**

| Página | Card | sw | w | overflow |
|---|---|---|---|---|
| Receita | Receita por cliente | 483 | 354 | +129px |
| Despesa | Despesas por categoria | 415 | 354 | +61px |
| Faturamento | RANKING POR PRODUTO | 434 | 354 | +80px |
| Faturamento | RANKING POR VENDEDOR | 434 | 354 | +80px |
| Curva ABC | Top 20 produtos | 448 | 354 | +94px |
| Marketing ADS | CLIQUES POR CAMPANHA | 375 | 354 | +21px |
| CRM | POR VENDEDOR | 370 | 354 | +16px |

**Fix proposto (CSS-only em `styles.css`):**

```css
.bar-list.with-bars .row-meta { gap: 8px; min-width: 0; }
.bar-list.with-bars .row-meta .label {
  min-width: 0;
  flex: 1 1 auto;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.bar-list.with-bars .row-meta .val { flex-shrink: 0; }
```

## Issue #2 — SVG `.ind-line` (Visão Geral → "Visualização indicadores") fica achatado/distorcido no mobile

**Onde:** `pages-1.jsx` PageOverview, card "Visualização indicadores".

**SVG atual:** `<svg className="ind-line" viewBox="0 0 1100 240" preserveAspectRatio="none" style={{width:"100%", height:"240px"}}>`

**Problema:** No desktop o SVG é largo (1100×240, ratio 4.6:1). No mobile width=326px (após padding), height fixo em 240px. Como `preserveAspectRatio="none"` estica o conteúdo, os pontos do gráfico ficam comprimidos no eixo X (labels jan/fev sobrepostos no canto), criando sensação de "achatamento" no eixo da série temporal.

**Fix proposto:** Remover `preserveAspectRatio="none"` (ou trocar pra `xMidYMid meet`) E reduzir altura no mobile (160-180px ao invés de 240px) via media query ou inline style condicional baseado em `window.innerWidth`. Verificar se outros SVGs do mesmo tipo (`.bar-chart`, `.cf-chart`, etc) também usam preserveAspectRatio="none" — se sim, mesma correção.

## Issue #3 — Header com botão "Export" cortado na direita

**Onde:** `components.jsx` Header (linha 258 em diante).

**Métrica:** `.header` clientWidth=390, scrollWidth=435 (overflow X +45px com `overflow-x: visible`). O botão "Exportar" fica parcialmente fora do viewport.

**Conteúdo do header em ordem:** hamburger (.hd-menu-btn) → year select → month select → status seg → export button → ...

**Fix proposto:**
- Em `@media (max-width: 600px)`: reduzir botão "Exportar" pra ícone só (sem texto), OU empilhar em uma segunda linha com `flex-wrap: wrap`, OU mover `Exportar` pra dentro de um menu overflow (...).
- Diminuir gap entre os controles em mobile.

## Issue #4 — Página Valuation estoura layout (cards w=395 num viewport de 390)

**Onde:** `pages-3.jsx` PageValuation.

**Métrica:** `.main` mainSW=435 com clientWidth=390 (escondido por `overflow:hidden`). O `.page` interno tem w=380, sw=421. Todos os 4 cards medem 395px (5px maiores que viewport). Resultado: cards "vazam" pela direita (visualmente cortados).

**Causa provável:** algum card de Valuation tem `min-width` fixo, padding excessivo, ou tabela embutida que força largura. Card "Premissas editáveis" tem 714px de altura — provavelmente uma grade de inputs/sliders que não está usando `1fr` corretamente.

**Fix proposto:** Investigar PageValuation em `pages-3.jsx` (linha 807). Verificar se há `style={{minWidth: "..."}}`, grid com colunas fixas em px, ou tabela sem wrapper de scroll. Aplicar `min-width: 0` nos containers e responsividade adequada.

## Issue #5 — Tabelas wide dentro de cards (9 ocorrências) — verificar wrappers

Cards com `wideTable: true` (tabela.scrollWidth > card.clientWidth):

- Receita → "Extrato de receitas"
- Despesa → "Extrato de despesas"
- Fluxo de Caixa → "Fluxo de caixa"
- Tesouraria → "Fluxo a vencer"
- Comparativo → "Análise comparativa entre períodos"
- Faturamento → "ANÁLISE DE PRODUTOS POR ANÚNCIO"
- Curva ABC → "Tabela completa"
- Valuation → "Projeção 5 anos"
- Detalhado → "QUANTIDADE ACUMULADA × VALOR FATURADO"

**Verificação necessária:** essas tabelas devem estar dentro de um wrapper `<div style={{overflowX:"auto"}}>` (ou classe equivalente). Se não tiverem, a tabela fica visualmente cortada. Se já têm, OK — só fica scroll horizontal interno (UX aceitável em mobile pra dados densos).

## Issue #6 — Páginas que retornaram sem `.card` no DOM

- Relatório IA (08): provavelmente carrega async/erro de fetch — não é bug de layout estritamente; mas vale verificar se a tela mostra mensagem decente em mobile.
- Hierarquia ADS (13): idem.

## Sumário de afetação por arquivo

| Arquivo | Issues |
|---|---|
| `styles.css` | #1 (root cause: `bar-list.with-bars`), #3 (header mobile) |
| `components.jsx` | #3 (Header layout) |
| `pages-1.jsx` | #2 (SVG ind-line PageOverview), parcial #5 (tabelas Receita/Despesa) |
| `pages-2.jsx` | #5 (tabelas Fluxo/Tesouraria/Comparativo) |
| `pages-3.jsx` | #4 (Valuation overflow), #5 (tabelas Faturamento/CurvaABC/Valuation) |
| `pages-4.jsx` | #5 (tabela Detalhado) |
