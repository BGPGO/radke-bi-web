#!/usr/bin/env node
/**
 * build-radke-extras.cjs — agrega XLSX adicionais do PBIX Personalizado em data/radke_extras.json
 *
 * Fontes (somente leitura, no Drive):
 *  - CurvaABCPRodutos.xlsx     (191 produtos, classe ABC)
 *  - FaturamentoPorProduto.xlsx (1058 NFs/itens)
 *  - RadkeADS.xlsx (Formatted Report)  (36 campanhas Facebook)
 *
 * Saida:
 *  - data/radke_extras.json  (compactos, prontos pra serem inline em data.js)
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const XLSX = require('xlsx');

const DRIVE = 'G:/Meu Drive/BGP/CLIENTES/BI/195. RADKE SOLUÇÕES/BASES';
const OUT = path.join(__dirname, 'data', 'radke_extras.json');

function readSheet(file, sheetName) {
  const wb = XLSX.readFile(path.join(DRIVE, file));
  const sn = sheetName || wb.SheetNames[0];
  return XLSX.utils.sheet_to_json(wb.Sheets[sn], { defval: '' });
}

function num(v) {
  if (v == null || v === '') return 0;
  if (typeof v === 'number') return v;
  const n = Number(String(v).replace(/\./g, '').replace(',', '.'));
  return isNaN(n) ? 0 : n;
}

// Excel serial date -> dd/mm/yyyy + month
function excelToDate(serial) {
  if (typeof serial !== 'number' || serial < 1000) return null;
  // Excel epoch: 1900-01-01 (mas com bug do dia 60). serial 45667 ~= 2025-01-08
  const ms = (serial - 25569) * 86400 * 1000;
  return new Date(ms);
}

console.log('=== Curva ABC ===');
const abcRaw = readSheet('CurvaABCPRodutos.xlsx');
const abc = abcRaw.map(r => ({
  abc: r['ABC'] || 'X',
  codigo: r['Código do Produto'] || '',
  descricao: (r['Descrição do Produto'] || '').toString().trim(),
  marca: r['Marca'] || '',
  familia: r['Família de Produto'] || 'Sem Família',
  unidade: r['Unidade'] || '',
  valorFaturado: num(r['Valor Faturado']),
  qtdFaturada: num(r['Quantidade Faturada']),
  pctValor: num(r['% Participação (Valor)']),
  valorAcumulado: num(r['Valor Acumulado']),
  pctAcumulado: num(r['% Acumulado (Valor)']),
  ordem: num(r['Ordem']),
})).filter(x => x.descricao).sort((a, b) => a.ordem - b.ordem);
console.log('  ', abc.length, 'produtos');
const abcCount = { A: 0, B: 0, C: 0 };
abc.forEach(p => {
  const k = (p.abc || '').charAt(0).toUpperCase();
  if (abcCount[k] != null) abcCount[k]++;
});
console.log('  classes:', abcCount);

console.log('\n=== Faturamento por Produto ===');
const fatRaw = readSheet('FaturamentoPorProduto.xlsx');
// linhas de NF, cada linha = 1 item de NF
const fatItems = fatRaw.map(r => {
  const dEm = excelToDate(num(r['Data de Emissão']));
  return {
    operacao: r['Operação'] || '',
    situacao: r['Situação'] || '',
    nf: r['Nota Fiscal'] || '',
    dataEmissao: dEm ? `${String(dEm.getDate()).padStart(2,'0')}/${String(dEm.getMonth()+1).padStart(2,'0')}/${dEm.getFullYear()}` : '',
    mes: dEm ? dEm.getMonth() : null,
    ano: dEm ? dEm.getFullYear() : null,
    cliente: r['Cliente (Razão Social)'] || r['Cliente (Nome Fantasia)'] || r['Cliente'] || '',
    produto: r['Descrição do Produto'] || r['Produto'] || '',
    familia: r['Família de Produto'] || 'Sem Família',
    vendedor: r['Vendedor'] || 'Sem Vendedor',
    qtd: num(r['Quantidade']),
    valor: num(r['Total de Mercadoria'] || r['Valor Total'] || r['Valor Mercadoria']),
  };
}).filter(x => x.valor > 0); // ignora linhas zero
console.log('  itens com valor > 0:', fatItems.length);

// agregacoes
function aggBy(items, keyFn, valueFn = (x) => x.valor) {
  const map = new Map();
  for (const it of items) {
    const k = keyFn(it) || 'Sem categoria';
    if (!map.has(k)) map.set(k, { name: k, value: 0, qtd: 0 });
    const o = map.get(k);
    o.value += valueFn(it);
    o.qtd += it.qtd || 0;
  }
  return Array.from(map.values()).sort((a, b) => b.value - a.value);
}

const fatPorFamilia = aggBy(fatItems, x => x.familia).slice(0, 20);
const fatPorVendedor = aggBy(fatItems, x => x.vendedor).slice(0, 20);
const fatPorCliente = aggBy(fatItems, x => x.cliente).slice(0, 15);

// por mes (todos os anos juntos no acumulado, usar ano max)
const anoRef = (() => {
  const ys = fatItems.map(x => x.ano).filter(Boolean);
  return ys.length ? Math.max(...ys) : new Date().getFullYear();
})();
const fatPorMes = Array(12).fill(0).map((_, i) => ({
  m: ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'][i],
  valor: 0,
  qtd: 0,
}));
for (const it of fatItems) {
  if (it.ano !== anoRef || it.mes == null) continue;
  fatPorMes[it.mes].valor += it.valor;
  fatPorMes[it.mes].qtd += it.qtd;
}

const fatTotais = {
  totalValor: fatItems.reduce((s, x) => s + x.valor, 0),
  totalQtd: fatItems.reduce((s, x) => s + x.qtd, 0),
  numItens: fatItems.length,
  numNFs: new Set(fatItems.map(x => x.nf).filter(Boolean)).size,
  numClientes: new Set(fatItems.map(x => x.cliente).filter(Boolean)).size,
  numProdutos: new Set(fatItems.map(x => x.produto).filter(Boolean)).size,
  anoRef,
};
fatTotais.ticketMedio = fatTotais.numNFs > 0 ? fatTotais.totalValor / fatTotais.numNFs : 0;
console.log('  total R$', fatTotais.totalValor.toFixed(2), '| NFs:', fatTotais.numNFs, '| ticketMedio:', fatTotais.ticketMedio.toFixed(2));

// detalhamento familia x produto (top 50 produtos)
const fatDetalhado = aggBy(fatItems, x => x.familia + ' ▸ ' + x.produto).slice(0, 100);

console.log('\n=== Marketing ADS ===');
const adsRaw = readSheet('RadkeADS.xlsx', 'Formatted Report');
const ads = adsRaw.map(r => ({
  campanha: r['Nome da campanha'] || '',
  conjunto: r['Nome do conjunto de anúncios'] || '',
  anuncio: r['Nome do anúncio'] || '',
  status: r['Status de veiculação'] || '',
  alcance: num(r['Alcance']),
  impressoes: num(r['Impressões']),
  frequencia: num(r['Frequência']),
  resultados: num(r['Resultados']),
  custoPorResultado: num(r['Custo por resultado']),
  valorBRL: num(r['Valor usado (BRL)']),
  cpm: num(r['CPM (custo por 1.000 impressões)']),
  cliques: num(r['Cliques no link']),
  cpc: num(r['CPC (custo por clique no link)']),
  ctr: num(r['CTR (taxa de cliques no link)']),
  leads: num(r['Leads (formulário)']),
  cliquesTodos: num(r['Cliques (todos)']),
})).filter(x => x.campanha || x.valorBRL > 0);

const adsTotais = {
  gastoTotal: ads.reduce((s, x) => s + x.valorBRL, 0),
  alcanceTotal: ads.reduce((s, x) => s + x.alcance, 0),
  impressoesTotal: ads.reduce((s, x) => s + x.impressoes, 0),
  cliquesTotal: ads.reduce((s, x) => s + x.cliques, 0),
  resultadosTotal: ads.reduce((s, x) => s + x.resultados, 0),
  numCampanhas: new Set(ads.map(x => x.campanha).filter(Boolean)).size,
};
adsTotais.ctrMedio = adsTotais.impressoesTotal > 0 ? (adsTotais.cliquesTotal / adsTotais.impressoesTotal) * 100 : 0;
adsTotais.cpmMedio = adsTotais.impressoesTotal > 0 ? (adsTotais.gastoTotal / adsTotais.impressoesTotal) * 1000 : 0;
adsTotais.cpcMedio = adsTotais.cliquesTotal > 0 ? adsTotais.gastoTotal / adsTotais.cliquesTotal : 0;
console.log('  campanhas:', adsTotais.numCampanhas, '| gasto: R$', adsTotais.gastoTotal.toFixed(2), '| CTR:', adsTotais.ctrMedio.toFixed(2), '%');

// agg por campanha (alguns rows tem o mesmo nome em niveis diferentes)
function aggCampanha(items) {
  const map = new Map();
  for (const it of items) {
    if (!it.campanha) continue;
    const k = it.campanha;
    if (!map.has(k)) map.set(k, { campanha: k, valorBRL: 0, alcance: 0, impressoes: 0, cliques: 0, resultados: 0, leads: 0 });
    const o = map.get(k);
    o.valorBRL += it.valorBRL;
    o.alcance = Math.max(o.alcance, it.alcance);
    o.impressoes += it.impressoes;
    o.cliques += it.cliques;
    o.resultados += it.resultados;
    o.leads += it.leads;
  }
  for (const o of map.values()) {
    o.cpm = o.impressoes > 0 ? (o.valorBRL / o.impressoes) * 1000 : 0;
    o.cpc = o.cliques > 0 ? o.valorBRL / o.cliques : 0;
    o.ctr = o.impressoes > 0 ? (o.cliques / o.impressoes) * 100 : 0;
  }
  return Array.from(map.values()).sort((a, b) => b.valorBRL - a.valorBRL);
}
const adsCampanhasAgg = aggCampanha(ads);

const out = {
  fetched_at: new Date().toISOString(),
  abc: {
    rows: abc,
    counts: abcCount,
    total: abc.length,
  },
  faturamento: {
    porFamilia: fatPorFamilia,
    porVendedor: fatPorVendedor,
    porCliente: fatPorCliente,
    porMes: fatPorMes,
    detalhado: fatDetalhado,
    totais: fatTotais,
  },
  ads: {
    rows: ads,
    campanhasAgg: adsCampanhasAgg,
    totais: adsTotais,
  },
  saldos: (function() {
    try {
      const wb = XLSX.readFile(path.join(DRIVE, 'Saldos - Radke Soluções.xlsx'));
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null }).slice(1);
      const series = rows
        .filter(r => r[0] != null && r[2])
        .map(r => ({
          data: excelToDate(r[0]) ? excelToDate(r[0]).toISOString().slice(0, 10) : null,
          valor: num(r[1]),
          conta: String(r[2]).trim(),
        }))
        .filter(r => r.data);
      // Agrupa por data: total por dia + breakdown por conta
      const byDate = new Map();
      for (const r of series) {
        if (!byDate.has(r.data)) byDate.set(r.data, { data: r.data, total: 0, contas: {} });
        const o = byDate.get(r.data);
        o.contas[r.conta] = r.valor;
        o.total += r.valor;
      }
      const dailyArr = [...byDate.values()].sort((a, b) => a.data.localeCompare(b.data));
      const last = dailyArr[dailyArr.length - 1] || null;
      console.log(`\n=== Saldos ===\n  ${dailyArr.length} dias | ultima data: ${last && last.data} | total: R$ ${last && last.total.toFixed(2)}`);
      return { daily: dailyArr, last, contas: [...new Set(series.map(r => r.conta))] };
    } catch (e) {
      console.error('  saldos erro:', e.message);
      return { daily: [], last: null, contas: [] };
    }
  })(),
};

fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
const stat = fs.statSync(OUT);
console.log(`\n=== OK ===\n  ${OUT} (${(stat.size / 1024).toFixed(1)} KB)`);

// Tambem grava data-extras.js no root pro index.html carregar via <script>.
const OUT_JS = path.join(__dirname, 'data-extras.js');
const js = '/* RADKE EXTRAS — gerado por build-radke-extras.cjs (le 3 XLSX do Drive). */\n' +
  'window.BIT_RADKE_EXTRAS = ' + JSON.stringify(out) + ';\n';
fs.writeFileSync(OUT_JS, js);
const stat2 = fs.statSync(OUT_JS);
console.log(`  ${OUT_JS} (${(stat2.size / 1024).toFixed(1)} KB)`);
