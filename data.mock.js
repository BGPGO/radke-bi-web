/* BIT Finance — synthetic data + helpers */
const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const MONTHS_FULL = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

function fmt(n, opts = {}) {
  const { dec = 2, prefix = "R$", showSign = false } = opts;
  const sign = n < 0 ? "-" : (showSign ? "+" : "");
  const abs = Math.abs(n);
  const parts = abs.toFixed(dec).split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${sign}${prefix}${parts.join(",")}`;
}
function fmtK(n) {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1e6) return `${sign}R$${(abs / 1e6).toFixed(2).replace(".", ",")} M`;
  if (abs >= 1e3) return `${sign}R$${(abs / 1e3).toFixed(2).replace(".", ",")} K`;
  return `${sign}R$${abs.toFixed(0)}`;
}
function fmtPct(n, dec = 2) {
  const sign = n > 0 ? "+" : (n < 0 ? "-" : "");
  return `${sign}${Math.abs(n).toFixed(dec).replace(".", ",")}%`;
}

// Monthly receita / despesa (12 months)
const MONTH_DATA = [
  { m: "janeiro",   receita: 316974.33, despesa: 383463.91 },
  { m: "fevereiro", receita: 514089.02, despesa: 761029.18 },
  { m: "março",     receita: 585268.12, despesa: 559670.14 },
  { m: "abril",     receita: 389268.24, despesa: 352203.28 },
  { m: "maio",      receita: 341580.43, despesa: 427011.77 },
  { m: "junho",     receita: 350811.04, despesa: 234009.55 },
  { m: "julho",     receita: 566900.92, despesa: 431267.90 },
  { m: "agosto",    receita: 356331.81, despesa: 303108.66 },
  { m: "setembro",  receita: 525220.96, despesa: 299889.91 },
  { m: "outubro",   receita: 520368.43, despesa: 327112.04 },
  { m: "novembro",  receita: 296740.51, despesa: 295572.56 },
  { m: "dezembro",  receita: 367700.66, despesa: 220667.34 },
];

const RECEITA_CATEGORIAS = [
  { name: "Consultoria", value: 1351020.94, clientes: 14 },
  { name: "Licenças SaaS", value: 1016031.36, clientes: 47 },
  { name: "Serviços Recorrentes", value: 716689.00, clientes: 23 },
  { name: "Implantação", value: 514875.95, clientes: 9 },
  { name: "Treinamentos", value: 303138.68, clientes: 18 },
  { name: "Suporte Premium", value: 184480.00, clientes: 12 },
  { name: "Hardware Revenda", value: 142180.40, clientes: 6 },
  { name: "Outros", value: 51404.80, clientes: 4 },
];

const DESPESA_CATEGORIAS = [
  { name: "Folha de Pagamento", value: 1383206.17, fornecedores: 1 },
  { name: "Infra & Cloud", value: 574396.21, fornecedores: 8 },
  { name: "Comissões", value: 402304.12, fornecedores: 12 },
  { name: "Marketing", value: 305878.06, fornecedores: 9 },
  { name: "Impostos", value: 213166.52, fornecedores: 3 },
  { name: "Aluguéis", value: 201344.27, fornecedores: 4 },
  { name: "Software & SaaS", value: 200707.69, fornecedores: 11 },
  { name: "Viagens", value: 138746.15, fornecedores: 7 },
  { name: "Telefonia", value: 84211.10, fornecedores: 2 },
  { name: "Pró-labore", value: 78584.09, fornecedores: 1 },
];

const RECEITA_CLIENTES = [
  { name: "Banco Iguaçu", value: 285645.28 },
  { name: "Indústrias Solaris", value: 179914.05 },
  { name: "Petromar Logística", value: 176913.51 },
  { name: "Veneza Construção", value: 164090.85 },
  { name: "Grupo Norte Capital", value: 162276.60 },
  { name: "AltaMar Investimentos", value: 161690.78 },
  { name: "Casa Vidal Foods", value: 147347.97 },
  { name: "Tucano Energia", value: 134210.40 },
];

const DESPESA_FORNECEDORES = [
  { name: "Folha — Equipe Geral", value: 524599.56 },
  { name: "AWS Brazil", value: 468186.70 },
  { name: "Receita Federal — DARF", value: 456186.67 },
  { name: "Comgás Imóveis SA", value: 384376.63 },
  { name: "Meta Ads / Google Ads", value: 265714.78 },
  { name: "Salesforce Inc.", value: 213166.52 },
  { name: "TIM Empresas", value: 167966.47 },
];

// daily data — 31 days (jan)
const DIAS = Array.from({ length: 31 }, (_, i) => i + 1);
const RECEITA_DIA = DIAS.map(d => {
  // small spikes
  if (d === 30) return 156990;
  if (d === 6) return 34170;
  if (d === 1) return 20390;
  if (d === 4) return 28010;
  if (d === 11) return 24300;
  if (d === 17) return 32560;
  if (d % 7 === 0) return 12 + d * 280;
  return 50 + (d * d * 7) % 9000;
});
const DESPESA_DIA = DIAS.map(d => {
  if (d === 1) return 154050;
  if (d === 5) return 48560;
  if (d === 7) return 1870;
  if (d === 14) return 48760;
  if (d === 30) return 1120;
  if (d === 25) return 91000;
  return 100 + (d * 11) % 6000;
});

// extrato (analise geral) — small repeating samples
const EXTRATO = [
  ["03-01-2026", "Operações", "Consultoria", "Banco Iguaçu", -517.21],
  ["03-01-2026", "Operações", "Licenças SaaS", "Indústrias Solaris", 56.65],
  ["03-01-2026", "Comercial", "Implantação", "Petromar Logística", -513.20],
  ["03-01-2026", "Comercial", "Marketing", "Veneza Construção", 612.94],
  ["03-01-2026", "Operações", "Suporte Premium", "Grupo Norte Capital", 81.27],
  ["04-01-2026", "Financeiro", "Aluguéis", "Comgás Imóveis SA", -1250.00],
  ["04-01-2026", "Operações", "Folha de Pagamento", "Folha — Equipe", -8120.50],
  ["05-01-2026", "Comercial", "Treinamentos", "AltaMar", 4380.10],
  ["05-01-2026", "Comercial", "Consultoria", "Tucano Energia", 7250.00],
  ["06-01-2026", "Operações", "Software & SaaS", "Salesforce Inc.", -2189.40],
  ["07-01-2026", "Financeiro", "Impostos", "Receita Federal", -12480.30],
  ["08-01-2026", "Comercial", "Licenças SaaS", "Casa Vidal Foods", 3120.45],
  ["09-01-2026", "Operações", "Infra & Cloud", "AWS Brazil", -8740.55],
  ["10-01-2026", "Comercial", "Consultoria", "Banco Iguaçu", 9220.10],
  ["11-01-2026", "Operações", "Marketing", "Meta Ads", -1890.75],
  ["12-01-2026", "Comercial", "Serviços Recorrentes", "Indústrias Solaris", 5640.20],
  ["13-01-2026", "Financeiro", "Telefonia", "TIM Empresas", -780.90],
  ["14-01-2026", "Comercial", "Implantação", "Petromar Logística", 6890.60],
];

// totals
const TOTAL_RECEITA = MONTH_DATA.reduce((s, x) => s + x.receita, 0);
const TOTAL_DESPESA = MONTH_DATA.reduce((s, x) => s + x.despesa, 0);
const IMPOSTOS = 578159.69;
const EBITDA = TOTAL_RECEITA - (TOTAL_DESPESA - IMPOSTOS);
const VALOR_LIQUIDO = TOTAL_RECEITA - TOTAL_DESPESA;
const RESULTADO_OPERACIONAL = 1869077.48;
const CAPEX = 1059106.68;
const MARGEM_LIQUIDA = (VALOR_LIQUIDO / TOTAL_RECEITA) * 100;
const MARGEM_CONTRIB = 40.00;
const EBITDA_PCT = 49.91;
const IMPOSTOS_PCT = 11.79;

// saldos por mês (cumulative-ish)
const SALDOS_MES = [
  10.37, 29.30, 47.50, 34.11, 32.30, 35.13, 63.19, 56.68, 92.46, 94.24, 75.21, 53.63
].map(v => v * 1e6);

// indicator series
const VALOR_LIQ_SERIES = [
  -66489, 253318, 24954, 37064, -86107, 115575, 134553, 53122, 225331, 56464, -85204, 147388
];

// fluxo de caixa horizontal table (per month, by category)
const FLUXO_RECEITA = [
  { cat: "Consultoria", values: [316009.45, 514213.77, 584624.94, 399268.24, 340518.52, 350811, 566900, 356331, 525220, 520368, 296740, 367700] },
  { cat: "Licenças SaaS", values: [164760.60, 145000.00, 100422.62, 118892, 250000, 80000, 95000, 110000, 140000, 130000, 88000, 92000] },
  { cat: "Serviços Recorrentes", values: [116709.99, 153357.50, 54402.79, 62500, 70000, 65000, 110000, 75000, 130000, 120000, 60000, 80000] },
  { cat: "Implantação", values: [80000, 60000, 45000, 90000, 35000, 40000, 55000, 30000, 40000, 50000, 20000, 35000] },
];
const FLUXO_DESPESA = [
  { cat: "Folha de Pagamento", values: [-83463.91, -90000, -110000, -90000, -110000, -85000, -120000, -100000, -90000, -100000, -85000, -75000] },
  { cat: "Infra & Cloud", values: [-30000, -40000, -50000, -45000, -42000, -28000, -50000, -38000, -42000, -38000, -30000, -25000] },
  { cat: "Marketing", values: [-15000, -28000, -22000, -18000, -25000, -15000, -20000, -22000, -25000, -28000, -20000, -15000] },
  { cat: "Comissões", values: [-22000, -38000, -45000, -28000, -32000, -22000, -38000, -28000, -38000, -42000, -28000, -22000] },
  { cat: "Impostos", values: [-25000, -42000, -45000, -28000, -32000, -22000, -45000, -32000, -45000, -45000, -22000, -28000] },
];

// Comparativo dataset
const COMP_DATA = [
  { tipo: "Receita", isHeader: true, d1: 1415608.29, d2: 1079366.95 },
  { tipo: "Consultoria", parent: "Receita", d1: 912844.98, d2: 563753.91 },
  { tipo: "Licenças SaaS", parent: "Receita", d1: 409082.19, d2: 247349.96 },
  { tipo: "Serviços Recorrentes", parent: "Receita", d1: 0, d2: 214851.95 },
  { tipo: "Treinamentos", parent: "Receita", d1: 92709.59, d2: 53275.21 },
  { tipo: "Suporte Premium", parent: "Receita", d1: 9.53, d2: 135.92 },
  { tipo: "Despesa", isHeader: true, d1: -1203824.91, d2: -1012834.13 },
  { tipo: "Marketing", parent: "Despesa", d1: -33.16, d2: 0 },
  { tipo: "Software & SaaS", parent: "Despesa", d1: -106.77, d2: -406.77 },
  { tipo: "Telefonia", parent: "Despesa", d1: -26052.36, d2: 0 },
  { tipo: "Comissões", parent: "Despesa", d1: -1182.96, d2: -982.30 },
  { tipo: "Folha de Pagamento", parent: "Despesa", d1: -198250.05, d2: -81207.77 },
  { tipo: "Aluguéis", parent: "Despesa", d1: 0, d2: -3551.14 },
  { tipo: "Pró-labore", parent: "Despesa", d1: 0, d2: -1929.19 },
  { tipo: "Infra & Cloud", parent: "Despesa", d1: -56753.07, d2: -73196.69 },
  { tipo: "Impostos", parent: "Despesa", d1: -5474.12, d2: -3373.04 },
  { tipo: "Viagens", parent: "Despesa", d1: -549.99, d2: -542.23 },
  { tipo: "Hardware Revenda", parent: "Despesa", d1: -4523.61, d2: -4240.65 },
  { tipo: "Outros", parent: "Despesa", d1: -560.61, d2: -529.20 },
];

const COMPOSICAO_DESPESA = [
  { name: "Folha de Pagamento", value: 4280000, color: "#2dd4bf" },
  { name: "Operacional", value: 2140000, color: "#22c55e" },
  { name: "Marketing", value: 1320000, color: "#a78bfa" },
  { name: "Tecnologia", value: 980000, color: "#f59e0b" },
  { name: "Administrativo", value: 640000, color: "#ef4444" },
  { name: "Outros", value: 420000, color: "#6b7686" },
];

const POSICAO_CAIXA = [
  { name: "Itaú", value: 6240000 },
  { name: "Bradesco", value: 4180000 },
  { name: "Santander", value: 2840000 },
  { name: "BTG Pactual", value: 4120000 },
  { name: "Caixa", value: 1860000 },
];

const RECDESP_AREA = [
  { m: "mai", receita: 1.05e6, despesa: 0.92e6 },
  { m: "jun", receita: 1.18e6, despesa: 0.98e6 },
  { m: "jul", receita: 1.25e6, despesa: 1.02e6 },
  { m: "ago", receita: 1.42e6, despesa: 1.10e6 },
  { m: "set", receita: 1.55e6, despesa: 1.18e6 },
  { m: "out", receita: 1.62e6, despesa: 1.22e6 },
  { m: "nov", receita: 1.78e6, despesa: 1.30e6 },
  { m: "dez", receita: 1.95e6, despesa: 1.38e6 },
  { m: "jan", receita: 2.05e6, despesa: 1.42e6 },
  { m: "fev", receita: 2.18e6, despesa: 1.48e6 },
  { m: "mar", receita: 2.32e6, despesa: 1.55e6 },
  { m: "abr", receita: 2.45e6, despesa: 1.62e6 },
];

window.BIT = {
  COMPOSICAO_DESPESA, POSICAO_CAIXA, RECDESP_AREA,
  MONTHS, MONTHS_FULL, fmt, fmtK, fmtPct,
  MONTH_DATA, RECEITA_CATEGORIAS, DESPESA_CATEGORIAS,
  RECEITA_CLIENTES, DESPESA_FORNECEDORES,
  DIAS, RECEITA_DIA, DESPESA_DIA, EXTRATO,
  TOTAL_RECEITA, TOTAL_DESPESA, IMPOSTOS, EBITDA, VALOR_LIQUIDO,
  RESULTADO_OPERACIONAL, CAPEX, MARGEM_LIQUIDA, MARGEM_CONTRIB, EBITDA_PCT, IMPOSTOS_PCT,
  SALDOS_MES, VALOR_LIQ_SERIES,
  FLUXO_RECEITA, FLUXO_DESPESA, COMP_DATA,
};
