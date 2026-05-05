#!/usr/bin/env node
/**
 * Pre-compila JSX → JS minificado em UM unico bundle.
 * Antes: 3 .jsx files transformados em runtime pelo Babel-standalone (~5MB CDN
 * + parse + transform a cada page load → muito lento).
 * Agora: 1 app.bundle.js minificado (~50-100KB), zero runtime.
 *
 * Os .jsx originais usam variaveis globais cross-file (Icon, DATE_RANGES,
 * Sidebar, etc) — nao sao modulos. Estrategia: concatena ordem importa
 * (components.jsx → pages-1.jsx → pages-2.jsx → app.jsx do index.html)
 * e roda esbuild --transform pra resolver tudo em escopo unico.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const esbuild = require('esbuild');

const ROOT = __dirname;
const SOURCES = [
  'components.jsx',
  'pages-1.jsx',
  'pages-2.jsx',
  'pages-3.jsx',
];

(async () => {
  // Cada .jsx redeclara `const { useState } = React;` no topo (era pra Babel-
  // standalone funcionar com escopo isolado por <script>). Concatenado vira
  // duplicate declaration. Strip e re-injeta uma vez no inicio do bundle.
  const HOIST_HEADER = `\nvar { useState, useEffect, useMemo, useRef, useCallback, useLayoutEffect, Fragment } = React;\n`;
  const stripReactHooks = (src) => src.replace(/^\s*const\s*\{[^}]*\}\s*=\s*React\s*;?\s*$/gm, '');

  const concat = HOIST_HEADER + SOURCES.map((f) => {
    const body = stripReactHooks(fs.readFileSync(path.join(ROOT, f), 'utf8'));
    return `\n/* ===== ${f} ===== */\n${body}`;
  }).join('\n');

  // O App.jsx original esta inline no index.html. Movemos pra ca pra ficar
  // bundlado tambem. SE o operador editar index.html, manter a IIFE de boot.
  const APP_BODY = `
/* ===== App (raiz) ===== */
(function () {
  var useState = React.useState;
  var useEffect = React.useEffect;
  var PAGE_LABELS = {
    overview: '01 Visão geral',
    indicators: '02 Indicadores',
    receita: '03 Receita',
    despesa: '04 Despesa',
    fluxo: '05 Fluxo de caixa',
    tesouraria: '06 Tesouraria',
    comparativo: '07 Comparativo',
    relatorio: '08 Relatório IA',
    faturamento_produto: '09 Faturamento por Produto',
    curva_abc: '10 Curva ABC',
    marketing: '11 Marketing ADS',
    valuation: '12 Valuation',
  };
  function App() {
    var p = useState('overview'); var page = p[0], setPage = p[1];
    var f = useState(Object.assign({}, DEFAULT_FILTERS)); var filters = f[0], setFilters = f[1];
    var fo = useState(false); var filtersOpen = fo[0], setFiltersOpen = fo[1];
    var so = useState(false); var sidebarOpen = so[0], setSidebarOpen = so[1];
    var sf = useState(function () {
      try { return localStorage.getItem('radke.statusFilter') || 'realizado'; } catch (e) { return 'realizado'; }
    });
    var statusFilter = sf[0], setStatusFilter = sf[1];
    // Drilldown global: setado quando o usuario clica numa barra/linha de grafico.
    var dd = useState(null);
    var drilldown = dd[0], setDrilldown = dd[1];
    // Year selector: padrao = ano corrente (window.REF_YEAR)
    var ys = useState(function () {
      try { var y = parseInt(localStorage.getItem('radke.year'), 10); return y > 1900 ? y : (window.REF_YEAR || new Date().getFullYear()); } catch (e) { return window.REF_YEAR || new Date().getFullYear(); }
    });
    var year = ys[0], setYear = ys[1];

    useEffect(function () {
      try { localStorage.setItem('radke.statusFilter', statusFilter); } catch (e) {}
      if (typeof window._radkeMakeBit === 'function') {
        window.BIT = window._radkeMakeBit(statusFilter);
      }
      setDrilldown(null);
    }, [statusFilter]);

    useEffect(function () {
      try { localStorage.setItem('radke.year', String(year)); } catch (e) {}
      setDrilldown(null);
    }, [year]);

    var handleSetPage = function (newPage) {
      setPage(newPage);
      setSidebarOpen(false);
      setDrilldown(null);
    };

    var PageComp = ({
      overview: PageOverview,
      indicators: PageIndicators,
      receita: PageReceita,
      despesa: PageDespesa,
      fluxo: PageFluxo,
      tesouraria: PageTesouraria,
      comparativo: PageComparativo,
      relatorio: PageRelatorio,
      faturamento_produto: PageFaturamentoProduto,
      curva_abc: PageCurvaABC,
      marketing: PageMarketing,
      valuation: PageValuation,
    })[page];

    return (
      <div className={'app ' + (sidebarOpen ? 'sidebar-open' : '')} data-screen-label={PAGE_LABELS[page]}>
        <Sidebar active={page} onSelect={handleSetPage} open={sidebarOpen} />
        <div className="sidebar-backdrop" onClick={function () { setSidebarOpen(false); }} />
        <div className="main">
          <Header
            page={page}
            onToggleSidebar={function () { setSidebarOpen(function (o) { return !o; }); }}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            year={year}
            setYear={setYear}
          />
          <PageComp
            filters={filters}
            setFilters={setFilters}
            onOpenFilters={function () { setFiltersOpen(true); }}
            statusFilter={statusFilter}
            year={year}
            setYear={setYear}
            drilldown={drilldown}
            setDrilldown={setDrilldown}
          />
        </div>
        <FiltersDrawer open={filtersOpen} onClose={function () { setFiltersOpen(false); }} filters={filters} setFilters={setFilters} />
      </div>
    );
  }
  ReactDOM.createRoot(document.getElementById('root')).render(<App />);
})();
`;

  const finalSource = concat + '\n' + APP_BODY;

  const result = await esbuild.transform(finalSource, {
    loader: 'jsx',
    jsx: 'transform',
    minify: true,
    target: ['es2017'],
  });

  const out = path.join(ROOT, 'app.bundle.js');
  fs.writeFileSync(out, result.code);
  const sizeKB = (result.code.length / 1024).toFixed(1);
  console.log(`OK app.bundle.js (${sizeKB} KB) — concat de ${SOURCES.length} .jsx + App raiz`);
})().catch((e) => { console.error('ERR:', e.message); process.exit(1); });
