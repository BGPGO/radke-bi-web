/* BIT/RADKE — Pages 3: telas extras do PBIX Personalizado (Faturamento por Produto, Curva ABC, Marketing ADS) */
const { useState, useMemo } = React;

// ---------- helpers ----------
const formatBR = (n, dec = 2) => {
  if (n == null || isNaN(n)) return "0,00";
  const s = Math.abs(n).toFixed(dec);
  const [int, d] = s.split(".");
  const formatted = int.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + (d ? "," + d : "");
  return (n < 0 ? "-" : "") + formatted;
};
const formatInt = (n) => formatBR(n, 0);

// Mini-card compativel com .kpi-tile do molde
const MiniKpi = ({ label, value, hint, tone, nonMonetary }) => (
  <div className={`kpi-tile ${tone || ""}`}>
    <div>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">
        {!nonMonetary && <span className="currency">R$</span>}
        {value}
      </div>
      {hint && <div className="kpi-delta" style={{ color: "var(--fg-3)" }}>{hint}</div>}
    </div>
  </div>
);

// ============================================================
// PageFaturamentoProduto — replica "FaturamentoPorProduto" do PBIX
// ============================================================
const PageFaturamentoProduto = ({ drilldown, setDrilldown }) => {
  const E = (typeof window !== "undefined" && window.BIT_RADKE_EXTRAS) || null;
  if (!E || !E.faturamento) {
    return (
      <div className="page">
        <div className="page-title"><div><h1>Faturamento por Produto</h1></div></div>
        <div className="card"><h2 className="card-title">Sem dados</h2><p>Rode <code>node build-radke-extras.cjs</code> pra gerar data-extras.js.</p></div>
      </div>
    );
  }
  const F = E.faturamento;
  const T = F.totais;

  const [activeFamilia, setActiveFamilia] = useState(null);

  const detalhamento = useMemo(() => {
    if (!activeFamilia) return F.detalhado.slice(0, 30);
    return F.detalhado.filter(d => d.name.startsWith(activeFamilia + " "));
  }, [activeFamilia, F.detalhado]);

  const handleFamiliaClick = (it) => {
    setActiveFamilia(activeFamilia === it.name ? null : it.name);
  };

  return (
    <div className="page">
      <div className="page-title">
        <div>
          <h1>Faturamento por Produto</h1>
          <div className="status-line">{T.numNFs} NFs · {T.numProdutos} produtos · {T.numClientes} clientes · ano {T.anoRef}</div>
        </div>
        <div className="actions">
          <ExportButton />
        </div>
      </div>

      {activeFamilia && (
        <div className="drilldown-badge">
          <span className="dd-label">Filtrando familia: <b>{activeFamilia}</b></span>
          <button className="dd-clear" onClick={() => setActiveFamilia(null)}>× Limpar</button>
        </div>
      )}

      <div className="kpi-row">
        <MiniKpi tone="green" label="Total Mercadoria" value={formatBR(T.totalValor)} hint={`${T.numItens} itens`} />
        <MiniKpi tone="cyan"  label="Quantidade" value={formatInt(T.totalQtd)} nonMonetary hint="unidades faturadas" />
        <MiniKpi tone="amber" label="Ticket Medio (NF)" value={formatBR(T.ticketMedio)} hint={`${T.numNFs} notas fiscais`} />
        <MiniKpi tone="cyan"  label="Clientes" value={formatInt(T.numClientes)} nonMonetary hint="distintos no periodo" />
      </div>

      <div className="row" style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)" }}>
        <div className="card">
          <h2 className="card-title">Faturamento por Familia</h2>
          <BarList items={F.porFamilia.slice(0, 12)} color="cyan"
            valueKey="value" labelKey="name"
            onItemClick={handleFamiliaClick}
            activeName={activeFamilia} />
        </div>
        <div className="card">
          <h2 className="card-title">Faturamento por Vendedor</h2>
          <BarList items={F.porVendedor.slice(0, 10)} color="green"
            valueKey="value" labelKey="name" />
        </div>
      </div>

      <div className="row" style={{ gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)" }}>
        <div className="card">
          <h2 className="card-title">Faturamento mensal — {T.anoRef}</h2>
          <SingleBars
            values={F.porMes.map(x => x.valor)}
            labels={F.porMes.map(x => x.m)}
            color="cyan"
            height={220}
          />
        </div>
        <div className="card">
          <h2 className="card-title">Top Clientes</h2>
          <BarList items={F.porCliente.slice(0, 8)} color="green"
            valueKey="value" labelKey="name" />
        </div>
      </div>

      <div className="card">
        <div className="card-title-row">
          <h2 className="card-title">Detalhamento Familia ▸ Produto {activeFamilia ? `(${activeFamilia})` : ""}</h2>
          <span className="status-line">{detalhamento.length} linhas</span>
        </div>
        <div className="t-scroll" style={{ maxHeight: 380 }}>
          <table className="t">
            <thead><tr><th>Familia ▸ Produto</th><th className="num">Qtd</th><th className="num">Valor</th></tr></thead>
            <tbody>
              {detalhamento.map((row, i) => (
                <tr key={i}>
                  <td>{row.name}</td>
                  <td className="num">{formatInt(row.qtd)}</td>
                  <td className="num green">R$ {formatBR(row.value)}</td>
                </tr>
              ))}
              {detalhamento.length === 0 && (
                <tr><td colSpan="3" style={{ textAlign: "center", color: "var(--fg-3)", padding: "20px" }}>Nenhum item para essa familia.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// PageCurvaABC — replica "Detalhado" (Curva ABC de Produtos) do PBIX
// ============================================================
const PageCurvaABC = ({ drilldown, setDrilldown }) => {
  const E = (typeof window !== "undefined" && window.BIT_RADKE_EXTRAS) || null;
  if (!E || !E.abc) {
    return (
      <div className="page">
        <div className="page-title"><div><h1>Curva ABC</h1></div></div>
        <div className="card"><h2 className="card-title">Sem dados</h2><p>Rode <code>node build-radke-extras.cjs</code>.</p></div>
      </div>
    );
  }
  const A = E.abc;
  const [classFilter, setClassFilter] = useState("todas"); // todas | A | B | C

  const filtered = useMemo(() => {
    if (classFilter === "todas") return A.rows;
    return A.rows.filter(r => (r.abc || "").charAt(0).toUpperCase() === classFilter);
  }, [classFilter, A.rows]);

  // top 20 por valor
  const top20 = useMemo(() => filtered.slice().sort((a, b) => b.valorFaturado - a.valorFaturado).slice(0, 20), [filtered]);

  // Curva acumulada (ordem original do XLSX, ja sortada)
  const curvaPts = A.rows.map((r, i) => ({
    x: i + 1,
    pct: r.pctAcumulado || 0,
  }));
  const curvaValues = A.rows.map(r => r.pctAcumulado || 0);
  const curvaLabels = A.rows.map((_, i) => i % 30 === 0 ? String(i + 1) : "");

  // Totais por classe
  const totaisPorClasse = ["A", "B", "C"].map(k => {
    const items = A.rows.filter(r => (r.abc || "").charAt(0).toUpperCase() === k);
    return {
      classe: k,
      qtd: items.length,
      valor: items.reduce((s, x) => s + x.valorFaturado, 0),
    };
  });
  const totalGeral = totaisPorClasse.reduce((s, x) => s + x.valor, 0);

  // colorir top20 por classe
  const colorByABC = (abc) => {
    const k = (abc || "").charAt(0).toUpperCase();
    if (k === "A") return "green";
    if (k === "B") return "cyan";
    return "red";
  };

  return (
    <div className="page">
      <div className="page-title">
        <div>
          <h1>Curva ABC de Produtos</h1>
          <div className="status-line">{A.total} produtos · A: {A.counts.A} · B: {A.counts.B} · C: {A.counts.C}</div>
        </div>
        <div className="actions">
          <div className="seg">
            <button className={classFilter === "todas" ? "active" : ""} onClick={() => setClassFilter("todas")}>Todas</button>
            <button className={classFilter === "A" ? "active" : ""} onClick={() => setClassFilter("A")}>A (top)</button>
            <button className={classFilter === "B" ? "active" : ""} onClick={() => setClassFilter("B")}>B</button>
            <button className={classFilter === "C" ? "active" : ""} onClick={() => setClassFilter("C")}>C</button>
          </div>
          <ExportButton />
        </div>
      </div>

      <div className="kpi-row">
        {totaisPorClasse.map(t => (
          <MiniKpi
            key={t.classe}
            tone={t.classe === "A" ? "green" : (t.classe === "B" ? "cyan" : "red")}
            label={`Classe ${t.classe}`}
            value={formatBR(t.valor)}
            hint={`${t.qtd} produtos · ${totalGeral > 0 ? ((t.valor / totalGeral) * 100).toFixed(1).replace(".", ",") : "0"}% do total`}
          />
        ))}
        <MiniKpi tone="amber" label="Faturamento Total" value={formatBR(totalGeral)} hint={`${A.total} produtos`} />
      </div>

      <div className="row" style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)" }}>
        <div className="card">
          <h2 className="card-title">Top 20 produtos {classFilter !== "todas" ? `(classe ${classFilter})` : ""}</h2>
          <div className="bar-list with-bars">
            {top20.map((p, i) => {
              const max = top20[0]?.valorFaturado || 1;
              const w = (p.valorFaturado / max) * 100;
              const color = colorByABC(p.abc);
              return (
                <div key={i} className="bar-row">
                  <div className="row-meta">
                    <span className="label" title={p.descricao}>
                      <span className={`badge`} style={{ background: color === "green" ? "var(--green)" : color === "cyan" ? "var(--cyan)" : "var(--red)", color: "#0b0f14", marginRight: 6, padding: "1px 5px", borderRadius: 3, fontSize: 10 }}>{(p.abc || "").charAt(0)}</span>
                      {p.descricao.length > 50 ? p.descricao.slice(0, 50) + "…" : p.descricao}
                    </span>
                    <span className="val">R$ {formatBR(p.valorFaturado)}</span>
                  </div>
                  <div className="track"><div className={`fill ${color}`} style={{ width: `${w}%` }} /></div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card">
          <h2 className="card-title">Curva acumulada (% do faturamento)</h2>
          <TrendChart
            values={curvaValues}
            labels={curvaLabels}
            color="var(--cyan)"
            height={260}
            showPoints={false}
            showLabels={false}
            gradientId="curve-abc"
          />
          <div className="status-line" style={{ marginTop: 8 }}>
            Eixo X = ranking do produto (1 a {A.total}). Eixo Y = % acumulado do faturamento. Curva tipica 80/20.
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-title-row">
          <h2 className="card-title">Tabela completa</h2>
          <span className="status-line">{filtered.length} produtos</span>
        </div>
        <div className="t-scroll" style={{ maxHeight: 420 }}>
          <table className="t">
            <thead>
              <tr>
                <th style={{ width: 40 }}>#</th>
                <th>Classe</th>
                <th>Familia</th>
                <th>Produto</th>
                <th className="num">Qtd</th>
                <th className="num">Valor</th>
                <th className="num">% Acum</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 200).map((p, i) => (
                <tr key={i}>
                  <td>{p.ordem || i + 1}</td>
                  <td><span style={{ color: colorByABC(p.abc) === "green" ? "var(--green)" : colorByABC(p.abc) === "cyan" ? "var(--cyan)" : "var(--red)", fontWeight: 700 }}>{(p.abc || "").charAt(0)}</span></td>
                  <td>{p.familia || "—"}</td>
                  <td title={p.descricao}>{p.descricao.length > 60 ? p.descricao.slice(0, 60) + "…" : p.descricao}</td>
                  <td className="num">{formatInt(p.qtdFaturada)}</td>
                  <td className="num green">R$ {formatBR(p.valorFaturado)}</td>
                  <td className="num">{(p.pctAcumulado || 0).toFixed(2).replace(".", ",")}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// PageMarketing — replica "Análise Profunda" (Facebook ADS) do PBIX
// ============================================================
const PageMarketing = ({ drilldown, setDrilldown }) => {
  const E = (typeof window !== "undefined" && window.BIT_RADKE_EXTRAS) || null;
  if (!E || !E.ads) {
    return (
      <div className="page">
        <div className="page-title"><div><h1>Marketing ADS</h1></div></div>
        <div className="card"><h2 className="card-title">Sem dados</h2><p>Rode <code>node build-radke-extras.cjs</code>.</p></div>
      </div>
    );
  }
  const M = E.ads;
  const T = M.totais;

  const [activeCamp, setActiveCamp] = useState(null);

  // detalhe da campanha selecionada (ou null = todas)
  const detalhe = useMemo(() => {
    if (!activeCamp) return M.rows;
    return M.rows.filter(r => r.campanha === activeCamp);
  }, [activeCamp, M.rows]);

  const handleCampClick = (it) => {
    const newName = it.campanha;
    setActiveCamp(activeCamp === newName ? null : newName);
  };

  // bar list de campanhas (top por gasto)
  const barCampanhas = M.campanhasAgg.map(c => ({ name: c.campanha, value: c.valorBRL }));

  return (
    <div className="page">
      <div className="page-title">
        <div>
          <h1>Marketing — Facebook ADS</h1>
          <div className="status-line">{T.numCampanhas} campanhas · gasto total R$ {formatBR(T.gastoTotal)}</div>
        </div>
        <div className="actions">
          <ExportButton />
        </div>
      </div>

      {activeCamp && (
        <div className="drilldown-badge">
          <span className="dd-label">Campanha: <b>{activeCamp}</b></span>
          <button className="dd-clear" onClick={() => setActiveCamp(null)}>× Limpar</button>
        </div>
      )}

      <div className="kpi-row">
        <MiniKpi tone="amber" label="Gasto Total" value={formatBR(T.gastoTotal)} hint={`${T.numCampanhas} campanhas`} />
        <MiniKpi tone="cyan"  label="Alcance" value={formatInt(T.alcanceTotal)} nonMonetary hint="pessoas atingidas" />
        <MiniKpi tone="cyan"  label="Impressoes" value={formatInt(T.impressoesTotal)} nonMonetary hint={`freq ${T.alcanceTotal > 0 ? (T.impressoesTotal / T.alcanceTotal).toFixed(2).replace(".", ",") : "0"}`} />
        <MiniKpi tone="green" label="Cliques no link" value={formatInt(T.cliquesTotal)} nonMonetary hint={`CTR ${T.ctrMedio.toFixed(2).replace(".", ",")}%`} />
        <MiniKpi tone="green" label="Resultados" value={formatInt(T.resultadosTotal)} nonMonetary hint={`CPM ${formatBR(T.cpmMedio)}`} />
      </div>

      <div className="row" style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)" }}>
        <div className="card">
          <h2 className="card-title">Gasto por campanha</h2>
          <BarList
            items={barCampanhas}
            color="amber"
            valueKey="value"
            labelKey="name"
            onItemClick={(it) => handleCampClick({ campanha: it.name })}
            activeName={activeCamp}
          />
        </div>
        <div className="card">
          <h2 className="card-title">Performance por campanha</h2>
          <div className="t-scroll" style={{ maxHeight: 320 }}>
            <table className="t">
              <thead>
                <tr>
                  <th>Campanha</th>
                  <th className="num">Impr.</th>
                  <th className="num">Cliques</th>
                  <th className="num">CTR</th>
                  <th className="num">CPC</th>
                </tr>
              </thead>
              <tbody>
                {M.campanhasAgg.map((c, i) => (
                  <tr key={i} className={activeCamp === c.campanha ? "active" : ""}
                      onClick={() => handleCampClick({ campanha: c.campanha })}
                      style={{ cursor: "pointer" }}>
                    <td>{c.campanha.length > 30 ? c.campanha.slice(0, 30) + "…" : c.campanha}</td>
                    <td className="num">{formatInt(c.impressoes)}</td>
                    <td className="num">{formatInt(c.cliques)}</td>
                    <td className="num cyan">{c.ctr.toFixed(2).replace(".", ",")}%</td>
                    <td className="num">R$ {formatBR(c.cpc)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-title-row">
          <h2 className="card-title">Detalhamento por anuncio {activeCamp ? `· ${activeCamp}` : ""}</h2>
          <span className="status-line">{detalhe.length} linhas</span>
        </div>
        <div className="t-scroll" style={{ maxHeight: 380 }}>
          <table className="t">
            <thead>
              <tr>
                <th>Campanha</th>
                <th>Conjunto</th>
                <th>Anuncio</th>
                <th>Status</th>
                <th className="num">Alcance</th>
                <th className="num">Impressoes</th>
                <th className="num">Gasto</th>
                <th className="num">Resultados</th>
                <th className="num">Custo/Result.</th>
              </tr>
            </thead>
            <tbody>
              {detalhe.map((r, i) => (
                <tr key={i}>
                  <td title={r.campanha}>{(r.campanha || "").slice(0, 25)}</td>
                  <td>{r.conjunto}</td>
                  <td>{r.anuncio}</td>
                  <td><span style={{ color: r.status === "active" ? "var(--green)" : "var(--fg-3)" }}>{r.status || "—"}</span></td>
                  <td className="num">{formatInt(r.alcance)}</td>
                  <td className="num">{formatInt(r.impressoes)}</td>
                  <td className="num amber">R$ {formatBR(r.valorBRL)}</td>
                  <td className="num">{formatInt(r.resultados)}</td>
                  <td className="num">R$ {formatBR(r.custoPorResultado)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// PageValuation — replica ValuationTab do fin40 (DCF de 5 anos)
// Premissas default = RADKE no fin40 (valuation_premissas.json):
//   growth_year2: 20, growth_year3: 20, ipca: 4.5, wacc: 25,
//   perpetuity_growth: 10, use_simulated_margin: false, simulated_margin: 15
// Persistencia local em localStorage.radke.valuation
// ============================================================
const VALUATION_LS_KEY = "radke.valuation";
const VALUATION_DEFAULTS = {
  growth_year2: 20,
  growth_year3: 20,
  ipca: 4.5,
  wacc: 25,
  perpetuity_growth: 10,
  use_simulated_margin: false,
  simulated_margin: 15,
};

function loadValuationPremissas() {
  try {
    const raw = localStorage.getItem(VALUATION_LS_KEY);
    if (!raw) return { ...VALUATION_DEFAULTS };
    const parsed = JSON.parse(raw);
    return { ...VALUATION_DEFAULTS, ...parsed };
  } catch (e) {
    return { ...VALUATION_DEFAULTS };
  }
}

function saveValuationPremissas(p) {
  try { localStorage.setItem(VALUATION_LS_KEY, JSON.stringify(p)); } catch (e) {}
}

// Slider + input numerico com label e sufixo (%)
const PctSlider = ({ label, value, onChange, min = 0, max = 100, step = 0.5 }) => {
  return (
    <div className="val-pct">
      <div className="val-pct-head">
        <span className="val-pct-label">{label}</span>
        <span className="val-pct-value">{(value || 0).toFixed(1).replace(".", ",")}%</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ width: "100%", accentColor: "var(--cyan)" }}
      />
      <input
        type="number"
        className="filter-select"
        style={{ marginTop: 6, height: 28, fontSize: 12, padding: "2px 8px" }}
        value={value}
        step={step}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          if (Number.isFinite(v)) onChange(v);
        }}
      />
    </div>
  );
};

const PageValuation = () => {
  const B = window.BIT || {};
  const REF_YEAR = window.REF_YEAR || new Date().getFullYear();
  const fmt = B.fmt || ((n) => "R$ " + formatBR(n || 0));

  // ----- Estado: premissas editaveis (localStorage) -----
  const [premissas, setPremissasState] = useState(() => loadValuationPremissas());

  const updatePremissa = (patch) => {
    setPremissasState((prev) => {
      const next = { ...prev, ...patch };
      saveValuationPremissas(next);
      return next;
    });
  };

  const resetPremissas = () => {
    setPremissasState({ ...VALUATION_DEFAULTS });
    saveValuationPremissas({ ...VALUATION_DEFAULTS });
  };

  // ----- Inputs derivados de window.BIT -----
  // MONTH_DATA tem 12 meses do ano REF_YEAR ja. Receita YTD = soma dos meses
  // que tem receita > 0 (i.e., os meses com dados realizados/orcados).
  const MD = Array.isArray(B.MONTH_DATA) ? B.MONTH_DATA : [];
  const monthsWithData = MD.filter(m => (m.receita || 0) > 0 || (m.despesa || 0) > 0);
  const monthCount = Math.max(1, monthsWithData.length);
  const totalRecYTD = MD.reduce((s, m) => s + (m.receita || 0), 0);
  const totalDespYTD = MD.reduce((s, m) => s + (m.despesa || 0), 0);
  const resultadoYTD = totalRecYTD - totalDespYTD;
  const margemEfetiva = totalRecYTD > 0 ? (resultadoYTD / totalRecYTD) * 100 : 0;

  // ----- DCF (5 anos) -----
  // Ano 1: receita anualizada (YTD * 12 / monthCount). Se ja temos 12 meses,
  // anualizar = identidade. Para 4 meses, ano1 = ytd * 3.
  const dcf = useMemo(() => {
    const { growth_year2, growth_year3, ipca, wacc, perpetuity_growth,
            use_simulated_margin, simulated_margin } = premissas;

    const ano1Receita = monthCount >= 12
      ? totalRecYTD
      : (totalRecYTD * 12) / monthCount;

    // Margem usada pra gerar EBITDA/FCF
    const margemPct = use_simulated_margin
      ? (simulated_margin || 0)
      : margemEfetiva;
    const margemDecimal = margemPct / 100;

    // Projecao de receita 5 anos:
    // Ano 1: anualizada (YTD * 12 / mes)
    // Ano 2: ano1 * (1 + growth_year2)
    // Ano 3: ano2 * (1 + growth_year3)
    // Ano 4-5: cresce por IPCA
    const receitas = [
      ano1Receita,
      ano1Receita * (1 + (growth_year2 || 0) / 100),
      ano1Receita * (1 + (growth_year2 || 0) / 100) * (1 + (growth_year3 || 0) / 100),
    ];
    receitas.push(receitas[2] * (1 + (ipca || 0) / 100));
    receitas.push(receitas[3] * (1 + (ipca || 0) / 100));

    // FCF = receita * margem (aproxima EBITDA, simplificacao do DCF clássico)
    const fcfs = receitas.map(r => r * margemDecimal);
    const ebitdas = fcfs; // mesmo valor (sem D&A separado)

    // VP de cada FCF = FCF / (1 + wacc)^i, i=1..5
    const waccDecimal = (wacc || 0) / 100;
    const factors = [1, 2, 3, 4, 5].map(i => Math.pow(1 + waccDecimal, i));
    const vps = fcfs.map((f, i) => f / factors[i]);
    const pvFCF = vps.reduce((s, v) => s + v, 0);

    // Valor terminal Gordon: FCF[5] * (1 + g) / (wacc - g), descontado por (1+wacc)^5
    const gDecimal = (perpetuity_growth || 0) / 100;
    let terminalValue = 0;
    let pvTerminal = 0;
    if (waccDecimal > gDecimal) {
      terminalValue = (fcfs[4] * (1 + gDecimal)) / (waccDecimal - gDecimal);
      pvTerminal = terminalValue / factors[4];
    }

    const totalValuation = pvFCF + pvTerminal;

    return {
      ano1Receita, margemPct, margemDecimal,
      receitas, ebitdas, fcfs, factors, vps,
      pvFCF, terminalValue, pvTerminal, totalValuation,
      waccValid: waccDecimal > gDecimal,
    };
  }, [premissas, totalRecYTD, monthCount, margemEfetiva]);

  // ----- Helpers de formatacao -----
  const fmtMoney = (n) => "R$ " + formatBR(n || 0, 0);
  const fmtMoneyM = (n) => {
    if (Math.abs(n || 0) >= 1e6) return "R$ " + formatBR((n || 0) / 1e6, 2) + " M";
    if (Math.abs(n || 0) >= 1e3) return "R$ " + formatBR((n || 0) / 1e3, 0) + " K";
    return "R$ " + formatBR(n || 0, 0);
  };

  return (
    <div className="page">
      <div className="page-title">
        <div>
          <h1>Valuation — Fluxo de Caixa Descontado</h1>
          <div className="status-line">
            Projecao de 5 anos · YTD {monthCount} {monthCount === 1 ? "mes" : "meses"} de {REF_YEAR} · WACC {premissas.wacc}% · g {premissas.perpetuity_growth}%
          </div>
        </div>
        <div className="actions">
          <button className="btn-ghost" onClick={resetPremissas} title="Voltar para premissas RADKE default">↺ Resetar premissas</button>
          <ExportButton />
        </div>
      </div>

      {/* ============ Premissas editaveis ============ */}
      <div className="card">
        <h2 className="card-title">Premissas editaveis</h2>
        <div className="row" style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 16 }}>
          <div>
            <h3 style={{ fontSize: 12, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 12 }}>Crescimento da Receita</h3>
            <div className="row" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <PctSlider label={`Ano 2 (${REF_YEAR + 1})`} value={premissas.growth_year2} onChange={(v) => updatePremissa({ growth_year2: v })} min={-20} max={100} />
              <PctSlider label={`Ano 3 (${REF_YEAR + 2})`} value={premissas.growth_year3} onChange={(v) => updatePremissa({ growth_year3: v })} min={-20} max={100} />
              <PctSlider label="IPCA (anos 4-5)" value={premissas.ipca} onChange={(v) => updatePremissa({ ipca: v })} min={0} max={20} step={0.1} />
              <PctSlider label="Crescimento perpetuo (g)" value={premissas.perpetuity_growth} onChange={(v) => updatePremissa({ perpetuity_growth: v })} min={0} max={20} step={0.5} />
            </div>
          </div>
          <div>
            <h3 style={{ fontSize: 12, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 12 }}>Taxa de desconto e margem</h3>
            <div className="row" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <PctSlider label="WACC" value={premissas.wacc} onChange={(v) => updatePremissa({ wacc: v })} min={5} max={50} />
              <PctSlider label="Margem simulada" value={premissas.simulated_margin} onChange={(v) => updatePremissa({ simulated_margin: v })} min={-20} max={50} />
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, fontSize: 13, color: "var(--fg-2)", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={premissas.use_simulated_margin}
                onChange={(e) => updatePremissa({ use_simulated_margin: e.target.checked })}
                style={{ width: 16, height: 16, accentColor: "var(--cyan)" }}
              />
              Usar margem simulada (em vez da margem efetiva {margemEfetiva.toFixed(1).replace(".", ",")}%)
            </label>
          </div>
        </div>
      </div>

      {/* ============ Inputs derivados (window.BIT) ============ */}
      <div className="kpi-row">
        <MiniKpi tone="green" label={`Receita YTD (${REF_YEAR})`} value={formatBR(totalRecYTD, 0)} hint={`${monthCount} ${monthCount === 1 ? "mes" : "meses"} · anualiza p/ ${formatBR(dcf.ano1Receita, 0)}`} />
        <MiniKpi tone="red"   label={`Despesa YTD (${REF_YEAR})`} value={formatBR(totalDespYTD, 0)} hint={`${monthCount} ${monthCount === 1 ? "mes" : "meses"}`} />
        <MiniKpi tone="cyan"  label="Resultado YTD" value={formatBR(resultadoYTD, 0)} hint={`Margem efetiva ${margemEfetiva.toFixed(1).replace(".", ",")}%`} />
        <MiniKpi tone="amber" label="Margem aplicada no DCF" value={dcf.margemPct.toFixed(1).replace(".", ",") + "%"} nonMonetary hint={premissas.use_simulated_margin ? "simulada (toggle on)" : "efetiva (YTD)"} />
      </div>

      {/* ============ Tabela de projecao 5 anos ============ */}
      <div className="card">
        <h2 className="card-title">Projecao 5 anos — Receita, EBITDA, FCF, Valor Presente</h2>
        <div className="t-scroll">
          <table className="t">
            <thead>
              <tr>
                <th>Ano</th>
                <th className="num">Receita</th>
                <th className="num">EBITDA / FCF</th>
                <th className="num">Crescimento</th>
                <th className="num">Fator desconto (1+WACC)<sup>n</sup></th>
                <th className="num">Valor Presente (FCF)</th>
              </tr>
            </thead>
            <tbody>
              {dcf.receitas.map((rec, i) => {
                const growth = i === 0 ? null
                  : i === 1 ? premissas.growth_year2
                  : i === 2 ? premissas.growth_year3
                  : premissas.ipca;
                const growthLabel = growth == null
                  ? "—"
                  : (growth >= 0 ? "+" : "") + growth.toFixed(1).replace(".", ",") + "%";
                return (
                  <tr key={i}>
                    <td><b>Ano {i + 1}</b> <span style={{ color: "var(--fg-3)" }}>({REF_YEAR + i})</span></td>
                    <td className="num">R$ {formatBR(rec, 0)}</td>
                    <td className="num cyan">R$ {formatBR(dcf.fcfs[i], 0)}</td>
                    <td className="num">{growthLabel}</td>
                    <td className="num">{dcf.factors[i].toFixed(3).replace(".", ",")}</td>
                    <td className="num green">R$ {formatBR(dcf.vps[i], 0)}</td>
                  </tr>
                );
              })}
              <tr style={{ background: "rgba(34, 211, 238, 0.06)", fontWeight: 700 }}>
                <td colSpan="5" style={{ textAlign: "right" }}>VP dos Fluxos (5 anos)</td>
                <td className="num green">R$ {formatBR(dcf.pvFCF, 0)}</td>
              </tr>
              <tr>
                <td colSpan="5" style={{ textAlign: "right" }}>Valor Terminal (Gordon, FCF<sub>5</sub>·(1+g)/(WACC−g))</td>
                <td className="num">R$ {formatBR(dcf.terminalValue, 0)}</td>
              </tr>
              <tr style={{ background: "rgba(34, 211, 238, 0.06)", fontWeight: 700 }}>
                <td colSpan="5" style={{ textAlign: "right" }}>VP do Valor Terminal</td>
                <td className="num green">R$ {formatBR(dcf.pvTerminal, 0)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        {!dcf.waccValid && (
          <div className="status-line" style={{ marginTop: 8, color: "var(--red)" }}>
            ⚠ WACC ({premissas.wacc}%) deve ser maior que crescimento perpetuo ({premissas.perpetuity_growth}%) para calcular valor terminal.
          </div>
        )}
      </div>

      {/* ============ Card destaque: Valuation Total ============ */}
      <div className="card" style={{
        background: "linear-gradient(135deg, rgba(34,211,238,0.10), rgba(34,211,238,0.02))",
        borderColor: "rgba(34,211,238,0.30)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>
              Valuation Total (Enterprise Value)
            </div>
            <div style={{ fontSize: 38, fontWeight: 800, color: dcf.totalValuation >= 0 ? "var(--cyan)" : "var(--red)", lineHeight: 1.1 }}>
              {fmtMoneyM(dcf.totalValuation)}
            </div>
            <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 6 }}>
              WACC {premissas.wacc}% · Crescimento perpetuo {premissas.perpetuity_growth}% · Margem {dcf.margemPct.toFixed(1).replace(".", ",")}%
            </div>
          </div>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 11, color: "var(--fg-3)", textTransform: "uppercase" }}>VP Fluxos (5a)</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--green)" }}>R$ {formatBR(dcf.pvFCF, 0)}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--fg-3)", textTransform: "uppercase" }}>VP Terminal</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--cyan)" }}>R$ {formatBR(dcf.pvTerminal, 0)}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="status-line" style={{ marginTop: 12, fontSize: 11, color: "var(--fg-3)" }}>
        Notas: (1) Receita Ano 1 = Receita YTD × 12/{monthCount} (anualizada). (2) FCF = Receita × Margem ({premissas.use_simulated_margin ? "simulada" : "efetiva"}). (3) Anos 2-3 crescem por premissa; anos 4-5 por IPCA. (4) Valor terminal = Modelo de Gordon. (5) Premissas salvas em localStorage.{VALUATION_LS_KEY}.
      </div>
    </div>
  );
};

Object.assign(window, { PageFaturamentoProduto, PageCurvaABC, PageMarketing, PageValuation });
