#!/usr/bin/env node
/**
 * fetch-omie-crm.cjs — pulla oportunidades + lookups CRM da Omie.
 * Saída: data/oportunidades.json (schema equivalente ao consolidado.xlsx do PBI Radke).
 *
 * Lookups buscados: fases, motivos, status, origens, solucoes, tipos, usuarios, contas.
 *
 * NOTA: este script é a fonte CANDIDATA. Não substitui o XLSX automaticamente —
 * o build-radke-extras.cjs continua lendo o XLSX até validação manual.
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

const PAGE_DELAY_MS = 200;
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
      console.error(`  [retry] ${method} → ${j.faultstring.slice(0,60)} → wait ${wait}ms`);
      await sleep(wait);
      return call(p, method, params, retries - 1);
    }
    throw new Error(`${method}: ${j.faultstring}`);
  }
  return j;
}

async function pull(label, path, method, baseParam, pageSize = 50) {
  const all = [];
  const first = await call(path, method, { ...baseParam, pagina: 1, registros_por_pagina: pageSize });
  const totalPages = first.total_de_paginas || 1;
  const totalRegs = first.total_de_registros || 0;
  all.push(...(first.cadastros || []));
  console.log(`  [${label}] ${totalRegs} registros em ${totalPages} pgs`);
  for (let p = 2; p <= totalPages; p++) {
    await sleep(PAGE_DELAY_MS);
    const r = await call(path, method, { ...baseParam, pagina: p, registros_por_pagina: pageSize });
    all.push(...(r.cadastros || []));
    if (p % 5 === 0 || p === totalPages) process.stdout.write(`  [${label}] pag ${p}/${totalPages}\r`);
  }
  console.log(`  [${label}] OK ${all.length}                            `);
  return all;
}

function indexBy(arr, keyName) {
  const m = new Map();
  for (const x of arr) m.set(x[keyName], x);
  return m;
}

(async () => {
  console.log('=== Lookups CRM (paralelo) ===');
  const [fases, motivos, status, origens, solucoes, tipos, usuarios] = await Promise.all([
    pull('fases',    '/crm/fases/',    'ListarFases',    {}),
    pull('motivos',  '/crm/motivos/',  'ListarMotivos',  {}),
    pull('status',   '/crm/status/',   'ListarStatus',   {}),
    pull('origens',  '/crm/origens/',  'ListarOrigens',  {}),
    pull('solucoes', '/crm/solucoes/', 'ListarSolucoes', {}),
    pull('tipos',    '/crm/tipos/',    'ListarTipos',    {}),
    pull('usuarios', '/crm/usuarios/', 'ListarUsuarios', {}),
  ]);

  console.log('\n=== Contas (paginado, 166 reg) ===');
  const contasRaw = await pull('contas', '/crm/contas/', 'ListarContas', {}, 50);
  // contas tem schema aninhado: identificacao.{nCod, cNome}
  const contas = contasRaw.map(c => ({
    nCodigo: c.identificacao && c.identificacao.nCod,
    cNome: c.identificacao && c.identificacao.cNome,
  })).filter(x => x.nCodigo);

  const faseById     = indexBy(fases,    'nCodigo');
  const motivoById   = indexBy(motivos,  'nCodigo');
  const statusById   = indexBy(status,   'nCodigo');
  const origemById   = indexBy(origens,  'nCodigo');
  const solucaoById  = indexBy(solucoes, 'nCodigo');
  const tipoById     = indexBy(tipos,    'nCodigo');
  const usuarioById  = indexBy(usuarios, 'nCodigo');
  const contaById    = indexBy(contas,   'nCodigo');

  console.log('\n=== Oportunidades (exibir_detalhes=S) ===');
  const opsRaw = await pull('oportunidades', '/crm/oportunidades/', 'ListarOportunidades',
    { exibir_detalhes: 'S', exibir_obs: 'N' }, 50);

  // Mapeamento exato pro schema do XLSX consolidado:
  // Colunas chave:
  //   Descrição da Oportunidade · Fase Atual · Situação · Motivo de Conclusão ·
  //   Vendedor · Origem · Tipo · Solução · Conta · Ticket · Produtos · Serviços ·
  //   Recorrência · Temperatura · Ano previsão · Mês previsão ·
  //   Data de inclusão (completa) · Data de atualização (completa) ·
  //   Data de 06 Conclusão(completa) · Tempo de ciclo
  const MES_PREV_LABEL = ['', 'Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  // Calcula tempo de ciclo em dias entre inclusão e conclusão (se houver),
  // senão entre inclusão e hoje (oportunidade em andamento).
  const parseDt = (s) => {
    if (!s || typeof s !== 'string') return null;
    const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!m) return null;
    return new Date(Number(m[3]), Number(m[2])-1, Number(m[1]));
  };
  const diffDays = (a, b) => Math.round((b - a) / 86400000);

  const oportunidades = opsRaw.map(op => {
    const id   = op.identificacao || {};
    const fs2  = op.fasesStatus || {};
    const out  = op.outrasInf || {};
    const prev = op.previsaoTemp || {};
    const tk   = op.ticket || {};

    const fase = faseById.get(fs2.nCodFase);
    const motivo = motivoById.get(fs2.nCodMotivo);
    const stat = statusById.get(fs2.nCodStatus);
    const origem = origemById.get(id.nCodOrigem);
    const solucao = solucaoById.get(id.nCodSolucao);
    const tipo = tipoById.get(out.nCodTipo);
    const vendedor = usuarioById.get(id.nCodVendedor);
    const conta = contaById.get(id.nCodConta);

    // Situação: o XLSX usa SOMENTE Conquistado/Em Andamento na coluna Situação.
    // "Perdido" no XLSX é derivado: !Conquistado && motivo preenchido && motivo != 'Oportunidade nunca existiu'.
    // (Cancelado/Suspenso da API ficam como Em Andamento na visão do PBI.)
    let situacao;
    if (stat && stat.cDescricao === 'Conquistado') {
      situacao = fs2.dConclusao ? `Conquistado em ${fs2.dConclusao}` : 'Conquistado';
    } else {
      situacao = 'Em Andamento';
    }

    const dIncl = parseDt(out.dInclusao);
    const dAlt = parseDt(out.dAlteracao);
    const dConcl = parseDt(fs2.dConclusao);
    const dToday = new Date();
    const tempoCiclo = dIncl ? diffDays(dIncl, dConcl || dToday) : 0;

    return {
      descricao: id.cDesOp || '',
      fase: fase ? fase.cDescrUsuario : '',
      situacao,
      motivo: motivo ? motivo.cDescricao : '',
      vendedor: vendedor ? vendedor.cNome : '',
      origem: origem ? origem.cDescricao : '',
      tipo: tipo ? tipo.cDescricao : '',
      solucao: solucao ? solucao.cDescricao : '',
      conta: conta ? conta.cNome : '',
      ticket: tk.nTicket || 0,
      produtos: tk.nProdutos || 0,
      servicos: tk.nServicos || 0,
      recorrencia: tk.nRecorrencia || 0,
      temperatura: prev.nTemperatura || 0,
      anoPrev: prev.nAnoPrev || 0,
      mesPrev: prev.nMesPrev ? MES_PREV_LABEL[prev.nMesPrev] : '',
      dInclusao: out.dInclusao || '',
      hInclusao: out.hInclusao || '',
      dAlteracao: out.dAlteracao || '',
      hAlteracao: out.hAlteracao || '',
      dConclusao: fs2.dConclusao || '',
      tempoCiclo,
      // raw ids pra debug
      _ids: {
        nCodOp: id.nCodOp, nCodFase: fs2.nCodFase, nCodStatus: fs2.nCodStatus,
        nCodMotivo: fs2.nCodMotivo, nCodVendedor: id.nCodVendedor,
        nCodConta: id.nCodConta, nCodSolucao: id.nCodSolucao,
        nCodOrigem: id.nCodOrigem, nCodTipo: out.nCodTipo,
      },
    };
  });

  const outPath = path.join(OUT, 'oportunidades.json');
  fs.writeFileSync(outPath, JSON.stringify({
    fetched_at: new Date().toISOString(),
    lookups: {
      fases: fases.length, motivos: motivos.length, status: status.length,
      origens: origens.length, solucoes: solucoes.length, tipos: tipos.length,
      usuarios: usuarios.length, contas: contas.length,
    },
    oportunidades,
  }, null, 2));

  console.log(`\n=== OK ===`);
  console.log(`  ${outPath} (${(fs.statSync(outPath).size / 1024).toFixed(1)} KB · ${oportunidades.length} opps)`);

  // Mesma classificação que build-radke-extras.cjs aplica em cima do XLSX,
  // pra comparar maçã com maçã.
  const isGanho = (o) => /^Conquistado/i.test(o.situacao);
  const isPerdido = (o) => !isGanho(o) && o.motivo && o.motivo !== 'Oportunidade nunca existiu';
  const ganhos = oportunidades.filter(isGanho);
  const perdidos = oportunidades.filter(isPerdido);
  const abertos = oportunidades.filter(o => !isGanho(o) && !isPerdido(o));

  // Filtro Radke: ignora fases iniciais (Prospect/Qualificação) — mesma regra do XLSX.
  const rowsAll = oportunidades;
  const rows = oportunidades.filter(o => o.fase !== '01 Prospect' && o.fase !== '02 Qualificação');
  console.log(`  Total: ${rowsAll.length} (com Prospect/Qualif) · ${rows.length} (após filtro pipeline ativo)`);
  console.log(`  Ganhos: ${ganhos.length} · Ticket ganho: R$ ${ganhos.reduce((s,o)=>s+o.ticket,0).toFixed(2)}`);
  console.log(`  Perdidos: ${perdidos.length}`);
  console.log(`  Em andamento: ${abertos.length}`);
})().catch(e => { console.error('FATAL:', e); process.exit(1); });
