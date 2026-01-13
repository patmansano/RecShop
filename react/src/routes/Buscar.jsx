import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../state/Store.jsx';
import MapStations from '../components/MapStations.jsx';
import { api } from '../services/api.js';

export default function Buscar() {
  const { state, actions } = useStore();
  const navigate = useNavigate();
  const [q, setQ] = React.useState('');
  const [tipo, setTipo] = React.useState('Todos os tipos');
  const [showFilters, setShowFilters] = React.useState(false);
  const [tipoOptions, setTipoOptions] = React.useState(['Todos os tipos']);
  const [selectedId, setSelectedId] = React.useState(null);
  const [visibleIds, setVisibleIds] = React.useState(null);

  React.useEffect(() => {
    // carregar apenas uma vez na montagem para evitar loops de render
    actions.loadStations();
    (async () => {
      try{
        const all = await api.getStations();
        const set = new Set();
        for (const s of (all||[])) {
          const t = s.connectorType || s.tipo;
          if (t) set.add(String(t));
        }
        const opts = ['Todos os tipos', ...Array.from(set)];
        setTipoOptions(opts);
      }catch(_e){}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onBuscar() {
    await actions.searchStations({ q, tipo });
  }

  function City({ s }) {
    const city = s.cidade || (s.endereco ? String(s.endereco).split(',')[0] : '');
    return <div className="small text-muted">{city || '-'}</div>;
  }

  return (
    <section>
      {/* Title pill + Map */}
      <div className="mb-3">
        <span className="pill-bar"><span className="pill-dot"></span> Estação de Recarga RECSHOP</span>
      </div>
      <div className="card mb-3">
        <div className="card-body map-card">
          <MapStations stations={state.stations || []} onSelect={setSelectedId} onVisibleChange={setVisibleIds} />
        </div>
      </div>

      {/* Barra de busca + filtros */}
      <div className="d-flex justify-content-between align-items-center mb-2">
        <button className="btn btn-outline-secondary" onClick={()=>setShowFilters(v=>!v)}>
          <i className="bi bi-sliders"></i> Filtros
          <i className={`bi ms-1 ${showFilters ? 'bi-chevron-up' : 'bi-chevron-down'}`}></i>
        </button>
      </div>
      {showFilters ? <div className="card mb-3">
        <div className="card-body">
          <div className="row g-2">
            <div className="col-md-6">
              <input
                className="form-control"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Pesquisar por cidade, bairro ou estação"
              />
            </div>
            <div className="col-md-3">
              <select className="form-select" value={tipo} onChange={(e) => setTipo(e.target.value)}>
                {tipoOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div className="col-md-3">
              <button className="btn btn-rec w-100" onClick={onBuscar}>
                <i className="bi bi-search"></i> Buscar
              </button>
            </div>
          </div>
        </div>
      </div> : null}

      {/* Resultados */}
      {state.stations?.length ? (
        <div className="row g-3">
          {(visibleIds && visibleIds.length ? state.stations.filter(s=>visibleIds.includes(s.id)) : state.stations).map((s) => {
            const tipoCon = s.connectorType || s.tipo || '-';
            const pot = s.potenciaKw != null ? `${s.potenciaKw} kW` : '';
            const conLabel = pot ? `${tipoCon} • ${pot}` : tipoCon;
            const preco = s.precoKwh != null ? `R$ ${Number(s.precoKwh).toFixed(2).replace('.', ',')}/kWh` : '-';
            const horarios = s.horarioDias || '—';
            const disponiveis = Number(s.qtdDisponivel || 0);
            const total = Number(s.qtdTotal || 0);
            const isSelected = selectedId === s.id;
            return (
              <div key={s.id} className="col-md-4">
                <div className={`card h-100 ${isSelected ? 'card-selected' : ''}`}>
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <h5 className="card-title mb-1">{s.nome}</h5>
                        <City s={s} />
                      </div>
                      <span className="badge text-bg-success" style={{minWidth:64, textAlign:'center'}}>
                        {s.disponivel ? 'Aberto' : 'Fechado'}
                      </span>
                    </div>

                    <div className="mt-2">
                      <span className="badge text-bg-light me-2">{conLabel}</span>
                      <span className="fw-semibold">{preco}</span>
                    </div>

                    <div className="mt-2 small">
                      <div className="mb-1">
                        <i className="bi bi-clock"></i> Horário: <span className="fw-semibold">{horarios.split('•')[0]?.trim() || horarios}</span>
                      </div>
                      <div>
                        <i className="bi bi-calendar3"></i> Dias: {horarios.includes('•') ? horarios.split('•')[1]?.trim() : horarios}
                      </div>
                    </div>

                    <div className="mt-2">
                      <span className="badge text-bg-light">Conectores disponíveis: {disponiveis}{total ? `/${total}` : ''}</span>
                    </div>
                  </div>
                  <div className="card-footer bg-light d-flex gap-2">
                    <button className={`btn ${isSelected ? 'btn-primary' : 'btn-outline-primary'}`} onClick={()=>{ actions.setSessionDraft(s, { schedule: true }); navigate('/sessao'); }}>
                      <i className="bi bi-bookmark-plus"></i> Reservar
                    </button>
                    <button
                      className={`btn btn-rec ${isSelected ? 'shadow-lg' : ''}`}
                      disabled={!s.disponivel || Number(s.qtdDisponivel||0) <= 0}
                      onClick={()=>{ actions.setSessionDraft(s); navigate('/sessao'); }}
                    >
                      <i className="bi bi-play-circle"></i> Iniciar aqui
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="small text-muted">Sem resultados.</div>
      )}


    </section>
  );
}

