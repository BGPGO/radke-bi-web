#!/usr/bin/env node
/**
 * fetch-omie-os.cjs — pulla Ordens de Serviço (OS) da Omie. Saída: data/os.json
 *
 * É a fonte dos PEDIDOS DE SERVIÇO NÃO FATURADOS (#14, leg serviço — complementa
 * fetch-omie-pedidos.cjs, que só cobre PRODUTO).
 *
 * Descoberta 2026-06-17 (cruzando com 2 prints do cliente):
 *   - Serviço não faturado ~R$ 500k (mix atrasado + a faturar)
 *   - Produto não faturado  ~R$ 200k (tudo "ainda não faturado")
 *   O BI só puxava PRODUTO (/produtos/pedido/) → serviço estava 100% ausente.
 *
 * Regra de "não faturada" (bate no ~500k da print, etapas 10/20/30/50):
 *   cFaturada !== 'S' && cCancelada !== 'S' && cEtapa não em {'00',''} (00 = orçamento morto,
 *   294 OS / R$ 12,4M de propostas nunca convertidas, fica FORA igual produto etapa 00).
 *   valor = Cabecalho.nValorTotal · data = Cabecalho.dDtPrevisao · atrasado = previsão < hoje.
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

async function call(method, params, retries = 8) {
  const body = JSON.stringify({ call: method, app_key: APP_KEY, app_secret: APP_SECRET, param: [params] });
  let res;
  try {
    res = await fetch(`${BASE}/servicos/os/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
  } catch (e) {
    if (retries > 0) { await sleep(2000); return call(method, params, retries - 1); }
    throw e;
  }
  const j = await res.json().catch(() => null);
  if (!j) {
    if (retries > 0) { await sleep(2000); return call(method, params, retries - 1); }
    throw new Error(`${method}: bad JSON (${res.status})`);
  }
  if (j.faultstring) {
    const transient = /Consumo|excedido|simultane|busy|Broken|gateway|timeout|503|502|504/i.test(j.faultstring);
    if (transient && retries > 0) {
      const wait = Math.min(30000, 2000 * (9 - retries));
      console.error(`  [retry] ${method} → ${j.faultstring.slice(0, 60)} → wait ${wait}ms`);
      await sleep(wait);
      return call(method, params, retries - 1);
    }
    throw new Error(`${method}: ${j.faultstring}`);
  }
  return j;
}

(async () => {
  console.log('=== Ordens de Serviço (Omie API) ===');
  const all = [];
  const first = await call('ListarOS', { pagina: 1, registros_por_pagina: 500, apenas_importado_api: 'N' });
  const totalPages = first.total_de_paginas || 1;
  console.log(`  [OS] ${first.total_de_registros || 0} registros em ${totalPages} pgs`);
  all.push(...(first.osCadastro || []));
  for (let p = 2; p <= totalPages; p++) {
    await sleep(PAGE_DELAY_MS);
    const r = await call('ListarOS', { pagina: p, registros_por_pagina: 500, apenas_importado_api: 'N' });
    all.push(...(r.osCadastro || []));
    process.stdout.write(`  [OS] pag ${p}/${totalPages}\r`);
  }
  console.log(`  [OS] OK ${all.length}                            `);

  const os = all.map(o => {
    const cab = o.Cabecalho || {};
    const inf = o.InfoCadastro || {};
    const adic = o.InformacoesAdicionais || {};
    const serv = o.ServicosPrestados || [];
    const descricao = serv
      .map(s => (s.cDescServ || '').split('|')[0].trim())
      .filter(Boolean)
      .join(' · ')
      .slice(0, 160);
    return {
      numero: cab.cNumOS || '',
      codigo: cab.nCodOS,
      etapa: cab.cEtapa || '',
      dataPrevisao: cab.dDtPrevisao || '',
      dInc: inf.dDtInc || '',
      dFat: inf.dDtFat || '',
      faturada: inf.cFaturada || 'N',
      cancelada: inf.cCancelada || 'N',
      codCliente: cab.nCodCli || null,
      numPedido: adic.cNumPedido || '',
      valorTotal: cab.nValorTotal || 0,
      descricao,
    };
  });

  const outPath = path.join(OUT, 'os.json');
  fs.writeFileSync(outPath, JSON.stringify({
    fetched_at: new Date().toISOString(),
    counts: { os: os.length },
    os,
  }, null, 1));
  console.log(`\n=== OK ===\n  ${outPath} (${(fs.statSync(outPath).size / 1024).toFixed(1)} KB · ${os.length} OS)`);

  // Sanidade: não faturadas confirmadas (etapas != 00), total + split
  const hoje = new Date();
  const parseBR = (s) => { if (!s || !/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return null; const [a, b, c] = s.split('/'); return new Date(+c, +b - 1, +a); };
  let tot = 0, atras = 0, afat = 0, n = 0;
  for (const o of os) {
    if (o.faturada === 'S' || o.cancelada === 'S') continue;
    if (o.etapa === '00' || o.etapa === '') continue;
    tot += o.valorTotal; n++;
    const d = parseBR(o.dataPrevisao);
    if (d && d < hoje) atras += o.valorTotal; else afat += o.valorTotal;
  }
  console.log(`  serviço não faturado (etapas 10/20/30/50): ${n} OS · R$ ${tot.toFixed(2)} ` +
    `(atrasado R$ ${atras.toFixed(2)} · a faturar R$ ${afat.toFixed(2)})`);
})().catch(e => { console.error('FATAL:', e); process.exit(1); });
