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

// Permite rodar no GHA mesmo sem o Drive sincronizado: se XLSX falta,
// loga e devolve null pro chamador preservar o snapshot anterior.
function safeReadSheet(file, sheetName) {
  try { return readSheet(file, sheetName); }
  catch (e) {
    console.error(`  [SKIP] ${file}: ${(e.message||'').slice(0,80)} — preserva snapshot anterior`);
    return null;
  }
}

// Snapshot anterior usado como fallback quando algum XLSX está ausente.
let prev = {};
try { prev = JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch {}

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
const abcRaw = safeReadSheet('CurvaABCPRodutos.xlsx');
let abc = [];
let abcCount = { A: 0, B: 0, C: 0 };
if (abcRaw) {
  // XLSX traz a coluna ABC mas a classificação está embaralhada (A único, ordem inconsistente).
  // Recalculamos do zero: sort por valor faturado desc, classifica pela regra 80/15/5
  // (A = primeiros 80% da receita acumulada, B = 80-95%, C = 95-100%).
  const abcSrc = abcRaw.map(r => ({
    codigo: r['Código do Produto'] || '',
    descricao: (r['Descrição do Produto'] || '').toString().trim(),
    marca: r['Marca'] || '',
    familia: r['Família de Produto'] || 'Sem Família',
    unidade: r['Unidade'] || '',
    valorFaturado: num(r['Valor Faturado']),
    qtdFaturada: num(r['Quantidade Faturada']),
  })).filter(x => x.descricao && x.valorFaturado > 0)
    .sort((a, b) => b.valorFaturado - a.valorFaturado);
  const abcTotal = abcSrc.reduce((s, x) => s + x.valorFaturado, 0);
  let abcAcum = 0;
  abc = abcSrc.map((p, i) => {
    abcAcum += p.valorFaturado;
    const pctAcumulado = abcTotal > 0 ? (abcAcum / abcTotal) * 100 : 0;
    const pctValor = abcTotal > 0 ? (p.valorFaturado / abcTotal) * 100 : 0;
    let abcClass;
    if (pctAcumulado <= 80) abcClass = 'A';
    else if (pctAcumulado <= 95) abcClass = 'B';
    else abcClass = 'C';
    return {
      ...p, abc: abcClass, pctValor,
      valorAcumulado: abcAcum, pctAcumulado, ordem: i + 1,
    };
  });
  console.log('  ', abc.length, 'produtos · total R$', abcTotal.toFixed(2));
  abc.forEach(p => abcCount[p.abc]++);
  console.log('  classes (regra 80/15/5):', abcCount);
} else if (prev.abc) {
  abc = prev.abc.rows || [];
  abcCount = prev.abc.counts || abcCount;
  console.log('  preservando snapshot anterior: ' + abc.length + ' produtos');
}

console.log('\n=== Faturamento por Produto (API Omie — pedidos de venda) ===');
// Fonte: data/pedidos.json (fetch-omie-pedidos.cjs). Substitui FaturamentoPorProduto.xlsx (#5).
// METODOLOGIA (reconciliada 15/07/2026 na vírgula com a tela "Pedidos de Venda" do Omie
// do cliente — abril/2026 = R$ 356.023,83 exato):
//   faturado='S' && cancelado!=='S', mês por dFat,
//   EXCLUI pedidos com Categoria financeira "Remessa" (é o filtro que a tela do cliente usa
//   — nível PEDIDO, não CFOP), e o total do pedido = valor_total_pedido (mercadoria + IPI
//   + frete). A diferença entre valor_total_pedido e a soma dos itens entra como linha
//   "FRETE / OUTRAS DESPESAS" pra bater no centavo.
// ATENÇÃO: a exclusão por CFOP 5116/6116 (#4, regra antiga) foi substituída — a tela do
// cliente confia na Categoria digitada no pedido. Se uma nota de entrega futura for
// categorizada como venda (ex.: pedidos 732/734/735 de abr/2026, itens idênticos ao 6922
// do pedido 684 de março), ela CONTA de novo — semântica escolhida pelo cliente em 15/07.
// #6/#8 — valor = vMerc + IPI (valor total do produto c/ IPI). valorSemIPI preservado.
const REMESSA_FUTURA_RE = /^(5116|6116|5117|6117)$/; // ainda usada nos NÃO-faturados (#14)
// Categorias "Remessa" pelo cadastro (1.04.99 / 2.08.93 hoje) — resolvidas pelo nome.
const remessaCats = (function () {
  try {
    const cats = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'categorias.json'), 'utf8'));
    return new Set((Array.isArray(cats) ? cats : []).filter(c => /remessa/i.test(c.descricao || '')).map(c => c.codigo));
  } catch { return new Set(); }
})();
let pedidosData = null;
try { pedidosData = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'pedidos.json'), 'utf8')); }
catch (e) { console.error('  [SKIP] data/pedidos.json: ' + (e.message || '').slice(0, 60) + ' — preserva snapshot anterior'); }

