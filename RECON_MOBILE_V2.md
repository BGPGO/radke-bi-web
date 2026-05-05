# Recon mobile V2 — radke-bi-web (ajustes pós Wave 2)

Issues reportados pelo usuário após primeiro round de fixes. Confirmados via Playwright em viewport 390×844.

## Issue V2-1 — Sidebar não scrolla, items cortados, logo espremida

**Métrica:** `.sidebar` clientHeight=844 vs scrollHeight=947 (precisa ~103px de scroll). `overflow-y: hidden` (BUG — deveria ser `auto`). 18 sb-item + 2 sub-headers (Geral/Outros) + brand + sb-user excedem a altura disponível em mobile.

**Logo:** `.sb-logo-img` natural=3072px, renderizado=140px (escala OK). O problema é o `.sb-brand` (área que envolve a logo) ficar apertado quando os items competem por espaço.

**Onde corrigir:**
- `styles.css` na regra `.sidebar` (~linha 80-110) ou no media query mobile (~linha 1422+).
- `components.jsx` Sidebar (linha 76+) se precisar reorganizar `sb-spacer` ou `sb-user`.

**Fix proposto:**
- Em mobile (≤900px ou ≤600px conforme padrão do projeto): `.sidebar { overflow-y: auto; -webkit-overflow-scrolling: touch; }`
- Considerar reduzir gap/padding entre items em mobile pra ganhar 100-150px de altura.
- Garantir `.sb-spacer` não force a altura (pode trocar por flex-grow zero em mobile).
- `.sb-user` pode virar `position: sticky; bottom: 0` ou ficar no fluxo normal sem flex-grow.

## Issue V2-2 — `.crm-meta` (CRM PIPELINE OPORTUNIDADES) com tiles minúsculos

**Onde:** card "METAS COMERCIAIS · 2026" do CRM tem um bloco `.crm-meta` com 4 `.crm-meta-box` (TICKET GANHO, TICKET PIPELINE (ABERTAS), TICKET PERDIDO, TICKET MÉDIO).

**Problema visual:** No mobile esses 4 tiles ficam em grid 2×2 (170px cada). Os valores (`R$ 14.593.457`) **quebram em 2 linhas** porque não cabem no `.cmb-value` (largura 138px). UX fica feia: "R$" numa linha, "14.593.457" em outra.

**Arquivo:** provavelmente `pages-4.jsx` (PageCRM, linha 731+) ou CSS em `styles.css` com seletores `.crm-meta`, `.crm-meta-box`, `.cmb-label`, `.cmb-value`.

**Fix proposto:** Em ≤640px transformar `.crm-meta` em **1 coluna** (um tile por linha, full width) — assim cada R$ valor cabe horizontal e fica legível. Alternativa: manter 2 colunas mas reduzir font-size do `.cmb-value` pra ~14px.

## Issue V2-3 — `.metric-strip` (Fluxo de Caixa) cards de indicador cortando

**Métrica:** `.metric-strip` clientWidth=354, **scrollWidth=388 (overflow +34px)**. Container tem 4 `.metric` × 193px em 2×2 grid. Valor `R$2.531.934,25` aparece como `R$2.531.934,2` (cortado).

**Onde:** PageFluxo (`pages-2.jsx` linha 4+) renderiza esse `.metric-strip` no topo da página. CSS provavelmente em `styles.css` com `.metric-strip`, `.metric`, `.m-value`, `.m-label`, `.m-pct`, `.m-bar`.

**Fix proposto:**
- Em ≤640px transformar `.metric-strip` em **1 coluna** (cada `.metric` full width). Idem ao Issue V2-2.
- Alternativa: 2 colunas mas reduzir `.m-value` font de ~22px pra ~16px e usar `font-feature-settings: "tnum"` pra números monoespaçados.

## Issue V2-4 — Gráficos de linha com labels amassados sobre os pontos

**Onde:** SVGs com `preserveAspectRatio="none"` e viewBox grande:
1. `.ind-line` — card "Visualização indicadores" da Visão Geral (PageOverview pages-1.jsx). Squad 2 já reduziu viewBox para 600×180 no mobile, mas os `<text>` labels (valores Y como `R$196.806,73`, `R$629.328,75`) ainda ficam grudados nos pontos da curva, criando sensação "amassada".
2. `.trend` — "Saldos acumulados por mês" do Fluxo de Caixa (PageFluxo pages-2.jsx). viewBox="0 0 1000 300" + preserveAspectRatio="none". **Não foi corrigido na V1** — mesma natureza que `.ind-line`.

**Fix proposto pages-1.jsx (`.ind-line` / IndicatorLine):**
- Em mobile, esconder ou simplificar os labels Y sobre os pontos. Opções:
  a) Mostrar labels só nos pontos extremos (max/min) em mobile.
  b) Reduzir font-size de 11px → 8.5px e mover offset pra cima.
  c) Trocar `<text>` em coords absolutas por tooltips (clique mostra valor) em mobile.
- Escolher (a) ou (b) — (c) é mudança maior.

**Fix proposto pages-2.jsx (`.trend`):**
- Mesma transformação que Squad 2 fez em `.ind-line`: hook `useIsMobile`, viewBox menor (1000→600 ou similar), padding interno proporcional. Aplicar também a quaisquer outros SVGs com `preserveAspectRatio="none"` em pages-2.jsx (provavelmente `.trend` aparece em outras páginas de Fluxo/Tesouraria).

## Sumário de afetação por arquivo

| Arquivo | Issues |
|---|---|
| `styles.css` | V2-1 (sidebar overflow + spacing mobile), V2-2 (.crm-meta grid mobile), V2-3 (.metric-strip grid mobile) |
| `components.jsx` | V2-1 (Sidebar layout, se necessário) |
| `pages-1.jsx` | V2-4 parcial (.ind-line: labels Y simplificados em mobile) |
| `pages-2.jsx` | V2-3 (estrutura .metric-strip se for JSX-side), V2-4 (.trend SVGs) |
| `pages-4.jsx` | V2-2 (PageCRM .crm-meta se for JSX-side) |
