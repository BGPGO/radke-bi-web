#!/usr/bin/env node
/**
 * fetch-omie-pedidos.cjs — pulla pedidos de venda + lookups (vendedores, produtos) da Omie.
 * Saída: data/pedidos.json
 *
 * É a fonte do FATURAMENTO POR PRODUTO (substitui FaturamentoPorProduto.xlsx do Drive) e dos
 * PEDIDOS NÃO FATURADOS (#14).
 *
 * Metodologia validada em 2026-06-04 contra o XLSX/PBI:
 *   faturado='S' + mês por dFat + soma de valor_mercadoria por item
 *   → bate NO CENTAVO com o XLSX em janeiro/2026 (R$ 260.864,00).
 *   Diferenças em fev-abr = staleness do XLSX manual (export parado em abril) — ajuste #5.
 *
 * Dedup remessa futura (#4) NÃO é feito aqui — fica no build-radke-extras.cjs
 * (excluir CFOP 5116/6116/5117/6117), pra manter o raw completo.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

try { require('dotenv').config({ path: path.join(__dirname, '.env') }); } catch {}
const APP_KEY = process.env.OMIE_APP_KEY || '925971407361';
const APP_SECRET = process.env.OMIE_APP_SECRET || '5825074fc4731e98d49dbe826b1bf670';
const BASE = 'https://app.omie.com.br/api/v1';
const OUT = path.join(__dirname, 'data');
fs.mkdirSync(OUT, { recursive: true });

const PAGE_DELAY_MS = 300;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function call(p, method, params, retries = 8) {
  const body = JSON.stringify({ call: method, app_key: APP_KEY, app_secret: APP_SECRET, param: [params] });
  let res;
  try {
    res = await fetch(`${BASE}${p}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
  } catch (e) {
    if (retries > 0) { await sleep(2000); return call(p, method, params, retries - 1); }
    throw e;
  }
  const j = await res.json().catch(() => null);
  if (!j) {
    if (retries > 0) { await sleep(2000); return call(p, method, params, retries - 1); }
    throw new Error(`${method}: bad JSON (${res.status})`);
  }
  if (j.faultstring) {
    const transient = /Consumo|excedido|simultane|busy|Broken|gateway|timeout|503|502|504/i.test(j.faultstring);
    if (transient && retries > 0) {
      const wait = Math.min(30000, 2000 * (9 - retries));
      console.error(`  [retry] ${method} → ${j.faultstring.slice(0, 60)} → wait ${wait}ms`);
      await sleep(wait);
      return call(p, method, params, retries - 1);
    }
    throw new Error(`${method}: ${j.faultstring}`);
  }
  return j;
}

async function pullPaged(label, apiPath, method, baseParam, listKey, pageSize = 50) {
  const all = [];
  const first = await call(apiPath, method, { ...baseParam, pagina: 1, registros_por_pagina: pageSize });
  const totalPages = first.total_de_paginas || 1;
  console.log(`  [${label}] ${first.total_de_registros || 0} registros em ${totalPages} pgs`);
  all.push(...(first[listKey] || []));
  for (let p = 2; p <= totalPages; p++) {
    await sleep(PAGE_DELAY_MS);
    const r = await call(apiPath, method, { ...baseParam, pagina: p, registros_por_pagina: pageSize });
    all.push(...(r[listKey] || []));
    if (p % 5 === 0 || p === totalPages) process.stdout.write(`  [${label}] pag ${p}/${totalPages}\r`);
  }
  console.log(`  [${label}] OK ${all.length}                            `);
  return all;
}

(async () => {
  console.log('=== Lookups (vendedores + produtos) ===');
  const [vendedoresRaw, produtosRaw] = await Promise.all([
    pullPaged('vendedores', '/geral/vendedores/', 'ListarVendedores', {}, 'cadastro', 50),
    pullPaged('produtos', '/geral/produtos/', 'ListarProdutos',
      { apenas_importado_api: 'N', filtrar_apenas_omiepdv: 'N' }, 'produto_servico_cadastro', 500),
  ]);

  const vendedorById = new Map(vendedoresRaw.map(v => [v.codigo, v.nome]));
  const produtoById = new Map(produtosRaw.map(p => [p.codigo_produto, {
    familia: p.descricao_familia || '',
    marca: p.marca || '',
    unidade: p.unidade || '',
  }]));
  console.log(`  vendedores: ${vendedorById.size} | produtos: ${produtoById.size}`);

  console.log('\n=== Pedidos de venda ===');
  const pedsRaw = await pullPaged('pedidos', '/produtos/pedido/', 'ListarPedidos',
    { apenas_importado_api: 'N' }, 'pedido_venda_produto', 50);

  const pedidos = pedsRaw.map(p => {
    const cab = p.cabecalho || {};
    const inf = p.infoCadastro || {};
    const adic = p.informacoes_adicionais || {};
    const vendNome = vendedorById.get(adic.codVend) || '';
    return {
      numero: cab.numero_pedido || '',
      codigo: cab.codigo_pedido,
      etapa: cab.etapa || '',
      dataPrevisao: cab.data_previsao || '',
      dInc: inf.dInc || '',
      dFat: inf.dFat || '',
      faturado: inf.faturado || 'N',
      autorizado: inf.autorizado || 'N',
      cancelado: inf.cancelado || 'N',
      devolvido: inf.devolvido || 'N',
      codCliente: cab.codigo_cliente || null,
      vendedor: vendNome,
      itens: (p.det || []).map(d => {
        const pr = d.produto || {};
        const lookup = produtoById.get(pr.codigo_produto) || {};
        return {
          cfop: String(pr.cfop || '').replace(/\./g, ''),
          codProduto: pr.codigo_produto,
          descricao: pr.descricao || '',
          familia: lookup.familia || 'Sem Família',
          qtd: pr.quantidade || 0,
          vUnit: pr.valor_unitario || 0,
          vMerc: pr.valor_mercadoria || 0,
          ipi: (d.imposto && d.imposto.ipi && d.imposto.ipi.valor_ipi) || 0,
        };
      }),
    };
  });

  const outPath = path.join(OUT, 'pedidos.json');
  fs.writeFileSync(outPath, JSON.stringify({
    fetched_at: new Date().toISOString(),
    counts: { pedidos: pedidos.length, vendedores: vendedorById.size, produtos: produtoById.size },
    pedidos,
  }, null, 1));
  console.log(`\n=== OK ===\n  ${outPath} (${(fs.statSync(outPath).size / 1024).toFixed(1)} KB · ${pedidos.length} pedidos)`);

  // Sanidade: faturamento por mês do ano corrente (mesma regra do build)
  const ano = String(new Date().getFullYear());
  const meses = {};
  for (const p of pedidos) {
    if (p.faturado !== 'S' || p.cancelado === 'S') continue;
    if (!p.dFat || p.dFat.slice(6) !== ano) continue;
    const m = p.dFat.slice(3, 5);
    meses[m] = (meses[m] || 0) + p.itens.reduce((s, i) => s + i.vMerc, 0);
  }
  console.log(`  faturado ${ano} (vMerc, TODOS os CFOPs): ` +
    Object.keys(meses).sort().map(m => `${m}=${meses[m].toFixed(0)}`).join(' '));
})().catch(e => { console.error('FATAL:', e); process.exit(1); });
