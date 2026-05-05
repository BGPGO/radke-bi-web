/**
 * radke-bi-api
 *
 * On-demand AI report generation for the public radke-bi dashboard.
 * Mirrors the logic of generate-report.cjs but exposes it via HTTP for
 * anonymous users who select a period not yet pre-generated.
 *
 * Loads data.js in a vm sandbox once at startup to reuse aggregateTx/filterTx.
 * Caches generated reports on disk (24h TTL) and rate-limits per IP (5/hour).
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, existsSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createContext, runInContext } from 'node:vm';

// ---------- env ----------
const PORT = Number(process.env.PORT || 3000);
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://radke-bi.187.77.238.125.sslip.io';
const DATA_FILE = process.env.DATA_FILE || '/srv/data.js';
const CACHE_DIR = process.env.CACHE_DIR || '/srv/cache';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1h
const RATE_LIMIT_MAX = 5;

if (!ANTHROPIC_API_KEY) {
  console.error('FATAL: ANTHROPIC_API_KEY not set in environment');
  process.exit(1);
}

// ---------- load data.js into vm sandbox once ----------
if (!existsSync(DATA_FILE)) {
  console.error(`FATAL: data.js not found at ${DATA_FILE}`);
  process.exit(1);
}

interface DataSandbox {
  ALL_TX: any[];
  BIT_META: any;
  BIT_SEGMENTS: any;
  REF_YEAR: number;
  filterTx: (txList: any[], statusFilter: string, monthFilter: string | null) => any[];
  aggregateTx: (txList: any[], year: number) => any;
}

function loadDataSandbox(): DataSandbox {
  const code = readFileSync(DATA_FILE, 'utf8');
  const sandbox: any = { window: {}, console };
  sandbox.window.BIT_FILTER = 'realizado';
  createContext(sandbox);
  runInContext(code, sandbox);

  const w = sandbox.window;
  if (!w.ALL_TX || !w.aggregateTx || !w.filterTx) {
    throw new Error('data.js sandbox did not expose expected globals');
  }
  return {
    ALL_TX: w.ALL_TX,
    BIT_META: w.BIT_META,
    BIT_SEGMENTS: w.BIT_SEGMENTS,
    REF_YEAR: w.REF_YEAR || new Date().getFullYear(),
    filterTx: w.filterTx,
    aggregateTx: w.aggregateTx,
  };
}

const DATA = loadDataSandbox();
console.log(`[boot] data.js loaded: ${DATA.ALL_TX.length} transactions, REF_YEAR=${DATA.REF_YEAR}`);

// ---------- cache dir ----------
if (!existsSync(CACHE_DIR)) {
  mkdirSync(CACHE_DIR, { recursive: true });
}

// ---------- rate limit (in-memory, per IP) ----------
const rateLimitMap = new Map<string, number[]>();

function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const timestamps = (rateLimitMap.get(ip) || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (timestamps.length >= RATE_LIMIT_MAX) {
    const oldest = timestamps[0];
    const retryAfter = Math.ceil((RATE_LIMIT_WINDOW_MS - (now - oldest)) / 1000);
    return { allowed: false, retryAfter };
  }
  timestamps.push(now);
  rateLimitMap.set(ip, timestamps);
  return { allowed: true };
}

// Cleanup stale rate-limit entries every 10min
setInterval(() => {
  const now = Date.now();
  for (const [ip, timestamps] of rateLimitMap.entries()) {
    const fresh = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
    if (fresh.length === 0) rateLimitMap.delete(ip);
    else rateLimitMap.set(ip, fresh);
  }
}, 10 * 60 * 1000);

// ---------- formatters (mirrored from generate-report.cjs) ----------
function fmt(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return 'R$ 0,00';
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  const parts = abs.toFixed(2).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${sign}R$ ${parts[0]},${parts[1]}`;
}

function pct(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '0,00%';
  return `${n.toFixed(2).replace('.', ',')}%`;
}

const MONTH_NAMES_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

// ---------- aggregation per (year, month) ----------
function buildSegment(statusFilter: string, year: number, month: number | null) {
  let out = DATA.filterTx(DATA.ALL_TX, statusFilter, null);
  if (month) {
    const ym = `${year}-${String(month).padStart(2, '0')}`;
    out = out.filter((r: any) => r[1] === ym);
  } else {
    out = out.filter((r: any) => r[1] && r[1].startsWith(`${year}-`));
  }
  return DATA.aggregateTx(out, year);
}

// ---------- payload builders (mirrored from generate-report.cjs) ----------
function buildPayloads(year: number, month: number | null) {
  const realizado = buildSegment('realizado', year, month);
  const aPagarReceber = buildSegment('a_pagar_receber', year, month);
  const tudo = buildSegment('tudo', year, month);

  const empresaNome =
    (DATA.BIT_META && DATA.BIT_META.empresa && DATA.BIT_META.empresa.nome_fantasia) ||
    'RADKE Soluções Intralogísticas';

  let periodo: string;
  if (month) {
    periodo = `${MONTH_NAMES_PT[month - 1]}/${year}`;
  } else if (year === DATA.REF_YEAR) {
    periodo = `Ano ${year} (YTD)`;
  } else {
    periodo = `Ano ${year}`;
  }

  const payloadVisaoGeral = () => {
    const k = realizado.KPIS;
    const md = realizado.MONTH_DATA || [];
    const linhas = md
      .map(
        (m: any) =>
          `${m.m}: receita=${fmt(m.receita)}, despesa=${fmt(m.despesa)}, liquido=${fmt(m.receita - m.despesa)}`,
      )
      .join('\n');
    return `## Visao Geral - ${empresaNome} - ${periodo} (Realizado)

KPIs principais:
- Receita total: ${fmt(k.TOTAL_RECEITA)}
- Despesa total: ${fmt(k.TOTAL_DESPESA)}
- Valor liquido: ${fmt(k.VALOR_LIQUIDO)}
- Margem liquida: ${pct(k.MARGEM_LIQUIDA)}

Pendencias (a pagar/receber):
- A receber: ${fmt(aPagarReceber.KPIS.TOTAL_RECEITA || 0)}
- A pagar: ${fmt(aPagarReceber.KPIS.TOTAL_DESPESA || 0)}

Movimentacao mes a mes (realizado):
${linhas}

Top 5 categorias de receita:
${(realizado.RECEITA_CATEGORIAS || []).slice(0, 5).map((c: any) => `- ${c.name}: ${fmt(c.value)}`).join('\n')}

Top 5 categorias de despesa:
${(realizado.DESPESA_CATEGORIAS || []).slice(0, 5).map((c: any) => `- ${c.name}: ${fmt(c.value)}`).join('\n')}`;
  };

  const payloadReceita = () => {
    const k = realizado.KPIS;
    const cats = realizado.RECEITA_CATEGORIAS || [];
    const clientes = realizado.RECEITA_CLIENTES || [];
    const md = realizado.MONTH_DATA || [];
    const totalCats = cats.reduce((s: number, c: any) => s + c.value, 0);
    return `## Receita - ${empresaNome} - ${periodo} (Realizado)

Receita total realizada: ${fmt(k.TOTAL_RECEITA)}
Receita ainda a receber: ${fmt(aPagarReceber.KPIS.TOTAL_RECEITA || 0)}

Receita mes a mes:
${md.map((m: any) => `- ${m.m}: ${fmt(m.receita)}`).join('\n')}

Top 10 categorias de receita (pct sobre total das top categorias):
${cats.slice(0, 10).map((c: any) => `- ${c.name}: ${fmt(c.value)} (${totalCats ? pct((c.value / totalCats) * 100) : '0%'})`).join('\n')}

Top 10 clientes:
${clientes.slice(0, 10).map((c: any) => `- ${c.name}: ${fmt(c.value)}`).join('\n')}`;
  };

  const payloadDespesa = () => {
    const k = realizado.KPIS;
    const cats = realizado.DESPESA_CATEGORIAS || [];
    const fornec = realizado.DESPESA_FORNECEDORES || [];
    const md = realizado.MONTH_DATA || [];
    const totalCats = cats.reduce((s: number, c: any) => s + c.value, 0);
    return `## Despesa - ${empresaNome} - ${periodo} (Realizado)

Despesa total realizada: ${fmt(k.TOTAL_DESPESA)}
Despesa ainda a pagar: ${fmt(aPagarReceber.KPIS.TOTAL_DESPESA || 0)}

Despesa mes a mes:
${md.map((m: any) => `- ${m.m}: ${fmt(m.despesa)}`).join('\n')}

Top 10 categorias de despesa:
${cats.slice(0, 10).map((c: any) => `- ${c.name}: ${fmt(c.value)} (${totalCats ? pct((c.value / totalCats) * 100) : '0%'})`).join('\n')}

Top 10 fornecedores:
${fornec.slice(0, 10).map((c: any) => `- ${c.name}: ${fmt(c.value)}`).join('\n')}`;
  };

  const payloadFluxoCaixa = () => {
    const k = realizado.KPIS;
    const saldos = realizado.SALDOS_MES || [];
    const md = realizado.MONTH_DATA || [];
    const liqSeries = (k.VALOR_LIQ_SERIES || []).slice(0, 12);
    return `## Fluxo de Caixa - ${empresaNome} - ${periodo} (Realizado)

Receita total: ${fmt(k.TOTAL_RECEITA)}
Despesa total: ${fmt(k.TOTAL_DESPESA)}
Valor liquido: ${fmt(k.VALOR_LIQUIDO)}
Margem liquida: ${pct(k.MARGEM_LIQUIDA)}

Valor liquido por mes:
${md.map((m: any, i: number) => `- ${m.m}: ${fmt(liqSeries[i] || 0)}`).join('\n')}

Saldo acumulado por mes:
${md.map((m: any, i: number) => `- ${m.m}: ${fmt(saldos[i] || 0)}`).join('\n')}`;
  };

  const payloadTesouraria = () => {
    const recebido = realizado.KPIS.TOTAL_RECEITA;
    const pago = realizado.KPIS.TOTAL_DESPESA;
    const aReceber = aPagarReceber.KPIS.TOTAL_RECEITA || 0;
    const aPagar = aPagarReceber.KPIS.TOTAL_DESPESA || 0;
    const saldosMes = (tudo.SALDOS_MES || realizado.SALDOS_MES || []) as number[];
    const sMax = saldosMes.length ? Math.max(...saldosMes) : 0;
    const sMin = saldosMes.length ? Math.min(...saldosMes) : 0;
    const sMed = saldosMes.length ? saldosMes.reduce((s, v) => s + v, 0) / saldosMes.length : 0;
    const md = realizado.MONTH_DATA || [];
    return `## Tesouraria - ${empresaNome} - ${periodo}

Posicao de caixa:
- Recebido (PAGO): ${fmt(recebido)}
- A receber: ${fmt(aReceber)}
- Pago: ${fmt(pago)}
- A pagar: ${fmt(aPagar)}

Saldos mensais (acumulado, considerando pagos+pendentes):
- Saldo maximo: ${fmt(sMax)}
- Saldo minimo: ${fmt(sMin)}
- Saldo medio: ${fmt(sMed)}

Saldo acumulado por mes:
${md.map((m: any, i: number) => `- ${m.m}: ${fmt(saldosMes[i] || 0)}`).join('\n')}

Diferenca entre a receber (${fmt(aReceber)}) e a pagar (${fmt(aPagar)}): ${fmt(aReceber - aPagar)}`;
  };

  const payloadComparativo = () => {
    const compData = realizado.COMP_DATA || [];
    const recHeader = compData.find((r: any) => r.tipo === 'Receita') || { d1: 0, d2: 0 };
    const despHeader = compData.find((r: any) => r.tipo === 'Despesa') || { d1: 0, d2: 0 };
    const liq1 = recHeader.d1 + despHeader.d1;
    const liq2 = recHeader.d2 + despHeader.d2;
    const diffRec = recHeader.d2 - recHeader.d1;
    const diffDesp = despHeader.d2 - despHeader.d1;
    const diffLiq = liq2 - liq1;
    const safePct = (a: number, b: number) => (b !== 0 ? (a / b) * 100 : 0);
    return `## Comparativo - ${empresaNome} - ${periodo}

Trimestre 1 (jan-mar) vs Trimestre 2 (abr-jun) do ano ${year}:

Receita:
- Trim 1: ${fmt(recHeader.d1)}
- Trim 2: ${fmt(recHeader.d2)}
- Diferenca: ${fmt(diffRec)} (${pct(safePct(diffRec, recHeader.d1))})

Despesa (valores negativos sao saidas):
- Trim 1: ${fmt(despHeader.d1)}
- Trim 2: ${fmt(despHeader.d2)}
- Diferenca: ${fmt(diffDesp)} (${pct(safePct(diffDesp, Math.abs(despHeader.d1)))})

Valor liquido:
- Trim 1: ${fmt(liq1)}
- Trim 2: ${fmt(liq2)}
- Diferenca: ${fmt(diffLiq)} (${pct(safePct(diffLiq, Math.abs(liq1) || 1))})`;
  };

  return {
    empresaNome,
    periodo,
    payloads: [
      { id: 'visao_geral', title: 'Visão Geral', text: payloadVisaoGeral() },
      { id: 'receita', title: 'Receita', text: payloadReceita() },
      { id: 'despesa', title: 'Despesa', text: payloadDespesa() },
      { id: 'fluxo_caixa', title: 'Fluxo de Caixa', text: payloadFluxoCaixa() },
      { id: 'tesouraria', title: 'Tesouraria', text: payloadTesouraria() },
      { id: 'comparativo', title: 'Comparativo', text: payloadComparativo() },
    ],
  };
}

// ---------- Anthropic call wrapper ----------
const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

async function callAnthropic(
  systemPrompt: string,
  userMessage: string,
  label: string,
): Promise<{ ok: boolean; text: string; error: string | null }> {
  try {
    const resp = await anthropic.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 1024,
      temperature: 0.2,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });
    const blocks = resp.content || [];
    const textBlock = blocks.find((b: any) => b.type === 'text') as any;
    const text = textBlock ? textBlock.text.trim() : '';
    if (!text) {
      console.error(`  [${label}] empty response`);
      return { ok: false, text: '', error: 'empty' };
    }
    console.log(`  [${label}] OK (${text.length} chars)`);
    return { ok: true, text, error: null };
  } catch (e: any) {
    console.error(`  [${label}] error: ${e.message}`);
    return { ok: false, text: '', error: e.message || 'unknown' };
  }
}

// ---------- cache helpers ----------
function cacheFileFor(year: number, month: number | null): string {
  const name = month ? `report-${year}-${String(month).padStart(2, '0')}.json` : `report-${year}.json`;
  return join(CACHE_DIR, name);
}

function readCache(file: string): any | null {
  if (!existsSync(file)) return null;
  try {
    const stat = statSync(file);
    if (Date.now() - stat.mtimeMs > CACHE_TTL_MS) return null;
    const content = readFileSync(file, 'utf8');
    return JSON.parse(content);
  } catch (e: any) {
    console.warn(`[cache] read failed for ${file}: ${e.message}`);
    return null;
  }
}

function writeCache(file: string, data: any): void {
  try {
    writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
  } catch (e: any) {
    console.warn(`[cache] write failed for ${file}: ${e.message}`);
  }
}

// ---------- generation pipeline ----------
async function generateReport(year: number, month: number | null): Promise<any> {
  const { empresaNome, periodo, payloads } = buildPayloads(year, month);

  const SYSTEM_SECAO = `Voce e um analista financeiro senior da BGP Consultoria Financeira. Cliente: ${empresaNome}. Sua tarefa e analisar dados financeiros e escrever uma analise executiva objetiva de UMA secao do relatorio.

Regras:
- Escreva 2 paragrafos bem estruturados separados por uma linha em branco
- Primeiro paragrafo: performance geral do periodo, principais movimentacoes, valores especificos
- Segundo paragrafo: pontos de atencao, riscos ou oportunidades identificados
- Linguagem profissional e direta. Sem markdown, sem bullets, sem **negrito** - so texto corrido
- Portugues brasileiro
- Seja especifico sobre os numeros mais relevantes (top categorias, evolucoes mes a mes)`;

  const SYSTEM_CONCLUSAO = `Voce e um analista financeiro senior da BGP Consultoria Financeira. Cliente: ${empresaNome}. Voce recebeu analises individuais de cada secao do relatorio. Escreva uma conclusao executiva sintetizando a situacao geral mais 2-3 recomendacoes estrategicas breves.

Regras:
- 2 paragrafos separados por linha em branco
- Primeiro: sintese da situacao geral (pontos criticos positivos e negativos)
- Segundo: 2-3 recomendacoes estrategicas acionaveis
- Texto corrido, sem markdown
- Portugues brasileiro`;

  console.log(`[generate] ${empresaNome} - ${periodo} - dispatching ${payloads.length} parallel calls`);

  const results = await Promise.all(
    payloads.map((s) =>
      callAnthropic(
        SYSTEM_SECAO,
        `Analise os seguintes dados financeiros e escreva uma analise executiva da secao "${s.title}":\n\n${s.text}`,
        s.id,
      ),
    ),
  );

  const secoes: Record<string, { title: string; analysis: string; error: string | null }> = {};
  let textosConcatenados = '';
  payloads.forEach((s, i) => {
    const r = results[i];
    secoes[s.id] = {
      title: s.title,
      analysis: r.ok ? r.text : '',
      error: r.ok ? null : r.error,
    };
    if (r.ok) textosConcatenados += `\n\n## ${s.title}\n\n${r.text}`;
  });

  let conclusao = '';
  if (textosConcatenados.trim()) {
    console.log('[generate] dispatching conclusion');
    const conc = await callAnthropic(
      SYSTEM_CONCLUSAO,
      `Com base nas analises abaixo de cada secao do relatorio financeiro, escreva uma conclusao executiva e recomendacoes estrategicas:\n${textosConcatenados}`,
      'conclusao',
    );
    conclusao = conc.ok ? conc.text : '';
  }

  return {
    generated_at: new Date().toISOString(),
    empresa: empresaNome,
    periodo,
    year,
    month: month || null,
    filter: 'realizado',
    secoes,
    conclusao,
  };
}

// ---------- HTTP routes ----------
const app = new Hono();

app.use(
  '/*',
  cors({
    origin: (origin) => {
      // Allow the public dashboard, plus any localhost dev origins, plus same-origin curl
      if (!origin) return '*';
      if (origin === ALLOWED_ORIGIN) return origin;
      if (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) return origin;
      return ALLOWED_ORIGIN;
    },
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
  }),
);

app.get('/health', (c) => c.json({ ok: true, transactions: DATA.ALL_TX.length, ref_year: DATA.REF_YEAR }));

app.post('/generate-report', async (c) => {
  // Get client IP from common proxy headers (Coolify/Traefik) before falling back to direct
  const ip =
    c.req.header('cf-connecting-ip') ||
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
    c.req.header('x-real-ip') ||
    'unknown';

  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'invalid_json' }, 400);
  }

  const year = Number(body?.year);
  const month = body?.month ? Number(body.month) : null;
  if (!year || isNaN(year) || year < 2000 || year > 2100) {
    return c.json({ error: 'invalid_year' }, 400);
  }
  if (month !== null && (isNaN(month) || month < 1 || month > 12)) {
    return c.json({ error: 'invalid_month' }, 400);
  }

  // Try cache first
  const cacheFile = cacheFileFor(year, month);
  const cached = readCache(cacheFile);
  if (cached) {
    console.log(`[cache hit] ${cacheFile}`);
    return c.json(cached);
  }

  // Rate limit (only when actually generating, cache hits are free)
  const rl = checkRateLimit(ip);
  if (!rl.allowed) {
    console.log(`[ratelimit] blocked ip=${ip}, retry_after=${rl.retryAfter}s`);
    c.header('Retry-After', String(rl.retryAfter || 3600));
    return c.json({ error: 'rate_limited', retry_after: rl.retryAfter }, 429);
  }

  // Generate
  try {
    console.log(`[generate] start ip=${ip} year=${year} month=${month || 'YTD'}`);
    const report = await generateReport(year, month);
    writeCache(cacheFile, report);
    return c.json(report);
  } catch (e: any) {
    console.error(`[generate] failed: ${e.message}`);
    return c.json({ error: 'generation_failed', detail: e.message }, 500);
  }
});

// ---------- start server ----------
serve({ fetch: app.fetch, port: PORT, hostname: '0.0.0.0' }, (info) => {
  console.log(`[boot] listening on http://0.0.0.0:${info.port}`);
  console.log(`[boot] CORS allowed origin: ${ALLOWED_ORIGIN}`);
  console.log(`[boot] cache dir: ${CACHE_DIR} (TTL ${CACHE_TTL_MS / 3600000}h)`);
  console.log(`[boot] rate limit: ${RATE_LIMIT_MAX} req/IP per ${RATE_LIMIT_WINDOW_MS / 60000}min`);
});
