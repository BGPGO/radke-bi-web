/* BIT/RADKE — Pages 4: Hierarquia ADS, Detalhado (familia+cliente), Profunda Cliente, CRM */
const { useState, useMemo } = React;

// ---------- helpers locais ----------
const _fmtBR4 = (n, dec = 2) => {
  if (n == null || isNaN(n)) return "0,00";
  const s = Math.abs(n).toFixed(dec);
  const [int, d] = s.split(".");
  const formatted = int.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + (d ? "," + d : "");
  return (n < 0 ? "-" : "") + formatted;
};
const _fmtInt4 = (n) => _fmtBR4(n, 0);

// Mini KPI compativel com molde
const _MiniKpi4 = ({ label, value, hint, tone, nonMonetary }) => (
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

// Linha horizontal com barra proporcional (uso interno na arvore)
const _HBar = ({ label, value, max, color = "amber", showValue = true, sub }) => {
  const w = max > 0 ? Math.max(2, (value / max) * 100) : 0;
  const colorVar = color === "cyan" ? "var(--cyan)"
    : color === "green" ? "var(--green)"
    : color === "red" ? "var(--red)"
    : "var(--amber)";
  return (
    <div className="bar-row" style={{ marginBottom: 8 }}>
      <div className="row-meta">
        <span className="label" title={label}>
          {label.length > 38 ? label.slice(0, 38) + "…" : label}
          {sub && <span style={{ color: "var(--fg-3)", fontSize: 10, marginLeft: 6 }}>{sub}</span>}
        </span>
        {showValue && <span className="val">{showValue === "money" ? `R$ ${_fmtBR4(value)}` : _fmtInt4(value)}</span>}
      </div>
      <div className="track">
        <div className="fill" style={{ width: `${w}%`, background: colorVar }} />
      </div>
    </div>
  );
};

// ============================================================
// PageHierarquia — Arvore Campanha -> Adset -> Anuncio (Facebook ADS)
// ============================================================
const PageHierarquia = ({ statusFilter, year, month, drilldown, setDrilldown }) => {
  const E = (typeof window !== "undefined" && window.BIT_RADKE_EXTRAS) || null;
  if (!E || !E.ads || !E.ads.rows || E.ads.rows.length === 0) {
    return (
      <div className="page">
        <div className="page-title"><div><h1>Hierarquia ADS</h1></div></div>
        <div className="card">
          <h2 className="card-title">Sem dados</h2>
          <p>Rode <code>node build-radke-extras.cjs</code> pra gerar os dados das campanhas Facebook ADS.</p>
        </div>
      </div>
    );
  }
  const rows = E.ads.rows;
  const T = E.ads.totais;

  // Filtros decorativos
  const [tipoResultado, setTipoResultado] = useState("todos");
  const [campanhaFiltro, setCampanhaFiltro] = useState("todas");
  const [anuncioFiltro, setAnuncioFiltro] = useState("todos");
  const [dataInicio, setDataInicio] = useState("");

  // Lista unica de campanhas e anuncios pros dropdowns
  const campanhasUniq = useMemo(() => {
    const s = new Set();
    rows.forEach(r => { if (r.campanha) s.add(r.campanha); });
    return Array.from(s);
  }, [rows]);
  const anunciosUniq = useMemo(() => {
    const s = new Set();
    rows.forEach(r => { if (r.anuncio) s.add(r.anuncio); });
    return Array.from(s);
  }, [rows]);

  // Aplicar filtros (decorativos onde nao ha dado, mas campanha/anuncio filtram de fato)
  const rowsFiltered = useMemo(() => {
    return rows.filter(r => {
      if (campanhaFiltro !== "todas" && r.campanha !== campanhaFiltro) return false;
      if (anuncioFiltro !== "todos" && r.anuncio !== anuncioFiltro) return false;
      return true;
    });
  }, [rows, campanhaFiltro, anuncioFiltro]);

  // Construir arvore: Campanha -> Conjuntos (adsets) -> Anuncios
  const tree = useMemo(() => {
    const map = new Map();
    for (const r of rowsFiltered) {
      const camp = r.campanha || "(sem campanha)";
      if (!map.has(camp)) map.set(camp, {
        campanha: camp, valorBRL: 0, alcance: 0, impressoes: 0, leads: 0, resultados: 0,
        adsets: new Map(),
      });
      const cNode = map.get(camp);
      cNode.valorBRL += r.valorBRL || 0;
      cNode.alcance = Math.max(cNode.alcance, r.alcance || 0);
      cNode.impressoes += r.impressoes || 0;
      cNode.leads += r.leads || 0;
      cNode.resultados += r.resultados || 0;

      const adset = r.conjunto || "(sem conjunto)";
      if (!cNode.adsets.has(adset)) cNode.adsets.set(adset, {
        conjunto: adset, valorBRL: 0, alcance: 0, impressoes: 0, leads: 0, resultados: 0,
        anuncios: [],
      });
      const aNode = cNode.adsets.get(adset);
      aNode.valorBRL += r.valorBRL || 0;
      aNode.alcance = Math.max(aNode.alcance, r.alcance || 0);
      aNode.impressoes += r.impressoes || 0;
      aNode.leads += r.leads || 0;
      aNode.resultados += r.resultados || 0;
      aNode.anuncios.push({
        anuncio: r.anuncio || "(sem anuncio)",
        valorBRL: r.valorBRL || 0,
        alcance: r.alcance || 0,
        impressoes: r.impressoes || 0,
        leads: r.leads || 0,
        resultados: r.resultados || 0,
      });
    }
    // Converter pra arrays e ordenar
    const arr = Array.from(map.values()).sort((a, b) => b.valorBRL - a.valorBRL);
    arr.forEach(c => {
      c.adsetsArr = Array.from(c.adsets.values()).sort((a, b) => b.valorBRL - a.valorBRL);
    });
    return arr;
  }, [rowsFiltered]);

  const totalLeadsFiltered = rowsFiltered.reduce((s, r) => s + (r.leads || 0), 0);
  const totalAlcanceFiltered = rowsFiltered.reduce((s, r) => s + (r.alcance || 0), 0);
  const totalValorFiltered = rowsFiltered.reduce((s, r) => s + (r.valorBRL || 0), 0);
  const totalImpressoesFiltered = rowsFiltered.reduce((s, r) => s + (r.impressoes || 0), 0);

  // Max para escala das barras (escala global por categoria)
  const maxValor = Math.max(...tree.map(c => c.valorBRL), 1);

  // Estado: campanha expandida (default = primeira)
  const [expandedCamp, setExpandedCamp] = useState(() => tree[0]?.campanha || null);
  // Estado: adset expandido
  const [expandedAdset, setExpandedAdset] = useState(null);

  const expandedCampNode = tree.find(c => c.campanha === expandedCamp) || tree[0];
  const expandedAdsetNode = expandedCampNode
    ? expandedCampNode.adsetsArr.find(a => a.conjunto === expandedAdset) || expandedCampNode.adsetsArr[0]
    : null;

  return (
    <div className="page">
      <div className="page-title">
        <div>
          <h1>Hierarquia — Campanhas Facebook ADS</h1>
          <div className="status-line">
            {tree.length} campanhas ativas · {rowsFiltered.length} linhas detalhadas · ano {T && T.numCampanhas ? "" : ""}
          </div>
        </div>
        <div className="actions">
          <ExportButton />
        </div>
      </div>

      {/* Filtros decorativos */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="row" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          <div>
            <label style={{ fontSize: 11, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: 0.5 }}>Data inicio</label>
            <input type="date" className="filter-select" value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              style={{ width: "100%", marginTop: 4 }} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: 0.5 }}>Tipo Resultado</label>
            <select className="filter-select" value={tipoResultado}
              onChange={(e) => setTipoResultado(e.target.value)}
              style={{ width: "100%", marginTop: 4 }}>
              <option value="todos">Todos</option>
              <option value="leads">Leads</option>
              <option value="cliques">Cliques</option>
              <option value="alcance">Alcance</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: 0.5 }}>Campanhas</label>
            <select className="filter-select" value={campanhaFiltro}
              onChange={(e) => { setCampanhaFiltro(e.target.value); setExpandedCamp(null); setExpandedAdset(null); }}
              style={{ width: "100%", marginTop: 4 }}>
              <option value="todas">Todas</option>
              {campanhasUniq.map(c => <option key={c} value={c}>{c.length > 50 ? c.slice(0, 50) + "…" : c}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: 0.5 }}>Anuncio</label>
            <select className="filter-select" value={anuncioFiltro}
              onChange={(e) => setAnuncioFiltro(e.target.value)}
              style={{ width: "100%", marginTop: 4 }}>
              <option value="todos">Todos</option>
              {anunciosUniq.map(a => <option key={a} value={a}>{a.length > 40 ? a.slice(0, 40) + "…" : a}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* KPIs no topo */}
      <div className="kpi-row">
        <_MiniKpi4 tone="amber" label="Leads Totais" value={_fmtInt4(totalLeadsFiltered)} nonMonetary
          hint={`${rowsFiltered.length} linhas`} />
        <_MiniKpi4 tone="cyan" label="Alcance" value={_fmtInt4(totalAlcanceFiltered)} nonMonetary
          hint={`${_fmtInt4(totalImpressoesFiltered)} impressoes`} />
        <_MiniKpi4 tone="green" label="Valor Usado (BRL)" value={_fmtBR4(totalValorFiltered)}
          hint={`${tree.length} campanhas`} />
      </div>

      {/* Arvore hierarquica */}
      <div className="card">
        <h2 className="card-title">Arvore Hierarquica</h2>
        <div className="row" style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)", gap: 14 }}>
          {/* Coluna 1: Campanhas */}
          <div>
            <div style={{ fontSize: 11, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 }}>Campanha</div>
            {tree.map((c, i) => {
              const isActive = expandedCamp === c.campanha;
              const w = (c.valorBRL / maxValor) * 100;
              return (
                <div key={i}
                  onClick={() => { setExpandedCamp(c.campanha); setExpandedAdset(null); }}
                  className={"bar-row clickable" + (isActive ? " active" : "")}
                  style={{
                    cursor: "pointer", marginBottom: 6,
                    background: isActive ? "rgba(245,158,11,0.10)" : undefined,
                    borderRadius: 6, padding: "6px 8px",
                    border: isActive ? "1px solid rgba(245,158,11,0.35)" : "1px solid transparent",
                  }}>
                  <div className="row-meta">
                    <span className="label" title={c.campanha}>
                      {c.campanha.length > 24 ? c.campanha.slice(0, 24) + "…" : c.campanha}
                    </span>
                    <span className="val" style={{ color: "var(--amber)" }}>{c.adsetsArr.length}</span>
                  </div>
                  <div className="track">
                    <div className="fill" style={{ width: `${Math.max(w, 4)}%`, background: "var(--amber)" }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Coluna 2: Adsets da campanha selecionada */}
          <div>
            <div style={{ fontSize: 11, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 }}>Conjunto de Anuncios</div>
            {expandedCampNode && expandedCampNode.adsetsArr.length > 0 ? (
              expandedCampNode.adsetsArr.map((a, i) => {
                const localMax = Math.max(...expandedCampNode.adsetsArr.map(x => x.valorBRL), 1);
                const w = (a.valorBRL / localMax) * 100;
                const isActive = expandedAdset === a.conjunto || (expandedAdset == null && i === 0);
                return (
                  <div key={i}
                    onClick={() => setExpandedAdset(a.conjunto)}
                    className={"bar-row clickable" + (isActive ? " active" : "")}
                    style={{
                      cursor: "pointer", marginBottom: 6,
                      background: isActive ? "rgba(34,211,238,0.08)" : undefined,
                      borderRadius: 6, padding: "6px 8px",
                      border: isActive ? "1px solid rgba(34,211,238,0.35)" : "1px solid transparent",
                    }}>
                    <div className="row-meta">
                      <span className="label" title={a.conjunto}>
                        {a.conjunto.length > 26 ? a.conjunto.slice(0, 26) + "…" : a.conjunto}
                      </span>
                      <span className="val" style={{ color: "var(--cyan)" }}>{a.anuncios.length}</span>
                    </div>
                    <div className="track">
                      <div className="fill cyan" style={{ width: `${Math.max(w, 4)}%` }} />
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ color: "var(--fg-3)", fontSize: 12, padding: 8 }}>Selecione uma campanha</div>
            )}
          </div>

          {/* Coluna 3: Anuncios do adset selecionado */}
          <div>
            <div style={{ fontSize: 11, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 }}>Nome do Anuncio</div>
            {expandedAdsetNode && expandedAdsetNode.anuncios.length > 0 ? (
              expandedAdsetNode.anuncios.map((ad, i) => {
                const localMax = Math.max(...expandedAdsetNode.anuncios.map(x => x.valorBRL), 1);
                const w = (ad.valorBRL / localMax) * 100;
                return (
                  <div key={i} className="bar-row" style={{ marginBottom: 6, padding: "6px 8px" }}>
                    <div className="row-meta">
                      <span className="label" title={ad.anuncio}>
                        {ad.anuncio.length > 26 ? ad.anuncio.slice(0, 26) + "…" : ad.anuncio}
                      </span>
                      <span className="val">{_fmtInt4(ad.alcance)}</span>
                    </div>
                    <div className="track">
                      <div className="fill green" style={{ width: `${Math.max(w, 4)}%` }} />
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ color: "var(--fg-3)", fontSize: 12, padding: 8 }}>Selecione um conjunto</div>
            )}
          </div>

          {/* Coluna 4: Metricas (valor usado / alcance / impressoes) */}
          <div>
            <div style={{ fontSize: 11, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 }}>Metricas (Valor / Alcance / Impressoes)</div>
            {expandedAdsetNode && expandedAdsetNode.anuncios.length > 0 ? (
              expandedAdsetNode.anuncios.map((ad, i) => (
                <div key={i} className="bar-row" style={{ marginBottom: 6, padding: "6px 8px" }}>
                  <div className="row-meta" style={{ flexDirection: "column", alignItems: "flex-start", gap: 2 }}>
                    <span className="val" style={{ color: "var(--amber)" }}>R$ {_fmtBR4(ad.valorBRL)}</span>
                    <span style={{ color: "var(--cyan)", fontSize: 11 }}>{_fmtInt4(ad.alcance)} alc.</span>
                    <span style={{ color: "var(--green)", fontSize: 11 }}>{_fmtInt4(ad.impressoes)} impr.</span>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ color: "var(--fg-3)", fontSize: 12, padding: 8 }}>—</div>
            )}
          </div>
        </div>
      </div>

      {/* Tabela resumo de campanhas */}
      <div className="card">
        <div className="card-title-row">
          <h2 className="card-title">Resumo por Campanha</h2>
          <span className="status-line">{tree.length} campanhas</span>
        </div>
        <div className="t-scroll" style={{ maxHeight: 320 }}>
          <table className="t">
            <thead>
              <tr>
                <th>Campanha</th>
                <th className="num">Adsets</th>
                <th className="num">Anuncios</th>
                <th className="num">Alcance</th>
                <th className="num">Impressoes</th>
                <th className="num">Leads</th>
                <th className="num">Valor (BRL)</th>
              </tr>
            </thead>
            <tbody>
              {tree.map((c, i) => {
                const numAnuncios = c.adsetsArr.reduce((s, a) => s + a.anuncios.length, 0);
                return (
                  <tr key={i}
                    onClick={() => { setExpandedCamp(c.campanha); setExpandedAdset(null); }}
                    style={{ cursor: "pointer" }}
                    className={expandedCamp === c.campanha ? "active" : ""}>
                    <td title={c.campanha}>{c.campanha.length > 40 ? c.campanha.slice(0, 40) + "…" : c.campanha}</td>
                    <td className="num">{c.adsetsArr.length}</td>
                    <td className="num">{numAnuncios}</td>
                    <td className="num">{_fmtInt4(c.alcance)}</td>
                    <td className="num">{_fmtInt4(c.impressoes)}</td>
                    <td className="num cyan">{_fmtInt4(c.leads)}</td>
                    <td className="num amber">R$ {_fmtBR4(c.valorBRL)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// PageDetalhado — Acumulado por Familia + Acumulado por Cliente + Tabela qtd x faturado
// ============================================================
const PageDetalhado = ({ statusFilter, year, month, drilldown, setDrilldown }) => {
  const E = (typeof window !== "undefined" && window.BIT_RADKE_EXTRAS) || null;
  if (!E || !E.faturamento || !E.abc) {
    return (
      <div className="page">
        <div className="page-title"><div><h1>Detalhado</h1></div></div>
        <div className="card">
          <h2 className="card-title">Sem dados</h2>
          <p>Rode <code>node build-radke-extras.cjs</code>.</p>
        </div>
      </div>
    );
  }
  const F = E.faturamento;
  const A = E.abc;

  // Acumulado por familia (descendente)
  const familias = useMemo(() => F.porFamilia.slice(0, 14), [F.porFamilia]);
  const totalFamilias = familias.reduce((s, x) => s + x.value, 0);

  // Acumulado por cliente (top 14 do faturamento, descendente)
  const clientes = useMemo(() => F.porCliente.slice(0, 14), [F.porCliente]);
  const totalClientes = clientes.reduce((s, x) => s + x.value, 0);

  // Tabela qtd × faturado: top produtos da Curva ABC (classe A primeiro)
  // Colunas: Produto | Qtd | Valor unit. | Faturamento | Jan/Fev/.../Mes corrente | Total
  const monthsAbbr = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const refMonth = (typeof window !== "undefined" && window.REF_MONTH) || (new Date().getMonth() + 1);
  const monthsToShow = monthsAbbr.slice(0, Math.min(refMonth, 12));

  // Tentar montar mapa produto -> mes -> qtd a partir de F.detalhado (que vem agregado)
  // Fallback: distribuir uniformemente (skeleton) se nao houver dado mensal
  const produtos = useMemo(() => {
    return A.rows.slice(0, 30).map(p => {
      const totalQtd = p.qtdFaturada || 0;
      const totalValor = p.valorFaturado || 0;
      const valorUnit = totalQtd > 0 ? totalValor / totalQtd : 0;
      // Distribuicao mensal aproximada: como nao temos breakdown por mes/produto,
      // distribui proporcional aos meses disponiveis usando F.porMes como proxy.
      const totalMesAcum = F.porMes.reduce((s, m) => s + (m.valor || 0), 0) || 1;
      const meses = monthsAbbr.map((_, i) => {
        const fm = F.porMes[i];
        const ratio = (fm && fm.valor || 0) / totalMesAcum;
        return Math.round(totalQtd * ratio);
      }).slice(0, monthsToShow.length);
      return {
        descricao: p.descricao,
        codigo: p.codigo,
        familia: p.familia,
        abc: (p.abc || "").charAt(0).toUpperCase(),
        qtd: totalQtd,
        valorUnit,
        faturamento: totalValor,
        meses,
      };
    });
  }, [A.rows, F.porMes, monthsToShow.length]);

  return (
    <div className="page">
      <div className="page-title">
        <div>
          <h1>Detalhado — Familia x Cliente</h1>
          <div className="status-line">
            {familias.length} familias · {clientes.length} clientes · {produtos.length} produtos
          </div>
        </div>
        <div className="actions">
          <ExportButton />
        </div>
      </div>

      {/* KPIs */}
      <div className="kpi-row">
        <_MiniKpi4 tone="amber" label="Total Familias (top 14)" value={_fmtBR4(totalFamilias)}
          hint={`${familias.length} familias`} />
        <_MiniKpi4 tone="cyan" label="Total Clientes (top 14)" value={_fmtBR4(totalClientes)}
          hint={`${clientes.length} clientes`} />
        <_MiniKpi4 tone="green" label="Faturamento Total" value={_fmtBR4(F.totais.totalValor)}
          hint={`${F.totais.numItens} itens · ${F.totais.numNFs} NFs`} />
      </div>

      {/* Painel: 2 BarLists lado a lado */}
      <div className="row" style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)" }}>
        <div className="card">
          <h2 className="card-title">Valor Acumulado por Familia de Produto</h2>
          <BarList items={familias} color="amber" valueKey="value" labelKey="name" />
        </div>
        <div className="card">
          <h2 className="card-title">Valor Acumulado por Cliente</h2>
          <BarList items={clientes} color="amber" valueKey="value" labelKey="name" />
        </div>
      </div>

      {/* Painel inferior: tabela qtd x faturado por mes */}
      <div className="card">
        <div className="card-title-row">
          <h2 className="card-title">Quantidade Acumulada x Valor Faturado</h2>
          <span className="status-line">{produtos.length} produtos · meses ate {monthsToShow[monthsToShow.length - 1] || "—"}</span>
        </div>
        <div className="t-scroll" style={{ maxHeight: 480 }}>
          <table className="t">
            <thead>
              <tr>
                <th style={{ width: 28 }}>ABC</th>
                <th>Produto</th>
                <th>Familia</th>
                <th className="num">Qtd</th>
                <th className="num">Valor Unit.</th>
                <th className="num">Faturamento</th>
                {monthsToShow.map((m, i) => (
                  <th key={i} className="num">{m}</th>
                ))}
                <th className="num">Total</th>
              </tr>
            </thead>
            <tbody>
              {produtos.map((p, i) => {
                const totalMeses = p.meses.reduce((s, x) => s + x, 0);
                return (
                  <tr key={i}>
                    <td>
                      <span style={{
                        color: p.abc === "A" ? "var(--green)" : p.abc === "B" ? "var(--cyan)" : "var(--red)",
                        fontWeight: 700,
                      }}>{p.abc}</span>
                    </td>
                    <td title={p.descricao}>{p.descricao.length > 40 ? p.descricao.slice(0, 40) + "…" : p.descricao}</td>
                    <td style={{ color: "var(--fg-3)", fontSize: 12 }}>{p.familia || "—"}</td>
                    <td className="num">{_fmtInt4(p.qtd)}</td>
                    <td className="num">R$ {_fmtBR4(p.valorUnit)}</td>
                    <td className="num green">R$ {_fmtBR4(p.faturamento)}</td>
                    {p.meses.map((q, mi) => (
                      <td key={mi} className="num">{_fmtInt4(q)}</td>
                    ))}
                    <td className="num green">{_fmtInt4(totalMeses)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// PageProfundaCliente — Ranking detalhado de clientes (Conta x Valor venda)
// ============================================================
const PageProfundaCliente = ({ statusFilter, year, month, drilldown, setDrilldown }) => {
  const ALL_TX = (typeof window !== "undefined" && window.ALL_TX) || [];
  const REF_YEAR = (typeof window !== "undefined" && window.REF_YEAR) || new Date().getFullYear();

  // Filtros locais
  const [clienteFiltro, setClienteFiltro] = useState("todos");
  const [mesIni, setMesIni] = useState(0); // 0 = janeiro do ano selecionado
  const [mesFim, setMesFim] = useState(11); // 11 = dezembro

  // Lista de clientes do ano filtrada
  const clientesAgg = useMemo(() => {
    const map = new Map();
    const yearTarget = year || REF_YEAR;
    for (const row of ALL_TX) {
      const [kind, mes, dia, categoria, cliente, valor, realizado] = row;
      if (kind !== "r") continue; // somente receita
      if (!cliente) continue;
      if (!mes) continue;
      const yr = parseInt(mes.slice(0, 4), 10);
      if (yr !== yearTarget) continue;
      const mIdx = parseInt(mes.slice(5, 7), 10) - 1;
      if (mIdx < mesIni || mIdx > mesFim) continue;
      // Aplicar statusFilter (mesma logica de filterTx)
      if (statusFilter === "realizado" && realizado !== 1) continue;
      if (statusFilter === "a_pagar_receber" && realizado !== 0) continue;
      // Aplicar filtro de cliente
      if (clienteFiltro !== "todos" && cliente !== clienteFiltro) continue;

      map.set(cliente, (map.get(cliente) || 0) + valor);
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [ALL_TX, year, mesIni, mesFim, statusFilter, clienteFiltro, REF_YEAR]);

  const totalGeral = clientesAgg.reduce((s, x) => s + x.value, 0);

  // Lista unica de clientes pra dropdown (todos os anos)
  const clientesUniq = useMemo(() => {
    const s = new Set();
    for (const row of ALL_TX) {
      if (row[0] === "r" && row[4]) s.add(row[4]);
    }
    return Array.from(s).sort();
  }, [ALL_TX]);

  return (
    <div className="page">
      <div className="page-title">
        <div>
          <h1>Profunda Cliente — Ranking</h1>
          <div className="status-line">
            {clientesAgg.length} clientes · {year || REF_YEAR} · meses {mesIni + 1}-{mesFim + 1}
          </div>
        </div>
        <div className="actions">
          <ExportButton />
        </div>
      </div>

      {/* Filtros */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="row" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
          <div>
            <label style={{ fontSize: 11, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: 0.5 }}>Cliente</label>
            <select className="filter-select" value={clienteFiltro}
              onChange={(e) => setClienteFiltro(e.target.value)}
              style={{ width: "100%", marginTop: 4 }}>
              <option value="todos">Todos</option>
              {clientesUniq.map(c => <option key={c} value={c}>{c.length > 50 ? c.slice(0, 50) + "…" : c}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: 0.5 }}>Mes inicial</label>
            <select className="filter-select" value={mesIni}
              onChange={(e) => setMesIni(parseInt(e.target.value, 10))}
              style={{ width: "100%", marginTop: 4 }}>
              {["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"].map((m, i) => (
                <option key={i} value={i}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: 0.5 }}>Mes final</label>
            <select className="filter-select" value={mesFim}
              onChange={(e) => setMesFim(parseInt(e.target.value, 10))}
              style={{ width: "100%", marginTop: 4 }}>
              {["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"].map((m, i) => (
                <option key={i} value={i}>{m}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* KPI total */}
      <div className="kpi-row">
        <_MiniKpi4 tone="amber" label="Total geral" value={_fmtBR4(totalGeral)}
          hint={`${clientesAgg.length} clientes`} />
        <_MiniKpi4 tone="cyan" label="Ticket medio" value={_fmtBR4(clientesAgg.length > 0 ? totalGeral / clientesAgg.length : 0)}
          hint="por cliente" />
        <_MiniKpi4 tone="green" label="Top 1" value={_fmtBR4(clientesAgg[0]?.value || 0)}
          hint={clientesAgg[0]?.name ? (clientesAgg[0].name.length > 30 ? clientesAgg[0].name.slice(0, 30) + "…" : clientesAgg[0].name) : "—"} />
      </div>

      {/* Tabela ranking */}
      <div className="card">
        <div className="card-title-row">
          <h2 className="card-title">Ranking de Clientes</h2>
          <span className="status-line">Total: <b style={{ color: "var(--amber)" }}>R$ {_fmtBR4(totalGeral)}</b></span>
        </div>
        <div className="t-scroll" style={{ maxHeight: 560 }}>
          <table className="t">
            <thead>
              <tr>
                <th style={{ width: 50 }}>#</th>
                <th>Conta</th>
                <th className="num">Valor venda</th>
                <th className="num" style={{ width: 80 }}>%</th>
              </tr>
            </thead>
            <tbody>
              {clientesAgg.length === 0 ? (
                <tr><td colSpan="4" style={{ textAlign: "center", color: "var(--fg-3)", padding: 24 }}>Nenhum cliente no periodo.</td></tr>
              ) : (
                clientesAgg.map((c, i) => {
                  const pct = totalGeral > 0 ? (c.value / totalGeral) * 100 : 0;
                  return (
                    <tr key={i}>
                      <td style={{ color: "var(--fg-3)" }}>{i + 1}</td>
                      <td title={c.name}>{c.name.length > 70 ? c.name.slice(0, 70) + "…" : c.name}</td>
                      <td className="num amber">R$ {_fmtBR4(c.value)}</td>
                      <td className="num" style={{ color: "var(--fg-3)" }}>{pct.toFixed(2).replace(".", ",")}%</td>
                    </tr>
                  );
                })
              )}
              {clientesAgg.length > 0 && (
                <tr style={{ background: "rgba(245,158,11,0.06)", fontWeight: 700 }}>
                  <td colSpan="2" style={{ textAlign: "right" }}>Total</td>
                  <td className="num amber">R$ {_fmtBR4(totalGeral)}</td>
                  <td className="num">100,00%</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// PageCRM — Skeleton (RD Station nao integrado)
// ============================================================
const PageCRM = ({ statusFilter, year, month, drilldown, setDrilldown }) => {
  const E = (typeof window !== "undefined" && window.BIT_RADKE_EXTRAS) || null;
  const C = E && E.crm;
  const hasData = C && Array.isArray(C.rows) && C.rows.length > 0;

  // Quando integrado: KPIs reais; quando skeleton: placeholders
  const totalLeads = hasData ? C.totalLeads || 0 : null;
  const totalConvertidos = hasData ? C.totalConvertidos || 0 : null;
  const taxaConv = hasData && totalLeads > 0 ? (totalConvertidos / totalLeads) * 100 : null;
  const totalReceita = hasData ? C.totalReceita || 0 : null;
  const totalVendido = hasData ? C.totalVendido || 0 : null;

  return (
    <div className="page">
      <div className="page-title">
        <div>
          <h1>CRM — RD Station</h1>
          <div className="status-line">
            {hasData ? `${C.rows.length} leads` : "Pendente integracao com RD Station"}
          </div>
        </div>
        <div className="actions">
          <ExportButton />
        </div>
      </div>

      {/* KPIs */}
      <div className="kpi-row">
        <_MiniKpi4 tone="cyan" label="Leads"
          value={hasData ? _fmtInt4(totalLeads) : "—"} nonMonetary
          hint={hasData ? "do periodo" : "Pendente"} />
        <_MiniKpi4 tone="green" label="Conversao"
          value={hasData ? (taxaConv != null ? taxaConv.toFixed(1).replace(".", ",") : "0") : "—"}
          nonMonetary
          hint={hasData ? `${_fmtInt4(totalConvertidos)} convertidos` : "Pendente"} />
        <_MiniKpi4 tone="amber" label="Receita"
          value={hasData ? _fmtBR4(totalReceita) : "—"}
          hint={hasData ? "fechada" : "Pendente"} />
        <_MiniKpi4 tone="amber" label="Valor Vendido"
          value={hasData ? _fmtBR4(totalVendido) : "—"}
          hint={hasData ? "no periodo" : "Pendente"} />
      </div>

      {/* Mensagem destacada no centro (skeleton) */}
      {!hasData && (
        <div className="card" style={{
          background: "linear-gradient(135deg, rgba(34,211,238,0.08), rgba(34,211,238,0.02))",
          borderColor: "rgba(34,211,238,0.25)",
          padding: "32px 28px",
          textAlign: "center",
          maxWidth: 720,
          margin: "20px auto",
        }}>
          <div style={{ fontSize: 13, color: "var(--cyan-2)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>
            Integracao Pendente
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "var(--fg-1)", marginBottom: 12 }}>
            Fonte de dados: RD Station
          </div>
          <p style={{ color: "var(--fg-2)", fontSize: 13, lineHeight: 1.6, marginBottom: 16 }}>
            Os dados de funil, conversao e projecao do CRM dependem de exportacao do RD Station.
            Para ativar essa tela, exporte o pipeline do RD Station como XLSX e adicione{" "}
            <code style={{ background: "rgba(0,0,0,0.4)", padding: "2px 6px", borderRadius: 4, color: "var(--cyan)" }}>crm.xlsx</code>{" "}
            na pasta <code style={{ background: "rgba(0,0,0,0.4)", padding: "2px 6px", borderRadius: 4, color: "var(--cyan)" }}>data/</code>.
          </p>
          <p style={{ color: "var(--fg-2)", fontSize: 13, lineHeight: 1.6, marginBottom: 0 }}>
            Depois rode <code style={{ background: "rgba(0,0,0,0.4)", padding: "2px 6px", borderRadius: 4, color: "var(--cyan)" }}>node build-radke-extras.cjs</code>{" "}
            para regenerar os dados.
          </p>
        </div>
      )}

      {/* Quando tem dado: funil + projecao por produto (basic) */}
      {hasData && (
        <>
          <div className="row" style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)" }}>
            <div className="card">
              <h2 className="card-title">Funil de Conversao</h2>
              {C.funil && C.funil.length > 0 ? (
                <BarList items={C.funil} color="cyan" valueKey="value" labelKey="name" />
              ) : (
                <p style={{ color: "var(--fg-3)" }}>Sem dados de funil.</p>
              )}
            </div>
            <div className="card">
              <h2 className="card-title">Projecao por Produto</h2>
              {C.projecaoProduto && C.projecaoProduto.length > 0 ? (
                <BarList items={C.projecaoProduto} color="amber" valueKey="value" labelKey="name" />
              ) : (
                <p style={{ color: "var(--fg-3)" }}>Sem dados de projecao.</p>
              )}
            </div>
          </div>

          {C.quadrantes && C.quadrantes.length > 0 && (
            <div className="card">
              <h2 className="card-title">Quadrantes</h2>
              <BarList items={C.quadrantes} color="green" valueKey="value" labelKey="name" />
            </div>
          )}
        </>
      )}

      <div className="status-line" style={{ marginTop: 12, fontSize: 11, color: "var(--fg-3)" }}>
        Notas: (1) Dados vem de export XLSX do RD Station. (2) Quando <code>crm.xlsx</code> existir em <code>data/</code>, esta tela renderiza KPIs/funil/quadrantes automaticamente.
      </div>
    </div>
  );
};

Object.assign(window, { PageHierarquia, PageDetalhado, PageProfundaCliente, PageCRM });
