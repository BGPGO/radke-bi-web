/* BIT/BGP Finance — Pages 2: Fluxo, Tesouraria, Comparativo */
const { useState, useMemo } = React;

const PageFluxo = ({ filters, setFilters, onOpenFilters, statusFilter, drilldown, setDrilldown, year }) => {
  const B = useMemo(() => window.getBit(statusFilter, drilldown, year), [statusFilter, drilldown, year]);
  const [view, setView] = useState("horizontal");
  const [range, setRange] = useState("12M");
  const months6 = B.MONTHS_FULL.slice(0, 6);
  const refYear = (B.META && B.META.ref_year) || new Date().getFullYear();
  const handleMonthHeader = (i) => {
    const mm = String(i + 1).padStart(2, "0");
    const ym = `${refYear}-${mm}`;
    const mn = B.MONTHS_FULL[i] || "";
    setDrilldown({ type: "mes", value: ym, label: `${mn.charAt(0).toUpperCase() + mn.slice(1, 3)}/${refYear}` });
  };
  const activeMonthIdx = (drilldown && drilldown.type === "mes")
    ? parseInt(drilldown.value.slice(5, 7), 10) - 1 : -1;

  return (
    <div className="page">
      <div className="page-title">
        <div>
          <h1>Fluxo de Caixa</h1>
          <div className="status-line">Análise horizontal/vertical e saldos por mês</div>
        </div>
        <div className="actions">
          <RangePills value={range} onChange={setRange} />
          <Filters filters={filters} onOpen={onOpenFilters} page="fluxo" />
          <ExportButton />
        </div>
      </div>

      <DrilldownBadge drilldown={drilldown} onClear={() => setDrilldown(null)} />

      <div className="metric-strip">
        <div className="metric">
          <div className="m-label">Receita total</div>
          <div className="m-value">{B.fmt(B.TOTAL_RECEITA)}</div>
          <div className="m-pct">100%</div>
          <div className="m-bar"><div style={{ width: `100%` }} /></div>
        </div>
        <div className="metric">
          <div className="m-label">Despesa total</div>
          <div className="m-value">{B.fmt(B.TOTAL_DESPESA)}</div>
          <div className="m-pct">{B.TOTAL_RECEITA > 0 ? `${((B.TOTAL_DESPESA / B.TOTAL_RECEITA) * 100).toFixed(2).replace(".",",")}%` : "—"}</div>
          <div className="m-bar red"><div style={{ width: `${B.TOTAL_RECEITA > 0 ? Math.min(100, (B.TOTAL_DESPESA / B.TOTAL_RECEITA) * 100) : 0}%` }} /></div>
        </div>
        <div className="metric">
          <div className="m-label">Valor líquido</div>
          <div className="m-value" style={{ color: B.VALOR_LIQUIDO >= 0 ? "var(--green)" : "var(--red)" }}>{B.fmt(B.VALOR_LIQUIDO)}</div>
          <div className="m-pct">{B.MARGEM_LIQUIDA.toFixed(2).replace(".",",")}%</div>
          <div className="m-bar cyan"><div style={{ width: `${Math.min(100, Math.max(0, B.MARGEM_LIQUIDA))}%` }} /></div>
        </div>
        <div className="metric">
          <div className="m-label">Margem líquida</div>
          <div className="m-value">{B.MARGEM_LIQUIDA.toFixed(2).replace(".",",")}%</div>
          <div className="m-pct">média do período</div>
          <div className="m-bar"><div style={{ width: `${Math.min(100, Math.max(0, B.MARGEM_LIQUIDA))}%` }} /></div>
        </div>
      </div>

      <div className="row" style={{ gridTemplateColumns: "minmax(220px, 1fr) minmax(0, 4fr)" }}>
        <div className="card">
          <h2 className="card-title">Valor líquido por mês</h2>
          <DivergingBars values={B.VALOR_LIQ_SERIES} labels={B.MONTHS.map(m => m.charAt(0).toUpperCase() + m.slice(1))} />
        </div>

        <div className="card">
          <div className="card-title-row">
            <h2 className="card-title">Fluxo de caixa</h2>
            <div className="seg">
              <button className={view === "horizontal" ? "active" : ""} onClick={() => setView("horizontal")}>Análise horizontal</button>
              <button className={view === "vertical" ? "active" : ""} onClick={() => setView("vertical")}>Análise vertical</button>
            </div>
          </div>
          <div className="t-scroll" style={{ maxHeight: 320 }}>
            <table className="t">
              <thead>
                <tr>
                  <th style={{ minWidth: 200 }}>Receita / Despesa</th>
                  {months6.map((m, i) => {
                    const isActive = i === activeMonthIdx;
                    return (
                      <React.Fragment key={m}>
                        <th className={`num clickable-th ${isActive ? "active" : ""}`}
                            onClick={() => handleMonthHeader(i)}
                            style={{ cursor: "pointer" }}
                            title="Clique para filtrar este mês">
                          {m}
                        </th>
                        <th className="num">%</th>
                      </React.Fragment>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                <tr className="section">
                  <td>Receita</td>
                  {months6.map((_, i) => {
                    const total = B.FLUXO_RECEITA.reduce((s, r) => s + (r.values[i] || 0), 0);
                    return (
                      <React.Fragment key={i}>
                        <td className="num green">{B.fmt(total)}</td>
                        <td className="num">100%</td>
                      </React.Fragment>
                    );
                  })}
                </tr>
                {B.FLUXO_RECEITA.map(row => (
                  <tr key={row.cat}>
                    <td><span className="chev">+</span>{row.cat}</td>
                    {months6.map((_, i) => {
                      const v = row.values[i];
                      const totalReceita = B.FLUXO_RECEITA.reduce((s, r) => s + (r.values[i] || 0), 0);
                      const pct = totalReceita ? (v / totalReceita) * 100 : 0;
                      return (
                        <React.Fragment key={i}>
                          <td className="num green">{B.fmt(v)}</td>
                          <td className="num" style={{ color: "var(--fg-3)" }}>{pct.toFixed(2).replace(".",",")}%</td>
                        </React.Fragment>
                      );
                    })}
                  </tr>
                ))}
                <tr className="section">
                  <td>Despesa</td>
                  {months6.map((_, i) => {
                    const total = B.FLUXO_DESPESA.reduce((s, r) => s + (r.values[i] || 0), 0);
                    return (
                      <React.Fragment key={i}>
                        <td className="num red">{B.fmt(total)}</td>
                        <td className="num">100%</td>
                      </React.Fragment>
                    );
                  })}
                </tr>
                {B.FLUXO_DESPESA.map(row => (
                  <tr key={row.cat}>
                    <td><span className="chev">+</span>{row.cat}</td>
                    {months6.map((_, i) => {
                      const v = row.values[i];
                      const totalDespesa = B.FLUXO_DESPESA.reduce((s, r) => s + (r.values[i] || 0), 0);
                      const pct = totalDespesa ? (v / totalDespesa) * 100 : 0;
                      return (
                        <React.Fragment key={i}>
                          <td className="num red">{B.fmt(v)}</td>
                          <td className="num" style={{ color: "var(--fg-3)" }}>{pct.toFixed(2).replace(".",",")}%</td>
                        </React.Fragment>
                      );
                    })}
                  </tr>
                ))}
                <tr className="total">
                  <td>Total</td>
                  {months6.map((_, i) => {
                    const r = B.FLUXO_RECEITA.reduce((s, r) => s + (r.values[i] || 0), 0);
                    const d = B.FLUXO_DESPESA.reduce((s, r) => s + (r.values[i] || 0), 0);
                    return (
                      <React.Fragment key={i}>
                        <td className="num">{B.fmt(r + d)}</td>
                        <td className="num">{(((r + d) / r) * 100).toFixed(2).replace(".",",")}%</td>
                      </React.Fragment>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">Saldos acumulados por mês</h2>
        <TrendChart
          values={B.SALDOS_MES}
          labels={B.MONTHS.map(m => m.charAt(0).toUpperCase() + m.slice(1) + " " + String((B.META && B.META.ref_year) || "").slice(-2))}
          color="var(--cyan)"
          height={300}
          gradientId="fl-saldos"
        />
      </div>
    </div>
  );
};

const PageTesouraria = ({ filters, setFilters, onOpenFilters, statusFilter, drilldown, setDrilldown, year }) => {
  const B = useMemo(() => window.getBit(statusFilter, drilldown, year), [statusFilter, drilldown, year]);
  const SEG = window.BIT_SEGMENTS || {};
  const recebido = (SEG.realizado && SEG.realizado.KPIS && SEG.realizado.KPIS.TOTAL_RECEITA) || 0;
  const aReceber = (SEG.a_pagar_receber && SEG.a_pagar_receber.KPIS && SEG.a_pagar_receber.KPIS.TOTAL_RECEITA) || 0;
  const pago = (SEG.realizado && SEG.realizado.KPIS && SEG.realizado.KPIS.TOTAL_DESPESA) || 0;
  const aPagar = (SEG.a_pagar_receber && SEG.a_pagar_receber.KPIS && SEG.a_pagar_receber.KPIS.TOTAL_DESPESA) || 0;
  const recDiaSeg = (SEG.realizado && SEG.realizado.RECEITA_DIA) || B.RECEITA_DIA;
  const pagoDiaSeg = (SEG.realizado && SEG.realizado.DESPESA_DIA) || B.DESPESA_DIA;
  const aReceberDiaSeg = (SEG.a_pagar_receber && SEG.a_pagar_receber.RECEITA_DIA) || B.RECEITA_DIA;
  const aPagarDiaSeg = (SEG.a_pagar_receber && SEG.a_pagar_receber.DESPESA_DIA) || B.DESPESA_DIA;

  const saldosMes = (SEG.tudo && SEG.tudo.SALDOS_MES) || B.SALDOS_MES;
  const sMax = Math.max(...saldosMes, 0);
  const sMin = Math.min(...saldosMes, 0);
  const sMed = saldosMes.length ? saldosMes.reduce((s, v) => s + v, 0) / saldosMes.length : 0;

  return (
    <div className="page">
      <div className="page-title">
        <div>
          <h1>Tesouraria</h1>
          <div className="status-line"><span className="live-dot" /> Saldos e pulso · {(B.META && B.META.ref_year) || "—"}</div>
        </div>
        <div className="actions">
          <Filters filters={filters} onOpen={onOpenFilters} page="tesouraria" />
          <ExportButton />
        </div>
      </div>

      <DrilldownBadge drilldown={drilldown} onClear={() => setDrilldown(null)} />

      <div className="row row-4">
        <KpiTile label="Recebido (PAGO)" value={(recebido / 1e6).toFixed(2).replace(".", ",")} unit="M" sparkValues={recDiaSeg} sparkColor="var(--green)" tone="green" />
        <KpiTile label="A receber" value={(aReceber / 1e6).toFixed(2).replace(".", ",")} unit="M" sparkValues={aReceberDiaSeg} sparkColor="var(--cyan)" tone="cyan" />
        <KpiTile label="Pago" value={(pago / 1e6).toFixed(2).replace(".", ",")} unit="M" sparkValues={pagoDiaSeg} sparkColor="var(--red)" tone="red" />
        <KpiTile label="A pagar" value={(aPagar / 1e6).toFixed(2).replace(".", ",")} unit="M" sparkValues={aPagarDiaSeg} sparkColor="var(--amber)" tone="amber" />
      </div>

      <div className="row row-1-1">
        <div className="card">
          <div className="card-title-row">
            <h2 className="card-title">Pulso de receitas</h2>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <span className="chip green">Recebido · {B.fmt(recebido)}</span>
              <span className="chip cyan">A receber · {B.fmt(aReceber)}</span>
            </div>
          </div>
          <DailyBars values={recDiaSeg} color="green" />
        </div>
        <div className="card">
          <div className="card-title-row">
            <h2 className="card-title">Pulso de despesas</h2>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <span className="chip red">Pago · {B.fmt(pago)}</span>
              <span className="chip" style={{ background: "rgba(245,158,11,0.12)", color: "#fcd34d", borderColor: "rgba(245,158,11,0.28)" }}>A pagar · {B.fmt(aPagar)}</span>
            </div>
          </div>
          <DailyBars values={pagoDiaSeg} color="red" />
        </div>
      </div>

      <div className="row" style={{ gridTemplateColumns: "minmax(0, 7fr) minmax(0, 5fr)" }}>
        <div className="card">
          <h2 className="card-title">Saldo realizado por mês</h2>
          <div style={{ display: "flex", gap: 24, marginBottom: 14, flexWrap: "wrap" }}>
            <div><div className="kpi-label">Saldo Máximo</div><div style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--green)" }}>{B.fmt(sMax)}</div></div>
            <div><div className="kpi-label">Saldo Mínimo</div><div style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--red)" }}>{B.fmt(sMin)}</div></div>
            <div><div className="kpi-label">Saldo Médio</div><div style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--cyan)" }}>{B.fmt(sMed)}</div></div>
          </div>
          <TrendChart values={saldosMes} labels={B.MONTHS} color="var(--cyan)" height={200} showPoints={true} showLabels={false} gradientId="ts-saldo" />
        </div>

        <div className="card">
          <h2 className="card-title">Últimos lançamentos</h2>
          <div className="t-scroll" style={{ maxHeight: 320 }}>
            <table className="t">
              <thead>
                <tr><th>Data</th><th>Categoria</th><th>Cliente / Fornecedor</th><th className="num">Valor</th></tr>
              </thead>
              <tbody>
                {window.applyDrilldown(B.EXTRATO, drilldown).slice(0, 20).map((e, i) => (
                  <tr key={i}>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: 10 }}>{e[0]}</td>
                    <td style={{ fontSize: 11 }}>{(e[2] || "").slice(0, 22)}</td>
                    <td style={{ fontSize: 11 }}>{(e[3] || "").slice(0, 28)}</td>
                    <td className={`num ${e[4] < 0 ? "red" : "green"}`} style={{ fontSize: 11 }}>{B.fmt(e[4])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

const PageComparativo = ({ statusFilter, drilldown, setDrilldown, year }) => {
  const B = useMemo(() => window.getBit(statusFilter, drilldown, year), [statusFilter, drilldown, year]);
  const refYear = (B.META && B.META.ref_year) || new Date().getFullYear();
  const lblTrim1 = `${refYear} · Trim 1 (jan-mar)`;
  const lblTrim2 = `${refYear} · Trim 2 (abr-jun)`;
  const [d1, setD1] = useState(lblTrim1);
  const [d2, setD2] = useState(lblTrim2);
  const [expanded, setExpanded] = useState({ Receita: true, Despesa: true });

  const recHeader = B.COMP_DATA.find(r => r.tipo === "Receita") || { d1: 0, d2: 0 };
  const despHeader = B.COMP_DATA.find(r => r.tipo === "Despesa") || { d1: 0, d2: 0 };
  const totalReceita1 = recHeader.d1, totalReceita2 = recHeader.d2;
  const totalDespesa1 = despHeader.d1, totalDespesa2 = despHeader.d2;
  const liq1 = totalReceita1 + totalDespesa1, liq2 = totalReceita2 + totalDespesa2;
  const safePct = (a, b) => b !== 0 ? (a / b) * 100 : 0;
  const diffReceita = totalReceita2 - totalReceita1;
  const diffReceitaPct = safePct(diffReceita, totalReceita1);
  const diffDespesa = totalDespesa2 - totalDespesa1;
  const diffDespesaPct = safePct(diffDespesa, totalDespesa1);
  const diffLiq = liq2 - liq1;
  const diffLiqPct = safePct(diffLiq, liq1);

  return (
    <div className="page">
      <div className="page-title">
        <div>
          <h1>Comparativo</h1>
          <div className="status-line">Análise comparativa entre dois períodos</div>
        </div>
        <div className="actions">
          <ExportButton />
        </div>
      </div>

      <DrilldownBadge drilldown={drilldown} onClear={() => setDrilldown && setDrilldown(null)} />

      <div className="row row-3-9">
        <div style={{ display: "grid", gap: 16 }}>
          <div className="card">
            <h2 className="card-title">Filtragem de datas</h2>
            <div style={{ marginBottom: 12 }}>
              <div className="filter-mini-label">Data comparativa 1</div>
              <select className="filter-select" style={{ width: "100%" }} value={d1} onChange={e => setD1(e.target.value)}>
                <option>{lblTrim1}</option>
              </select>
            </div>
            <div>
              <div className="filter-mini-label">Data comparativa 2</div>
              <select className="filter-select" style={{ width: "100%" }} value={d2} onChange={e => setD2(e.target.value)}>
                <option>{lblTrim2}</option>
              </select>
            </div>
          </div>

          <div className="card">
            <h2 className="card-title">Indicadores principais</h2>
            <div style={{ display: "grid", gap: 12 }}>
              <div className="indicator-card red">
                <div className="kpi-label">Diferença na receita</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: "var(--red)", letterSpacing: "-0.02em" }}>{B.fmt(diffReceita)}</div>
                <div className={`kpi-delta down`}>{B.fmtPct(diffReceitaPct)}</div>
              </div>
              <div className="indicator-card">
                <div className="kpi-label">Diferença nas despesas</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: "var(--green)", letterSpacing: "-0.02em" }}>{B.fmt(diffDespesa)}</div>
                <div className={`kpi-delta up`}>{B.fmtPct(diffDespesaPct)}</div>
              </div>
              <div className="indicator-card red">
                <div className="kpi-label">Diferença do valor líquido</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: "var(--red)", letterSpacing: "-0.02em" }}>{B.fmt(diffLiq)}</div>
                <div className={`kpi-delta down`}>{B.fmtPct(diffLiqPct)}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-title-row">
            <h2 className="card-title">Análise comparativa entre períodos</h2>
            <button className="btn-ghost"><Icon name="download" /> Exportar</button>
          </div>
          <div className="t-scroll" style={{ maxHeight: 540 }}>
            <table className="t">
              <thead>
                <tr>
                  <th>Receita / Despesa</th>
                  <th className="num">{d1}</th>
                  <th className="num">{d2}</th>
                  <th className="num">Δ Comparativo</th>
                  <th className="num">%</th>
                </tr>
              </thead>
              <tbody>
                {B.COMP_DATA.map((row, i) => {
                  const diff = row.d2 - row.d1;
                  const pct = row.d1 ? (diff / row.d1) * 100 : (row.d2 !== 0 ? 100 : 0);
                  if (row.isHeader) {
                    const open = expanded[row.tipo];
                    return (
                      <tr key={i} className="section">
                        <td>
                          <button onClick={() => setExpanded(s => ({ ...s, [row.tipo]: !s[row.tipo] }))}
                            style={{ background: "transparent", border: 0, color: "inherit", padding: 0, fontWeight: 700, fontFamily: "inherit", fontSize: "inherit", display: "inline-flex", alignItems: "center", gap: 6 }}>
                            <span className="chev">{open ? "−" : "+"}</span>{row.tipo}
                          </button>
                        </td>
                        <td className={`num bold ${row.tipo === "Despesa" ? "red" : "green"}`}>{B.fmt(row.d1)}</td>
                        <td className={`num bold ${row.tipo === "Despesa" ? "red" : "green"}`}>{B.fmt(row.d2)}</td>
                        <td className={`num bold ${diff >= 0 ? "green" : "red"}`}>{B.fmt(diff)}</td>
                        <td className={`num bold ${diff >= 0 ? "green" : "red"}`}>{B.fmtPct(pct)}</td>
                      </tr>
                    );
                  }
                  if (!expanded[row.parent]) return null;
                  const isReceita = row.parent === "Receita";
                  return (
                    <tr key={i}>
                      <td style={{ paddingLeft: 24 }}><span className="chev">+</span>{row.tipo}</td>
                      <td className={`num ${isReceita ? "green" : "red"}`}>{row.d1 !== 0 ? B.fmt(row.d1) : "—"}</td>
                      <td className={`num ${isReceita ? "green" : "red"}`}>{row.d2 !== 0 ? B.fmt(row.d2) : "—"}</td>
                      <td className={`num ${diff >= 0 ? "green" : "red"}`}>{B.fmt(diff)}</td>
                      <td className={`num ${diff >= 0 ? "green" : "red"}`}>{B.fmtPct(pct)}</td>
                    </tr>
                  );
                })}
                <tr className="total">
                  <td>Total líquido</td>
                  <td className="num">{B.fmt(liq1)}</td>
                  <td className="num">{B.fmt(liq2)}</td>
                  <td className={`num ${diffLiq >= 0 ? "green" : "red"}`}>{B.fmt(diffLiq)}</td>
                  <td className={`num ${diffLiq >= 0 ? "green" : "red"}`}>{B.fmtPct(diffLiqPct)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

// ===== PageRelatorio =====
// Carrega report.json (gerado offline por generate-report.cjs) e renderiza
// um relatorio executivo imprimivel (Ctrl+P -> Save as PDF).
const PageRelatorio = ({ year, statusFilter }) => {
  const B = window.BIT;
  const refYear = window.REF_YEAR || new Date().getFullYear();
  // Estado do periodo a renderizar (defaults: ano corrente YTD)
  const [periodYear, setPeriodYear] = useState(() => {
    try { var p = JSON.parse(localStorage.getItem('radke.report.period') || 'null'); return (p && p.year) || (year || refYear); } catch (e) { return year || refYear; }
  });
  const [periodMonth, setPeriodMonth] = useState(() => {
    try { var p = JSON.parse(localStorage.getItem('radke.report.period') || 'null'); return (p && p.month) || 0; } catch (e) { return 0; } // 0 = ano completo
  });
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showHelp, setShowHelp] = useState(false);

  // resolve o nome do arquivo conforme periodo
  const reportFileName = (y, m) => {
    if (m && m > 0) return `report-${y}-${String(m).padStart(2,'0')}.json`;
    if (y === refYear) return 'report.json'; // default mantem nome principal
    return `report-${y}.json`;
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setReport(null);
    try { localStorage.setItem('radke.report.period', JSON.stringify({ year: periodYear, month: periodMonth })); } catch (e) {}
    const file = reportFileName(periodYear, periodMonth);
    fetch(file, { cache: 'no-store' })
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status} (arquivo ${file})`);
        return r.json();
      })
      .then(data => {
        if (cancelled) return;
        setReport(data);
        setLoading(false);
      })
      .catch(e => {
        if (cancelled) return;
        setError(e.message);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [periodYear, periodMonth]);

  const MONTH_OPTIONS = [
    { v: 0, label: "Ano completo" },
    { v: 1, label: "Janeiro" }, { v: 2, label: "Fevereiro" }, { v: 3, label: "Março" },
    { v: 4, label: "Abril" }, { v: 5, label: "Maio" }, { v: 6, label: "Junho" },
    { v: 7, label: "Julho" }, { v: 8, label: "Agosto" }, { v: 9, label: "Setembro" },
    { v: 10, label: "Outubro" }, { v: 11, label: "Novembro" }, { v: 12, label: "Dezembro" },
  ];
  const availableYears = window.AVAILABLE_YEARS || [refYear];

  const PeriodToolbar = (
    <div className="report-period-toolbar" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
      <span style={{ fontSize: 12, color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Período:</span>
      <select className="header-year" value={periodYear} onChange={e => setPeriodYear(Number(e.target.value))}>
        {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
      </select>
      <select className="header-year" value={periodMonth} onChange={e => setPeriodMonth(Number(e.target.value))}>
        {MONTH_OPTIONS.map(o => <option key={o.v} value={o.v}>{o.label}</option>)}
      </select>
    </div>
  );

  if (loading) {
    return (
      <div className="page">
        <div className="page-title">
          <div><h1>Relatório IA</h1><div className="status-line">Carregando…</div></div>
          <div className="actions">{PeriodToolbar}</div>
        </div>
      </div>
    );
  }

  if (error || !report) {
    const monthLabel = periodMonth > 0 ? MONTH_OPTIONS[periodMonth].label + ' de ' : '';
    const cmd = periodMonth > 0
      ? `node generate-report.cjs --force --year=${periodYear} --month=${periodMonth}`
      : (periodYear === refYear ? `node generate-report.cjs --force` : `node generate-report.cjs --force --year=${periodYear}`);
    return (
      <div className="page">
        <div className="page-title">
          <div>
            <h1>Relatório IA</h1>
            <div className="status-line">Relatório de {monthLabel}{periodYear} ainda não foi gerado</div>
          </div>
          <div className="actions">{PeriodToolbar}</div>
        </div>
        <div className="card">
          <h2 className="card-title">Gerar agora</h2>
          <p style={{ color: "var(--fg-2)", lineHeight: 1.6, marginTop: 12 }}>
            Abra o terminal na pasta <code style={{ background: "var(--surface-2)", padding: "2px 6px", borderRadius: 4 }}>radke-bi</code> e rode:
          </p>
          <pre style={{ background: "var(--surface-2)", padding: 12, borderRadius: 8, marginTop: 12, fontSize: 13, color: "var(--cyan)" }}>
            {cmd}
          </pre>
          <p style={{ color: "var(--fg-3)", fontSize: 12, marginTop: 12 }}>
            ~30s + 1 chamada Anthropic. Depois de pronto, recarregue esta página (mantém o período selecionado).
          </p>
          {error && <p style={{ color: "var(--red)", fontSize: 12, marginTop: 8 }}>Detalhe: {error}</p>}
        </div>
      </div>
    );
  }

  const fmtDate = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const k = B.KPIS || B;
  const recebido = k.TOTAL_RECEITA || 0;
  const pago = k.TOTAL_DESPESA || 0;
  const liquido = k.VALOR_LIQUIDO != null ? k.VALOR_LIQUIDO : (recebido - pago);
  const margem = k.MARGEM_LIQUIDA != null ? k.MARGEM_LIQUIDA : (recebido > 0 ? (liquido / recebido) * 100 : 0);

  const SEG = window.BIT_SEGMENTS || {};
  const aReceber = (SEG.a_pagar_receber && SEG.a_pagar_receber.KPIS && SEG.a_pagar_receber.KPIS.TOTAL_RECEITA) || 0;
  const aPagar = (SEG.a_pagar_receber && SEG.a_pagar_receber.KPIS && SEG.a_pagar_receber.KPIS.TOTAL_DESPESA) || 0;

  const sec = (id) => (report.secoes && report.secoes[id]) || { title: id, analysis: '' };

  const renderAnalysis = (text) => {
    if (!text) return <p className="report-analysis muted">(análise indisponível — verifique se a chamada à API foi bem-sucedida)</p>;
    return text.split(/\n\s*\n/).map((p, i) => (
      <p key={i} className="report-analysis">{p.trim()}</p>
    ));
  };

  return (
    <div className="page">
      {/* Toolbar — escondida no print */}
      <div className="report-toolbar no-print">
        <div>
          <h1 style={{ margin: 0 }}>Relatório IA</h1>
          <div className="status-line">Gerado em {fmtDate(report.generated_at)} · {report.periodo}</div>
        </div>
        <div className="actions" style={{ gap: 12, alignItems: 'center' }}>
          {PeriodToolbar}
          <button className="btn-ghost" onClick={() => setShowHelp(true)}>Regenerar (script)</button>
          <button className="btn-primary" onClick={() => window.print()}>
            <Icon name="download" /> Exportar PDF
          </button>
        </div>
      </div>

      {/* Modal de ajuda */}
      {showHelp && (
        <div className="drawer-overlay no-print" onClick={() => setShowHelp(false)}>
          <div className="card" style={{ maxWidth: 520, margin: "auto", padding: 24 }} onClick={e => e.stopPropagation()}>
            <h2 className="card-title">Como regenerar o relatório</h2>
            <p style={{ color: "var(--fg-2)", lineHeight: 1.6, marginTop: 8 }}>
              O relatório é gerado offline por um script Node que chama a API da Anthropic.
              Não pode ser disparado pelo browser (a chave da API ficaria exposta).
            </p>
            <p style={{ color: "var(--fg-2)", lineHeight: 1.6, marginTop: 12 }}>No terminal, dentro da pasta do projeto:</p>
            <pre style={{ background: "var(--surface-2)", padding: 12, borderRadius: 8, marginTop: 8, fontSize: 13, color: "var(--cyan)" }}>
node generate-report.cjs --force
            </pre>
            <p style={{ color: "var(--fg-3)", fontSize: 12, marginTop: 12 }}>
              Depois recarregue esta página. Sem <code>--force</code>, o script pula se o relatório foi gerado há menos de 1h.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
              <button className="btn-primary" onClick={() => setShowHelp(false)}>Entendi</button>
            </div>
          </div>
        </div>
      )}

      {/* Relatorio imprimivel */}
      <article className="report">
        <header className="report-cover">
          <img src="assets/bgp-logo-white.png" alt="BGP" className="report-logo" />
          <h1 className="report-title">BGP GO BI — Relatório Executivo</h1>
          <p className="report-subtitle">{report.empresa}</p>
          <p className="report-meta">Período: {report.periodo} — Realizado</p>
          <p className="report-meta">Gerado em {fmtDate(report.generated_at)}</p>
        </header>

        <section className="report-section">
          <h2>1. Visão Geral</h2>
          <div className="report-kpis">
            <div className="report-kpi"><span className="lbl">Receita realizada</span><span className="val green">{B.fmt(recebido)}</span></div>
            <div className="report-kpi"><span className="lbl">Despesa realizada</span><span className="val red">{B.fmt(pago)}</span></div>
            <div className="report-kpi"><span className="lbl">Resultado líquido</span><span className="val" style={{ color: liquido >= 0 ? "var(--green)" : "var(--red)" }}>{B.fmt(liquido)}</span></div>
            <div className="report-kpi"><span className="lbl">Margem líquida</span><span className="val">{B.fmtPct ? B.fmtPct(margem) : margem.toFixed(2) + "%"}</span></div>
          </div>
          {renderAnalysis(sec('visao_geral').analysis)}
        </section>

        <section className="report-section">
          <h2>2. Receita</h2>
          <div className="report-kpis">
            <div className="report-kpi"><span className="lbl">Receita recebida</span><span className="val green">{B.fmt(recebido)}</span></div>
            <div className="report-kpi"><span className="lbl">Receita a receber</span><span className="val">{B.fmt(aReceber)}</span></div>
          </div>
          <h3 className="report-sub">Top 5 categorias</h3>
          <ul className="report-list">
            {(B.RECEITA_CATEGORIAS || []).slice(0, 5).map((c, i) => (
              <li key={i}><span>{c.name}</span><b>{B.fmt(c.value)}</b></li>
            ))}
          </ul>
          {renderAnalysis(sec('receita').analysis)}
        </section>

        <section className="report-section">
          <h2>3. Despesa</h2>
          <div className="report-kpis">
            <div className="report-kpi"><span className="lbl">Despesa paga</span><span className="val red">{B.fmt(pago)}</span></div>
            <div className="report-kpi"><span className="lbl">Despesa a pagar</span><span className="val">{B.fmt(aPagar)}</span></div>
          </div>
          <h3 className="report-sub">Top 5 categorias</h3>
          <ul className="report-list">
            {(B.DESPESA_CATEGORIAS || []).slice(0, 5).map((c, i) => (
              <li key={i}><span>{c.name}</span><b>{B.fmt(c.value)}</b></li>
            ))}
          </ul>
          {renderAnalysis(sec('despesa').analysis)}
        </section>

        <section className="report-section">
          <h2>4. Fluxo de Caixa</h2>
          <div className="report-kpis">
            <div className="report-kpi"><span className="lbl">Receita total</span><span className="val green">{B.fmt(recebido)}</span></div>
            <div className="report-kpi"><span className="lbl">Despesa total</span><span className="val red">{B.fmt(pago)}</span></div>
            <div className="report-kpi"><span className="lbl">Líquido</span><span className="val" style={{ color: liquido >= 0 ? "var(--green)" : "var(--red)" }}>{B.fmt(liquido)}</span></div>
          </div>
          <h3 className="report-sub">Líquido mês a mês</h3>
          <ul className="report-list">
            {(B.MONTH_DATA || []).map((m, i) => {
              const v = m.receita - m.despesa;
              return <li key={i}><span style={{ textTransform: "capitalize" }}>{m.m}</span><b style={{ color: v >= 0 ? "var(--green)" : "var(--red)" }}>{B.fmt(v)}</b></li>;
            })}
          </ul>
          {renderAnalysis(sec('fluxo_caixa').analysis)}
        </section>

        <section className="report-section">
          <h2>5. Tesouraria</h2>
          <div className="report-kpis">
            <div className="report-kpi"><span className="lbl">Recebido</span><span className="val green">{B.fmt(recebido)}</span></div>
            <div className="report-kpi"><span className="lbl">A receber</span><span className="val">{B.fmt(aReceber)}</span></div>
            <div className="report-kpi"><span className="lbl">Pago</span><span className="val red">{B.fmt(pago)}</span></div>
            <div className="report-kpi"><span className="lbl">A pagar</span><span className="val">{B.fmt(aPagar)}</span></div>
          </div>
          {renderAnalysis(sec('tesouraria').analysis)}
        </section>

        <section className="report-section">
          <h2>6. Comparativo</h2>
          {renderAnalysis(sec('comparativo').analysis)}
        </section>

        <section className="report-section report-conclusion">
          <h2>Conclusão e Recomendações</h2>
          {renderAnalysis(report.conclusao)}
        </section>

        <footer className="report-footer">
          BGP GO BI · {report.empresa} · {report.periodo} · Gerado em {fmtDate(report.generated_at)}
        </footer>
      </article>
    </div>
  );
};

Object.assign(window, { PageFluxo, PageTesouraria, PageComparativo, PageRelatorio });
