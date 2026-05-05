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

Object.assign(window, { PageFaturamentoProduto, PageCurvaABC, PageMarketing });