// Ordens de Serviço (fetch-omie-os.cjs) — leg SERVIÇO dos não faturados (#14).
let osData = null;
try { osData = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'os.json'), 'utf8')); }
catch (e) { console.error('  [SKIP] data/os.json: ' + (e.message || '').slice(0, 60) + ' — serviço fica de fora'); }

// Lookup de cliente: data/clientes.json (já baixado pelo fetch-omie.cjs)
let cliNomeById = new Map();
try {
  const clis = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'clientes.json'), 'utf8'));
  for (const c of (Array.isArray(clis) ? clis : [])) {
    if (c.codigo_cliente_omie) cliNomeById.set(c.codigo_cliente_omie, c.razao_social || c.nome_fantasia || '');
  }
} catch {}
const parseBRdate = (s) => {
  const m = typeof s === 'string' && s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])) : null;
};

// agregacao helper (usada por Faturamento + outros)
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

let fatPorFamilia, fatPorVendedor, fatPorCliente, fatPorMes, fatTotais, fatDetalhado, fatProdutoMes, fatItemsAno, fatItemsAll, naoFaturados;
if (pedidosData && Array.isArray(pedidosData.pedidos)) {
  const fatItems = [];
  let remessaPedExcl = 0, remessaPedValor = 0, freteTotal = 0;
  // fallback: pedidos.json antigo (sem codCategoria) → mantém regra CFOP antiga pra não zerar
  const temCategoria = pedidosData.pedidos.some(p => p.codCategoria !== undefined);
  if (!temCategoria) console.error('  [AVISO] pedidos.json sem codCategoria — usando regra CFOP antiga (refetch necessário)');
  for (const p of pedidosData.pedidos) {
    if (p.faturado !== 'S' || p.cancelado === 'S') continue;
    const dEm = parseBRdate(p.dFat);
    if (!dEm) continue;
    // Exclusão nível PEDIDO pela Categoria financeira (regra da tela do Omie do cliente)
    if (temCategoria && remessaCats.has(p.codCategoria)) {
      remessaPedExcl++;
      remessaPedValor += p.valorTotalPedido || (p.itens || []).reduce((s, i) => s + (i.vMerc || 0) + (i.ipi || 0), 0);
      continue;
    }
    const cliente = cliNomeById.get(p.codCliente) || `Cliente ${p.codCliente || '?'}`;
    let somaItens = 0;
    for (const it of (p.itens || [])) {
      if (!temCategoria && REMESSA_FUTURA_RE.test(it.cfop)) continue; // fallback regra antiga (#4)
      const valor = (it.vMerc || 0) + (it.ipi || 0);
      somaItens += valor;
      fatItems.push({
        operacao: 'PEDIDO',
        situacao: 'Autorizado',
        nf: p.numero || '',
        dataEmissao: p.dFat,
        mes: dEm.getMonth(),
        ano: dEm.getFullYear(),
        cliente,
        produto: it.descricao || '',
        familia: it.familia || 'Sem Família',
        vendedor: p.vendedor || 'Sem Vendedor',
        qtd: it.qtd,
        valor, // #6 — total c/ IPI
        valorSemIPI: it.vMerc || 0,
        ipi: it.ipi || 0,
        cfop: it.cfop,
      });
    }
    // Frete/despesas do cabeçalho: valor_total_pedido − Σ itens. Entra como linha própria
    // pra Σ do BI == Σ "Valor Total do Pedido" da tela do Omie (na vírgula).
    const diff = temCategoria ? (p.valorTotalPedido || 0) - somaItens : 0;
    if (diff > 0.005) {
      freteTotal += diff;
      fatItems.push({
        operacao: 'PEDIDO', situacao: 'Autorizado', nf: p.numero || '',
        dataEmissao: p.dFat, mes: dEm.getMonth(), ano: dEm.getFullYear(),
        cliente, produto: 'FRETE / OUTRAS DESPESAS', familia: 'FRETE / OUTRAS DESPESAS',
        vendedor: p.vendedor || 'Sem Vendedor', qtd: 0,
        valor: Math.round(diff * 100) / 100, valorSemIPI: Math.round(diff * 100) / 100, ipi: 0, cfop: '',
      });
    }
  }
  console.log('  pedidos faturados → ' + fatItems.length + ' itens · pedidos Categoria=Remessa excluídos: '
    + remessaPedExcl + ' / R$ ' + remessaPedValor.toFixed(2) + ' · frete/despesas: R$ ' + freteTotal.toFixed(2));
  fatItemsAll = fatItems.filter(x => x.valor > 0); // multi-ano (#9 — Curva ABC com filtro de ano)

  // #14 — PEDIDOS/OS AINDA NÃO FATURADOS, separados por tipo (produto vs serviço) e status.
  // Conta só CONFIRMADOS aguardando faturamento (etapas != 00; 00 = orçamento/proposta morto
  // — milhares de R$ em propostas nunca convertidas — fica FORA, igual no PBI).
  //   • PRODUTO: data/pedidos.json (exclui remessa futura #4, valor = vMerc+IPI). ~R$ 200k.
  //   • SERVIÇO: data/os.json (valor = nValorTotal da OS). ~R$ 500k.
  // Cruzado 2026-06-17 com 2 prints do cliente: produto ~200k (a faturar), serviço ~500k
  // (mix atrasado + a faturar). atrasado = data_previsao < hoje.
  // porAno = produto+serviço combinados por mês de previsão (segmento roxo da Visão Geral).
  // detalhe = lista por pedido/OS p/ o modal de drilldown por fatia.
  naoFaturados = (function () {
    const hoje = new Date();
    // Monta cada leg como lista de entradas {numero,tipo,status,ano,mes,valor,cliente,descricao}.
    const mk = (tipo, numero, valor, dPrev, cliente, descricao) => {
      if (!(valor > 0)) return null;
      const d = dPrev || hoje;
      const status = (dPrev && dPrev < hoje) ? 'atrasado' : 'a_faturar';
      return { numero, tipo, status, ano: d.getFullYear(), mes: d.getMonth(), valor, cliente, descricao };
    };

    // PRODUTO (pedidos de venda) — sempre fresco (pedidos.json falha o workflow se ausente).
    const produtoDet = [];
    for (const p of (pedidosData && pedidosData.pedidos) || []) {
      if (p.faturado === 'S' || p.cancelado === 'S') continue;
      if (p.etapa === '00' || p.etapa === '') continue;
      const v = (p.itens || []).filter(i => !REMESSA_FUTURA_RE.test(i.cfop))
        .reduce((s, i) => s + (i.vMerc || 0) + (i.ipi || 0), 0);
      const d = parseBRdate(p.dataPrevisao) || parseBRdate(p.dInc);
      const cliente = cliNomeById.get(p.codCliente) || `Cliente ${p.codCliente || '?'}`;
      const desc = ((p.itens || []).map(i => i.descricao).filter(Boolean)[0] || '').slice(0, 120);
      const e = mk('produto', p.numero, v, d, cliente, desc);
      if (e) produtoDet.push(e);
    }

    // SERVIÇO (ordens de serviço) — os.json é efêmero (gitignored) e o fetch usa
    // continue-on-error. Se faltar, PRESERVA o serviço do snapshot anterior (radke_extras.json)
    // em vez de zerar (lição do incidente 11/05: nunca sobrescrever bom com vazio).
    let servicoDet;
    if (osData && Array.isArray(osData.os)) {
      servicoDet = [];
      for (const o of osData.os) {
        if (o.faturada === 'S' || o.cancelada === 'S') continue;
        if (o.etapa === '00' || o.etapa === '') continue;
        const d = parseBRdate(o.dataPrevisao) || parseBRdate(o.dInc);
        const cliente = cliNomeById.get(o.codCliente) || `Cliente ${o.codCliente || '?'}`;
        const e = mk('servico', o.numero, o.valorTotal || 0, d, cliente, o.descricao || '');
        if (e) servicoDet.push(e);
      }
    } else {
      servicoDet = ((prev.naoFaturados && prev.naoFaturados.detalhe) || []).filter(d => d.tipo === 'servico');
      console.error('  [os.json ausente] serviço preservado do snapshot: ' + servicoDet.length + ' OS');
    }

    // Merge produto + serviço → porAno (segmento roxo) + detalhe + agregados.
    const detalhe = [...produtoDet, ...servicoDet].sort((a, b) => b.valor - a.valor);
    const porAno = {};
    const acc = {
      produto: { total: 0, qtd: 0, atrasado: 0, aFaturar: 0 },
      servico: { total: 0, qtd: 0, atrasado: 0, aFaturar: 0 },
    };
    for (const e of detalhe) {
      if (!porAno[e.ano]) porAno[e.ano] = Array(12).fill(0);
      porAno[e.ano][e.mes] += e.valor;
      acc[e.tipo].total += e.valor; acc[e.tipo].qtd++;
      acc[e.tipo][e.status === 'atrasado' ? 'atrasado' : 'aFaturar'] += e.valor;
    }
    const totalGeral = acc.produto.total + acc.servico.total;
    const qtdPedidos = acc.produto.qtd + acc.servico.qtd;
    console.log('  não faturados (#14): produto R$ ' + acc.produto.total.toFixed(2) + ' (' + acc.produto.qtd + ' ped) · ' +
      'serviço R$ ' + acc.servico.total.toFixed(2) + ' (' + acc.servico.qtd + ' OS · atrasado ' +
      acc.servico.atrasado.toFixed(2) + ' / a faturar ' + acc.servico.aFaturar.toFixed(2) + ')');
    return { porAno, produto: acc.produto, servico: acc.servico, detalhe, totalGeral, qtdPedidos };
  })();

  // Ano de referência = ano max nos dados (último ano com faturamento)
  const anoRef = (() => {
    const ys = fatItems.map(x => x.ano).filter(Boolean);
    return ys.length ? Math.max(...ys) : new Date().getFullYear();
  })();
  fatItemsAno = fatItems.filter(x => x.ano === anoRef);
  console.log('  itens 2025+2026: ' + fatItems.length + ' | apenas ' + anoRef + ': ' + fatItemsAno.length);

  fatPorFamilia = aggBy(fatItemsAno, x => x.familia).slice(0, 20);
  fatPorVendedor = aggBy(fatItemsAno, x => x.vendedor).slice(0, 20);
  fatPorCliente = aggBy(fatItemsAno, x => x.cliente).slice(0, 15);

  fatPorMes = Array(12).fill(0).map((_, i) => ({
    m: ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'][i],
    valor: 0, qtd: 0,
  }));
  for (const it of fatItemsAno) {
    if (it.mes == null) continue;
    fatPorMes[it.mes].valor += it.valor;
    fatPorMes[it.mes].qtd += it.qtd;
  }

  fatTotais = {
    totalValor: fatItemsAno.reduce((s, x) => s + x.valor, 0),
    totalQtd: fatItemsAno.reduce((s, x) => s + x.qtd, 0),
    numItens: fatItemsAno.length,
    numNFs: new Set(fatItemsAno.map(x => x.nf).filter(Boolean)).size,
    numClientes: new Set(fatItemsAno.map(x => x.cliente).filter(Boolean)).size,
    numProdutos: new Set(fatItemsAno.map(x => x.produto).filter(Boolean)).size,
    anoRef,
  };
  fatTotais.ticketMedio = fatTotais.numNFs > 0 ? fatTotais.totalValor / fatTotais.numNFs : 0;
  console.log('  ' + anoRef + ': R$ ' + fatTotais.totalValor.toFixed(2) + ' | NFs: ' + fatTotais.numNFs + ' | ticketMedio: ' + fatTotais.ticketMedio.toFixed(2));

  fatDetalhado = aggBy(fatItemsAno, x => x.familia + ' ▸ ' + x.produto).slice(0, 100);

  fatProdutoMes = (function() {
    const map = new Map();
    for (const it of fatItemsAno) {
      if (it.mes == null) continue;
      if (!map.has(it.produto)) map.set(it.produto, { nome: it.produto, total: 0, meses: Array(12).fill(0) });
      const o = map.get(it.produto);
      o.total += it.valor;
      o.meses[it.mes] += it.valor;
    }
    return [...map.values()].sort((a, b) => b.total - a.total).slice(0, 12);
  })();
} else if (prev.faturamento) {
  // pedidos.json ausente — preserva snapshot anterior.
  fatPorFamilia = prev.faturamento.porFamilia || [];
  fatPorVendedor = prev.faturamento.porVendedor || [];
  fatPorCliente = prev.faturamento.porCliente || [];
  fatPorMes = prev.faturamento.porMes || [];
  fatDetalhado = prev.faturamento.detalhado || [];
  fatProdutoMes = prev.faturamento.produtoMes || [];
  fatTotais = prev.faturamento.totais || {};
  fatItemsAno = prev.faturamento.items || [];
  fatItemsAll = prev.faturamento.itemsAll || fatItemsAno;
  naoFaturados = prev.naoFaturados || { porAno: {}, totalGeral: 0, qtdPedidos: 0 };
  console.log('  preservando snapshot anterior: ' + (fatTotais.numNFs || 0) + ' NFs');
} else {
  fatPorFamilia = []; fatPorVendedor = []; fatPorCliente = [];
  fatPorMes = []; fatDetalhado = []; fatProdutoMes = [];
  fatTotais = {}; fatItemsAno = []; fatItemsAll = [];
  naoFaturados = { porAno: {}, totalGeral: 0, qtdPedidos: 0 };
}

