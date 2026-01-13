import React from 'react';
import { useStore } from '../state/Store.jsx';

export default function Historico() {
  const { state } = useStore();
  const role = state.user?.role || 'guest';

  const [showFilters, setShowFilters] = React.useState(false);
  const [q, setQ] = React.useState('');
  const [status, setStatus] = React.useState('all');
  const [sortBy, setSortBy] = React.useState('end'); // end | value
  const [sortDir, setSortDir] = React.useState('desc'); // asc|desc
  const [dFrom, setDFrom] = React.useState('');
  const [dTo, setDTo] = React.useState('');

  const parsed = (state.history || []).filter(h => (h.kind === 'recarga' || h.kind === 'sessao'));
  const filtered = parsed.filter(h => {
    const text = `${h.stationName||''} ${h.vehicleName||''} ${h.status||''}`.toLowerCase();
    const okText = !q || text.includes(q.toLowerCase());
    const okStatus = status === 'all' || (h.status || 'finalizada') === status;
    const ts = new Date(h.endAt || h.data || h.startAt || 0).getTime();
    let okFrom = true, okTo = true;
    if (dFrom) okFrom = ts >= new Date(`${dFrom}T00:00:00`).getTime();
    if (dTo) okTo = ts <= new Date(`${dTo}T23:59:59`).getTime();
    return okText && okStatus && okFrom && okTo;
  });

  const rows = filtered.sort((a,b)=>{
    if (sortBy === 'value') {
      const va = Number(a.total||0), vb = Number(b.total||0);
      return sortDir === 'asc' ? va - vb : vb - va;
    }
    const ta = new Date(a.endAt || a.data || 0).getTime();
    const tb = new Date(b.endAt || b.data || 0).getTime();
    return sortDir === 'asc' ? ta - tb : tb - ta;
  });

  const metrics = React.useMemo(() => {
    const count = rows.length;
    const total = rows.reduce((s, r) => s + Number(r.total || 0), 0);
    const kwh = rows.reduce((s, r) => s + Number(r.kwh || 0), 0);
    return { count, total, kwh };
  }, [rows]);

  const isConsumerView = role === 'driver' || role === 'admin';
  const isSellerView = role === 'host' || role === 'admin';

  // view mode to colorize chart: consumo (azul) or venda (verde)
  const [viewMode, setViewMode] = React.useState(() => (role === 'host' ? 'venda' : 'consumo'));
  const barColor = viewMode === 'venda' ? '#00C389' : '#0A74FF';

  // monthly chart (last 12 months)
  const [chartMetric, setChartMetric] = React.useState('value'); // value | kwh
  const monthly = React.useMemo(() => {
    // map 'YYYY-MM' -> { value, kwh }
    const acc = new Map();
    for (const r of rows) {
      const d = new Date(r.endAt || r.data || r.startAt || Date.now());
      if (isNaN(d.getTime())) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      const prev = acc.get(key) || { value: 0, kwh: 0 };
      prev.value += Number(r.total || 0);
      prev.kwh += Number(r.kwh || 0);
      acc.set(key, prev);
    }
    // last 12 months timeline
    const now = new Date();
    const out = [];
    for (let i = 11; i >= 0; i--) {
      const dt = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}`;
      const label = dt.toLocaleString('pt-BR', { month: 'short' }).replace('.','');
      const m = acc.get(key) || { value: 0, kwh: 0 };
      out.push({ key, label, ...m });
    }
    return out;
  }, [rows]);
  const maxY = Math.max(1, ...monthly.map(m => chartMetric==='value' ? m.value : m.kwh));

  return (
    <section>
      <h1 className="h4 mb-3"><i className="bi bi-clock-history"></i> Histórico de recargas</h1>

      <div className="card mb-3">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center">
            <div className="small text-muted">
              {isConsumerView ? (
                <span className="me-3">Consumo: <b>{metrics.kwh.toFixed(2)} kWh</b> • <b>R$ {metrics.total.toFixed(2).replace('.', ',')}</b></span>
              ) : null}
              {isSellerView ? (
                <span>Vendas: <b>{metrics.kwh.toFixed(2)} kWh</b> • <b>R$ {metrics.total.toFixed(2).replace('.', ',')}</b></span>
              ) : null}
              <span className="ms-3">Registros: <b>{metrics.count}</b></span>
            </div>
            <button className="btn btn-outline-secondary btn-sm" onClick={()=>setShowFilters(v=>!v)}>
              <i className="bi bi-sliders"></i> Filtros
            </button>
          </div>
          {showFilters ? (
            <div className="row g-2 mt-2">
              <div className="col-md-4">
                <input className="form-control" placeholder="Buscar por estação/veículo/status" value={q} onChange={(e)=>setQ(e.target.value)} />
              </div>
              <div className="col-md-2">
                <select className="form-select" value={status} onChange={(e)=>setStatus(e.target.value)}>
                  <option value="all">Todos status</option>
                  <option value="finalizada">finalizada</option>
                  <option value="cancelada">cancelada</option>
                </select>
              </div>
              <div className="col-md-2">
                <input type="date" className="form-control" value={dFrom} onChange={(e)=>setDFrom(e.target.value)} />
              </div>
              <div className="col-md-2">
                <input type="date" className="form-control" value={dTo} onChange={(e)=>setDTo(e.target.value)} />
              </div>
              <div className="col-md-2">
                <div className="input-group">
                  <select className="form-select" value={sortBy} onChange={(e)=>setSortBy(e.target.value)}>
                    <option value="end">Ordenar por data</option>
                    <option value="value">Ordenar por valor</option>
                  </select>
                  <button className="btn btn-outline-secondary" type="button" onClick={()=>setSortDir(d=> d==='asc'?'desc':'asc')} title="Alternar ordem">
                    <i className={`bi ${sortDir==='asc'?'bi-sort-down-alt':'bi-sort-down'}`}></i>
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="card mb-3">
        <div className="card-header bg-light d-flex justify-content-between align-items-center">
          <div><i className="bi bi-bar-chart"></i> {chartMetric==='value' ? 'Valor por mês' : 'kWh por mês'} (últimos 12 meses)</div>
          <div className="d-flex align-items-center gap-2">
            {(role === 'admin') ? (
              <div className="btn-group btn-group-sm" role="group" aria-label="view-mode">
                <button className={`btn btn-outline-secondary ${viewMode==='consumo'?'active':''}`} onClick={()=>setViewMode('consumo')}>Consumo</button>
                <button className={`btn btn-outline-secondary ${viewMode==='venda'?'active':''}`} onClick={()=>setViewMode('venda')}>Venda</button>
              </div>
            ) : null}
            {(role === 'host') ? null : null}
            <div className="btn-group btn-group-sm">
            <button className={`btn btn-outline-secondary ${chartMetric==='value'?'active':''}`} onClick={()=>setChartMetric('value')}>R$</button>
            <button className={`btn btn-outline-secondary ${chartMetric==='kwh'?'active':''}`} onClick={()=>setChartMetric('kwh')}>kWh</button>
            </div>
          </div>
        </div>
        <div className="card-body">
          <div className="overflow-auto">
            <svg viewBox="0 0 1000 220" style={{minWidth:'600px', width:'100%', height:'220px'}}>
              {/* axes */}
              <line x1="40" y1="10" x2="40" y2="190" stroke="#ccc" />
              <line x1="40" y1="190" x2="980" y2="190" stroke="#ccc" />
              {monthly.map((m, idx) => {
                const x0 = 40 + idx * ((940) / monthly.length);
                const bw = (940) / monthly.length * 0.7;
                const val = chartMetric==='value' ? m.value : m.kwh;
                const h = maxY > 0 ? Math.round((val / maxY) * 160) : 0;
                const x = x0 + (((940)/monthly.length) - bw)/2;
                const y = 190 - h;
                return (
                  <g key={m.key}>
                    <rect x={x} y={y} width={bw} height={h} fill={barColor} opacity="0.85" />
                    <text x={x + bw/2} y={205} textAnchor="middle" fontSize="12">{m.label}</text>
                    {h > 0 ? (
                      <text x={x + bw/2} y={y - 4} textAnchor="middle" fontSize="11" fill="#555">
                        {chartMetric==='value' ? `R$ ${m.value.toFixed(0)}` : `${m.kwh.toFixed(0)} kWh`}
                      </text>
                    ) : null}
                  </g>
                );
              })}
              {/* max label */}
              <text x="0" y="20" fontSize="10" fill="#999">{chartMetric==='value' ? `máx: R$ ${maxY.toFixed(2)}` : `máx: ${maxY.toFixed(2)} kWh`}</text>
            </svg>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="table-responsive">
          <table className="table mb-0">
            <thead className="table-light">
              <tr>
                <th>#</th>
                <th>Estação</th>
                <th>Veículo</th>
                <th>Início</th>
                <th>Fim</th>
                <th>Status</th>
                <th className="text-end">Total (R$)</th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? rows.map((h) => (
                <tr key={h.id}>
                  <td>{h.chargeId ? `#${h.chargeId}` : '-'}</td>
                  <td className="fw-semibold">{h.stationName || '-'}</td>
                  <td>{h.vehicleName || '-'}</td>
                  <td>{h.startAt ? new Date(h.startAt).toLocaleString() : '-'}</td>
                  <td>{h.endAt ? new Date(h.endAt).toLocaleString() : '-'}</td>
                  <td>{h.status || 'finalizada'}</td>
                  <td className="text-end">R$ {(Number(h.total||0)).toFixed(2).replace('.', ',')}</td>
                </tr>
              )) : (
                <tr><td colSpan={7}><div className="p-3 small text-muted">Sem recargas registradas.</div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