// #9 — Curva ABC agora deriva dos pedidos da API (não mais do CurvaABCPRodutos.xlsx defasado).
// Recalcula 80/15/5 pro anoRef; o filtro de ano na página recomputa client-side de itemsAll.
if (fatItemsAll && fatItemsAll.length) {
  const itensAnoRef = fatItemsAll.filter(x => x.ano === (fatTotais && fatTotais.anoRef));
  const byProd = new Map();
  for (const it of itensAnoRef) {
    if (!byProd.has(it.produto)) byProd.set(it.produto, { codigo: '', descricao: it.produto, marca: '', familia: it.familia, unidade: '', valorFaturado: 0, qtdFaturada: 0 });
    const o = byProd.get(it.produto);
    o.valorFaturado += it.valor;
    o.qtdFaturada += it.qtd || 0;
  }
  const abcSrc = [...byProd.values()].filter(x => x.valorFaturado > 0).sort((a, b) => b.valorFaturado - a.valorFaturado);
  const abcTotal = abcSrc.reduce((s, x) => s + x.valorFaturado, 0);
  let abcAcum = 0;
  abc = abcSrc.map((p, i) => {
    abcAcum += p.valorFaturado;
    const pctAcumulado = abcTotal > 0 ? (abcAcum / abcTotal) * 100 : 0;
    return { ...p, abc: pctAcumulado <= 80 ? 'A' : pctAcumulado <= 95 ? 'B' : 'C',
      pctValor: abcTotal > 0 ? (p.valorFaturado / abcTotal) * 100 : 0,
      valorAcumulado: abcAcum, pctAcumulado, ordem: i + 1 };
  });
  abcCount = { A: 0, B: 0, C: 0 };
  abc.forEach(p => abcCount[p.abc]++);
  console.log('  Curva ABC (API, ano ' + (fatTotais && fatTotais.anoRef) + '): ' + abc.length + ' produtos · ' + JSON.stringify(abcCount));
}

console.log('\n=== Marketing ADS ===');
const adsRaw = safeReadSheet('RadkeADS.xlsx', 'Formatted Report');
let ads = [], adsTotais = {}, adsCampanhasAgg = [];
if (adsRaw) {
  ads = adsRaw.map(r => ({
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

  adsTotais = {
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
  const aggCampanha = (items) => {
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
  };
  adsCampanhasAgg = aggCampanha(ads);
} else if (prev.ads) {
  ads = prev.ads.rows || [];
  adsCampanhasAgg = prev.ads.campanhasAgg || [];
  adsTotais = prev.ads.totais || {};
  console.log('  preservando snapshot anterior: ' + (adsTotais.numCampanhas || 0) + ' campanhas');
}

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
    produtoMes: fatProdutoMes,
    totais: fatTotais,
    items: fatItemsAno, // raw items do ano (pra filtros reativos no client)
    itemsAll: fatItemsAll, // multi-ano — Curva ABC com filtro de ano (#9) + Profunda Cliente (#8)
  },
  naoFaturados, // #14 — pedidos ainda não faturados, por ano/mês da previsão

  ads: {
    rows: ads,
    campanhasAgg: adsCampanhasAgg,
    totais: adsTotais,
  },
  crm: (function() {
    try {
      // CRM agora vem da API Omie via fetch-omie-crm.cjs (não mais do XLSX).
      // Auditado em 2026-05-25: 82 ganhos, R$ 3.349.867,14 ticket ganho — bate centavo a
      // centavo com consolidado (33).xlsx. XLSX defasava porque dependia de export manual.
      const opPath = path.join(__dirname, 'data', 'oportunidades.json');
      const opData = JSON.parse(fs.readFileSync(opPath, 'utf8'));
      const raw = Array.isArray(opData.oportunidades) ? opData.oportunidades : [];

      // Converte DD/MM/YYYY → Date.
      const parseBR = (s) => {
        if (!s || typeof s !== 'string') return null;
        const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        if (!m) return null;
        const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
        return isNaN(d) ? null : d;
      };

      const rowsAll = raw.map(r => {
        const ganho = /^Conquistado/i.test(r.situacao || '');
        const motivo = r.motivo || '';
        // Mesma definição do XLSX: perdido = tem motivo ≠ 'Oportunidade nunca existiu' e não é ganho.
        const perdido = !ganho && motivo && motivo !== 'Oportunidade nunca existiu';
        const aberto = !ganho && !perdido;
        const dataIncl = parseBR(r.dInclusao);
        const dataAtual = parseBR(r.dAlteracao);
        const dataConcl = parseBR(r.dConclusao);
        const dataRef = ganho && dataConcl ? dataConcl : (dataAtual || dataIncl);
        return {
          descricao: r.descricao || '',
          fase: r.fase || '',
          situacao: r.situacao || '',
          ganho, perdido, aberto,
          motivo,
          vendedor: r.vendedor || 'Sem Vendedor',
          origem: r.origem || 'Sem Origem',
          tipo: r.tipo || '',
          produto: r.solucao || '',
          conta: r.conta || '',
          ticket: r.ticket || 0,
          produtos: r.produtos || 0,
          servicos: r.servicos || 0,
          recorrencia: r.recorrencia || 0,
          temperatura: r.temperatura || 0,
          anoPrev: r.anoPrev || 0,
          mesPrev: r.mesPrev || '',
          dataIncl: dataIncl ? dataIncl.toISOString().slice(0,10) : null,
          dataAtual: dataAtual ? dataAtual.toISOString().slice(0,10) : null,
          dataConcl: dataConcl ? dataConcl.toISOString().slice(0,10) : null,
          dataRef: dataRef ? dataRef.toISOString().slice(0,10) : null,
          ano: dataRef ? dataRef.getFullYear() : null,
          mes: dataRef ? dataRef.getMonth() : null,
          tempoCiclo: r.tempoCiclo || 0,
        };
      }).filter(x => x.descricao);

      // Filtro RADKE: excluir Prospect e Qualificação (fases muito iniciais
      // que o PBI da empresa não considera no pipeline ativo).
      const rows = rowsAll.filter(r => r.fase !== '01 Prospect' && r.fase !== '02 Qualificação');
      console.log('  fonte API Omie · ' + rowsAll.length + ' opps · filtro Prospect/Qualif removeu ' + (rowsAll.length - rows.length));

      // Funil (a partir de 03 Proposta). O funil cumulativo: passou pela fase X = chegou em X ou maior.
      const FASES_ORDER = ['03 Proposta', '04 Negociação', '05 Aguardando Pedido', '06 Conclusão'];
      const faseRank = (f) => FASES_ORDER.findIndex(x => x === f);
      const funil = FASES_ORDER.map(f => ({
        fase: f.replace(/^0\d /, ''),
        chave: f,
        atual: rows.filter(r => r.fase === f).length,
        cumulativo: rows.filter(r => faseRank(r.fase) >= faseRank(f)).length,
      }));

      const totalLeads = rows.length;
      const totalGanhos = rows.filter(r => r.ganho).length;
      const totalPerdidos = rows.filter(r => r.perdido).length;
      const totalAbertos = rows.filter(r => r.aberto).length;
      const taxaConversao = totalLeads > 0 ? (totalGanhos / totalLeads) * 100 : 0;

      const totalTicket = rows.reduce((s, r) => s + r.ticket, 0);
      const totalGanhoTicket = rows.filter(r => r.ganho).reduce((s, r) => s + r.ticket, 0);
      const totalAbertoTicket = rows.filter(r => r.aberto).reduce((s, r) => s + r.ticket, 0);
      const totalPerdidoTicket = rows.filter(r => r.perdido).reduce((s, r) => s + r.ticket, 0);
      const ticketMedio = totalLeads > 0 ? totalTicket / totalLeads : 0;

      // Aggregates
      const aggOpp = (keyFn) => {
        const m = new Map();
        for (const r of rows) {
          const k = keyFn(r) || 'Sem categoria';
          if (!m.has(k)) m.set(k, { name: k, qtd: 0, ganhos: 0, perdidos: 0, abertos: 0, ticket: 0, ticketGanho: 0 });
          const o = m.get(k);
          o.qtd++;
          if (r.ganho) { o.ganhos++; o.ticketGanho += r.ticket; }
          else if (r.perdido) o.perdidos++;
          else o.abertos++;
          o.ticket += r.ticket;
        }
        for (const o of m.values()) {
          o.conversao = o.qtd > 0 ? (o.ganhos / o.qtd) * 100 : 0;
        }
        return [...m.values()].sort((a, b) => b.ticket - a.ticket);
      };
      const porVendedor = aggOpp(r => r.vendedor);
      const porOrigem = aggOpp(r => r.origem);
      const porMotivo = aggOpp(r => r.motivo).filter(x => x.name && x.name !== 'Sem categoria');
      const porTipo = aggOpp(r => r.tipo).filter(x => x.name);
      const porProduto = aggOpp(r => r.produto).filter(x => x.name).slice(0, 15);
      const porConta = aggOpp(r => r.conta).filter(x => x.name).slice(0, 20);

      // Por mês (ano de referência = ano max de dataRef)
      const anos = rows.map(r => r.ano).filter(Boolean);
      const anoCRM = anos.length ? Math.max(...anos) : new Date().getFullYear();
      const porMes = Array(12).fill(0).map((_, i) => ({
        m: ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'][i],
        leads: 0, ganhos: 0, perdidos: 0, ticket: 0, ticketGanho: 0,
      }));
      for (const r of rows) {
        if (r.ano !== anoCRM || r.mes == null) continue;
        const o = porMes[r.mes];
        o.leads++;
        if (r.ganho) { o.ganhos++; o.ticketGanho += r.ticket; }
        else if (r.perdido) o.perdidos++;
        o.ticket += r.ticket;
      }

      console.log(`\n=== CRM ===`);
      console.log(`  ${totalLeads} oportunidades | ganhos: ${totalGanhos} (${taxaConversao.toFixed(1)}%) | perdidos: ${totalPerdidos} | abertos: ${totalAbertos}`);
      console.log(`  Ticket total: R$ ${totalTicket.toFixed(2)} | Ticket ganho: R$ ${totalGanhoTicket.toFixed(2)} | Médio: R$ ${ticketMedio.toFixed(2)}`);
      console.log(`  Funil: ${funil.map(f => f.chave + '=' + f.atual).join(' | ')}`);

      return {
        rows,
        funil,
        totais: {
          totalLeads, totalGanhos, totalPerdidos, totalAbertos,
          taxaConversao, totalTicket, totalGanhoTicket, totalAbertoTicket, totalPerdidoTicket,
          ticketMedio, anoCRM,
        },
        porVendedor, porOrigem, porMotivo, porTipo, porProduto, porConta, porMes,
      };
    } catch (e) {
      console.error('  CRM erro:', e.message);
      return null;
    }
  })(),
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
      if (prev.saldos) {
        console.error('  saldos erro: ' + (e.message||'').slice(0,80) + ' — preserva snapshot anterior');
        return prev.saldos;
      }
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
