import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../state/Store.jsx';

export default function Sessao() {
  const navigate = useNavigate();
  const { state, actions } = useStore();
  const [stationId, setStationId] = React.useState('');
  const [vehicleId, setVehicleId] = React.useState('');
  const [chargePct, setChargePct] = React.useState('0');
  const [mode, setMode] = React.useState('Parcial');
  const [targetPct, setTargetPct] = React.useState('80');
  const [nowTs, setNowTs] = React.useState(Date.now());
  const [creating, setCreating] = React.useState(false);
  const scheduleMode = Boolean(state.sessionDraft?.schedule);
  const [schedDate, setSchedDate] = React.useState('');
  const [schedTime, setSchedTime] = React.useState('');
  const [schedConnector, setSchedConnector] = React.useState('');
  const [openRunning, setOpenRunning] = React.useState(false);
  const [openScheduled, setOpenScheduled] = React.useState(false);

  React.useEffect(() => {
    // Prefill somente quando vier da Busca (sessionDraft presente)
    if (state.sessionDraft?.stationId) {
      setStationId(state.sessionDraft.stationId);
    }
    // define veículo padrão se existir
    if (state.vehicles?.length) {
      setVehicleId(state.vehicles[0].id);
    }
    // default scheduling: hoje e próxima hora
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    setSchedDate(`${yyyy}-${mm}-${dd}`);
    const hh = String(now.getHours() + 1).padStart(2, '0');
    setSchedTime(`${hh}:00`);
  }, [state.sessionDraft, state.vehicles]);

  const currentPctNum = Math.min(100, Math.max(0, Number(chargePct || 0)));
  const maxPartial = Math.max(1, 100 - currentPctNum);
  const isComplete = mode === 'Completa';

  function onModeChange(value) {
    setMode(value);
    if (value === 'Completa') {
      setTargetPct('100');
    } else {
      // parcial: limite entre 1 e (100 - carga atual)
      const clamped = Math.max(1, Math.min(maxPartial, Number(targetPct || 1)));
      setTargetPct(String(clamped));
    }
  }

  function onChargeChange(val) {
    setChargePct(val);
    if (mode === 'Parcial') {
      // ao mudar a carga atual, recalcular o limite da parcial
      const cur = Math.min(100, Math.max(0, Number(val || 0)));
      const available = Math.max(1, 100 - cur);
      const clamped = Math.max(1, Math.min(available, Number(targetPct || 1)));
      setTargetPct(String(clamped));
    }
  }

  React.useEffect(() => {
    const id = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  function formatHMS(ms) {
    const sec = Math.max(0, Math.floor(ms / 1000));
    const h = String(Math.floor(sec / 3600)).padStart(2, '0');
    const m = String(Math.floor((sec % 3600) / 60)).padStart(2, '0');
    const s = String(sec % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
  }

  // Estimativa de energia/custo da recarga baseada na capacidade da bateria e preço da estação
  const selectedStation = (state.stations || []).find(s => s.id === stationId);
  const selectedVehicle = (state.vehicles || []).find(v => v.id === vehicleId);
  const runningVehicleIds = new Set((state.runningSessions || []).filter(s => s.userId === state.user?.id && s.status === 'running').map(s => s.vehicleId).filter(Boolean));
  const deltaPercent = isComplete ? Math.max(0, 100 - currentPctNum) : Math.max(0, Number(targetPct || 0));
  const estimatedKwh = selectedVehicle ? (Number(selectedVehicle.bateriaKwh || 0) * deltaPercent / 100) : 0;
  const estimatedCost = (Number(selectedStation?.precoKwh || 0) * estimatedKwh);
  const powerKw = Number(selectedStation?.potenciaKw || 0);
  const estimatedMinutes = powerKw > 0 ? Math.max(5, Math.round((estimatedKwh / powerKw) * 60)) : 0;
  function fmtMinutes(min) {
    if (!min || min <= 0) return '-';
    const h = Math.floor(min / 60);
    const m = min % 60;
    if (h <= 0) return `${m} min`;
    if (m === 0) return `${h} h`;
    return `${h} h ${m} min`;
  }

  // Agendamento: conectores disponíveis atuais (exclui os ocupados)
  const occupied = new Set((state.runningSessions || []).filter(s => s.stationId === stationId).map(s => s.connector));
  const totalConn = Number(selectedStation?.qtdTotal || 0);
  const availableConnectors = Array.from({ length: totalConn }, (_, i) => i + 1).filter(n => !occupied.has(n));
  // Restrições de funcionamento
  function parseOperating() {
    const txt = selectedStation?.horarioDias || '';
    // exemplo: "08:00-22:00 • Seg/Ter/Qua/Qui/Sex"
    const [hours, days] = txt.split('•').map(s => (s || '').trim());
    const [open, close] = (hours || '').split('-').map(s => (s || '').trim());
    const map = { 'Dom':0,'Seg':1,'Ter':2,'Qua':3,'Qui':4,'Sex':5,'Sáb':6,'Sab':6 };
    const allowed = new Set();
    if (days) {
      days.split('/').forEach(d => { const k=d.trim(); if (map[k]!==undefined) allowed.add(map[k]); });
    }
    return { open: open || '00:00', close: close || '23:59', allowed };
  }
  const operating = parseOperating();
  function openTime(){ return operating.open; }
  function closeTime(){ return operating.close; }
  function operatingText(){
    const days = Array.from(operating.allowed).sort().map(n=>['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][n]).join('/');
    return days ? `Dias: ${days}` : 'Dias: todos';
  }
  function isDateAllowed(d){
    if (!d || isNaN(d.getTime())) return true;
    if (!operating.allowed || operating.allowed.size===0) return true;
    return operating.allowed.has(d.getDay());
  }
  function isTimeAllowed(t){
    if (!t) return true;
    return t >= operating.open && t <= operating.close;
  }

  function scheduleReservation() {
    const station = state.stations?.find(s => s.id === stationId);
    if (!station) { alert('Selecione a estação.'); return; }
    if (!schedDate || !schedTime) { alert('Informe data e horário.'); return; }
    // valida funcionamento
    const d = new Date(`${schedDate}T00:00:00`);
    if (!isDateAllowed(d)) { alert('Data fora do funcionamento da estação.'); return; }
    if (!isTimeAllowed(schedTime)) { alert('Horário fora do funcionamento da estação.'); return; }
    const whenIso = new Date(`${schedDate}T${schedTime}:00`).toISOString();
    const vehicle = (state.vehicles || []).find(v => v.id === vehicleId);
    actions.reserveStation(station, {
      when: whenIso,
      connector: schedConnector || null,
      kwh: estimatedKwh,
      estimatedMinutes,
      mode,
      targetPct,
      chargePct,
      vehicleId,
      vehicleName: vehicle ? `${vehicle.nome}${vehicle.placa ? ' • ' + vehicle.placa : ''}` : null
    }).then?.(() => {});
    alert('Agendamento criado.');
    actions.setSessionDraft(null);
  }

  function confirm() {
    const station = state.stations?.find(s => s.id === stationId);
    if (!station) { alert('Selecione a estação.'); return; }
    if (Number(station.qtdDisponivel || 0) <= 0) { alert('Estação indisponível.'); return; }
    if (runningVehicleIds.has(vehicleId)) { alert('Este veículo está com sessão em andamento e está indisponível para nova recarga.'); return; }
    if (currentPctNum >= 100) { alert('A carga atual do veículo é 100%. Não é possível iniciar uma recarga.'); return; }
    const vehicle = (state.vehicles || []).find(v => v.id === vehicleId);
    const saldo = Number(state.wallet?.saldo || 0);
    const total = estimatedCost;
    const walletUsaria = Math.min(saldo, total);
    const cartaoRestante = Math.max(0, total - walletUsaria);
    const payWithWallet = window.confirm(
      `Energia estimada: ${estimatedKwh.toFixed(2)} kWh\n` +
      `Tempo estimado: ${fmtMinutes(estimatedMinutes)}\n` +
      `Valor estimado: R$ ${total.toFixed(2).replace('.', ',')}\n` +
      `Seu saldo (cashback): R$ ${saldo.toFixed(2).replace('.', ',')}\n\n` +
      `OK: Usar saldo até R$ ${walletUsaria.toFixed(2).replace('.', ',')} e pagar o restante no cartão (R$ ${cartaoRestante.toFixed(2).replace('.', ',')}).\n` +
      `Cancelar: Pagar tudo no cartão.`
    );
    setCreating(true);
    actions.startSession(station, {
      mode,
      targetPct,
      chargePct,
      payWithWallet,
      kwh: estimatedKwh,
      estimatedMinutes,
      vehicleId,
      vehicleName: vehicle ? `${vehicle.nome}${vehicle.placa ? ' • ' + vehicle.placa : ''}` : null
    }).then(() => {
      actions.setSessionDraft(null);
    }).finally(()=>setCreating(false));
  }

  return (
    <section>
      <h1 className="h4 mb-3"><i className="bi bi-bolt-fill"></i> Sessão de recarga</h1>

      {/* Mostrar formulários apenas quando veio da Busca */}
      {state.sessionDraft ? (
      <div className="card mb-3">
        <div className="card-header bar-gradient d-flex align-items-center justify-content-between">
          <div><i className="bi bi-gear"></i> Nova Recarga</div>
          <button
            type="button"
            className="btn btn-sm btn-header-toggle"
            title="Cancelar nova recarga"
            onClick={()=>actions.setSessionDraft(null)}
          >
            <i className="bi bi-x-lg"></i>
          </button>
        </div>
        <div className="card-body">
          <div className="row g-2">
            <div className="col-md-5">
              <label className="form-label">Estação de recarga</label>
              <select className="form-select" value={stationId} onChange={(e)=>setStationId(e.target.value)}>
                {(state.stations||[]).map(s => (
                  <option key={s.id} value={s.id} disabled={Number(s.qtdDisponivel||0) <= 0}>
                    {s.nome} {s.potenciaKw ? `• ${s.potenciaKw}kW` : ''}{Number(s.qtdDisponivel||0) <= 0 ? ' (indisponível)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label">Veículo</label>
              <select className="form-select" value={vehicleId} onChange={(e)=>setVehicleId(e.target.value)}>
                {(state.vehicles||[]).length ? state.vehicles.map(v => (
                  <option key={v.id} value={v.id} disabled={runningVehicleIds.has(v.id)}>
                    {v.nome} {v.placa ? `• ${v.placa}` : ''}{runningVehicleIds.has(v.id) ? ' (indisponível)' : ''}
                  </option>
                )) : <option value="">Nenhum veículo cadastrado</option>}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label">Carga atual (%)</label>
              <input className="form-control" type="number" min="0" max="100" step="1" value={chargePct} onChange={(e)=>onChargeChange(e.target.value)} />
            </div>
            <div className="col-md-3">
              <label className="form-label">Recarga</label>
              <select className="form-select" value={mode} onChange={(e)=>onModeChange(e.target.value)}>
                <option>Parcial</option>
                <option>Completa</option>
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label">% alvo</label>
              <input
                className="form-control"
                type="number"
                min="1"
                max={isComplete ? 100 : maxPartial}
                step="1"
                value={targetPct}
                disabled={isComplete}
                onChange={(e)=>setTargetPct(e.target.value)}
              />
              {!isComplete ? <div className="form-text">Máximo permitido: {maxPartial}%</div> : null}
            </div>
            {!scheduleMode ? (
              <div className="col-12 d-flex justify-content-end mt-2">
                <div className="me-auto small text-muted d-flex align-items-center">
                  Estimado: {estimatedKwh.toFixed(2)} kWh • R$ {estimatedCost.toFixed(2).replace('.', ',')} • {fmtMinutes(estimatedMinutes)}
                </div>
                <button className="btn btn-rec" onClick={confirm} disabled={creating || Number(selectedStation?.qtdDisponivel||0) <= 0}>
                  <i className="bi bi-check2-circle"></i> {creating ? 'Criando...' : 'Confirmar'}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      ) : (
        <div className="card mb-3">
          <div className="card-body">
            <div className="small text-muted">
              Abra a página Buscar e selecione “Iniciar aqui” ou “Reservar” para preencher os dados de recarga.
            </div>
          </div>
        </div>
      )}

      {scheduleMode && state.sessionDraft ? (
        <div className="card mb-3">
          <div className="card-header bg-light"><i className="bi bi-calendar-check"></i> Agendamento</div>
          <div className="card-body">
            <div className="row g-2">
              <div className="col-md-3">
                <label className="form-label">Data</label>
                <input type="date" className="form-control" value={schedDate} onChange={(e)=>{
                  const v = e.target.value;
                  if (!v) return setSchedDate(v);
                  const d = new Date(`${v}T00:00:00`);
                  if (!isDateAllowed(d)) {
                    alert('A estação não funciona nesta data. Escolha um dia permitido.');
                  } else {
                    setSchedDate(v);
                  }
                }} />
                <div className="form-text">{operatingText()}</div>
              </div>
              <div className="col-md-3">
                <label className="form-label">Horário</label>
                <input type="time" className="form-control" value={schedTime} onChange={(e)=>{
                  const v = e.target.value;
                  if (!v) return setSchedTime(v);
                  if (!isTimeAllowed(v)) {
                    alert('Horário fora do funcionamento da estação.');
                  } else {
                    setSchedTime(v);
                  }
                }} />
                <div className="form-text">Horário permitido: {openTime()} até {closeTime()}</div>
              </div>
              <div className="col-md-3">
                <label className="form-label">Conector</label>
                <select className="form-select" value={schedConnector} onChange={(e)=>setSchedConnector(e.target.value)}>
                  <option value="">Automático</option>
                  {availableConnectors.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
                <div className="form-text">Disponíveis agora: {availableConnectors.length}/{totalConn}</div>
              </div>
              <div className="col-12 d-flex justify-content-end mt-2">
                <div className="me-auto small text-muted d-flex align-items-center">
                  Estimado: {estimatedKwh.toFixed(2)} kWh • R$ {estimatedCost.toFixed(2).replace('.', ',')} • {fmtMinutes(estimatedMinutes)}
                </div>
                <button className="btn btn-rec" onClick={scheduleReservation}>
                  <i className="bi bi-bookmark-check"></i> Agendar
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="card">
        <div className="card-header bar-gradient d-flex align-items-center justify-content-between">
          <div><i className="bi bi-activity"></i> Sessões em andamento</div>
          <button type="button" className="btn btn-sm btn-header-toggle" onClick={()=>setOpenRunning(v=>!v)}>
            <i className={`bi ${openRunning ? 'bi-chevron-up' : 'bi-chevron-down'}`}></i>
          </button>
        </div>
        {openRunning ? <div className="card-body">
          {(state.runningSessions || []).filter(s => s.userId === state.user?.id).length ? (
            <div className="table-responsive">
              <table className="table mb-0">
                <thead className="table-light">
                  <tr>
                    <th>ID</th>
                    <th>Estação</th>
                    <th>Veículo</th>
                    <th>Conector</th>
                    <th>Início</th>
                    <th>Fim (estimado)</th>
                    <th>Decorrido</th>
                    <th>Total (R$)</th>
                    <th>Modo</th>
                    <th>% alvo</th>
                    <th className="text-end">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {state.runningSessions.filter(s => s.userId === state.user?.id).map(s => {
                    const start = new Date(s.startAt).getTime();
                    const end = new Date(s.endAt).getTime();
                    const elapsed = Math.min(nowTs, end) - start;
                    const totalDur = Math.max(1, end - start);
                    const frac = Math.min(1, Math.max(0, elapsed / totalDur));
                    const partialCost = ((s.totalCost || 0) * frac).toFixed(2).replace('.', ',');
                    return (
                      <tr key={s.id}>
                        <td className="fw-semibold">#{s.chargeId}</td>
                        <td className="fw-semibold">{s.stationName}</td>
                        <td>{s.vehicleName || '-'}</td>
                        <td>{s.connector}</td>
                        <td>{new Date(start).toLocaleString()}</td>
                        <td>{new Date(end).toLocaleString()}</td>
                        <td>{formatHMS(elapsed)}{nowTs >= end ? ' (finalizada)' : ''}</td>
                        <td>R$ {partialCost} / R$ {(s.totalCost||0).toFixed(2).replace('.', ',')}</td>
                        <td>{s.mode}</td>
                        <td>{s.mode === 'Completa' ? 100 : (s.targetPct ?? '-')}</td>
                        <td className="text-end">
                          <button className="btn btn-sm btn-outline-success me-2" onClick={()=>{
                            if (window.confirm('Confirma a finalização da recarga no local?')) actions.finalizeSession(s.id);
                          }}>
                            <i className="bi bi-check2-circle"></i> Finalizar
                          </button>
                          <button className="btn btn-sm btn-outline-danger" onClick={()=>{
                            if (window.confirm('Confirmar cancelamento da recarga em andamento? O valor restante será convertido em cashback.')) actions.cancelSession(s.id);
                          }}>
                            <i className="bi bi-x-circle"></i> Cancelar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="small text-muted">Nenhuma sessão em andamento.</div>
          )}
        </div> : null}
      </div>

      {scheduleMode ? null : (
        <div className="card mt-3">
          <div className="card-header bar-gradient d-flex align-items-center justify-content-between">
            <div><i className="bi bi-calendar3"></i> Reservas</div>
            <button type="button" className="btn btn-sm btn-header-toggle" onClick={()=>setOpenScheduled(v=>!v)}>
              <i className={`bi ${openScheduled ? 'bi-chevron-up' : 'bi-chevron-down'}`}></i>
            </button>
          </div>
          {openScheduled ? <div className="card-body">
            { (state.scheduledSessions||[]).filter(s=>s.userId===state.user?.id).length ? (
              <div className="table-responsive">
                <table className="table mb-0">
                  <thead className="table-light">
                    <tr><th>ID</th><th>Estação</th><th>Quando</th><th>Conector</th><th>Total (R$)</th><th className="text-end">Ações</th></tr>
                  </thead>
                  <tbody>
                    {state.scheduledSessions.filter(s=>s.userId===state.user?.id).map(s=> {
                      const whenTs = s.when ? new Date(s.when).getTime() : null;
                      const canCancel = whenTs ? Date.now() < whenTs : true;
                      return (
                        <tr key={s.id}>
                          <td>#{s.chargeId}</td>
                          <td>{s.stationName}</td>
                          <td>{s.when ? new Date(s.when).toLocaleString() : '-'}</td>
                          <td>{s.connector || '-'}</td>
                          <td>R$ {Number(s.totalCost||0).toFixed(2).replace('.', ',')}</td>
                          <td className="text-end">
                            <div className="btn-group">
                              <button className="btn btn-sm btn-outline-danger" disabled={!canCancel} onClick={()=>{
                                if (window.confirm('Cancelar esta reserva? O pagamento será estornado.')) actions.cancelScheduled(s.id);
                              }}>
                                <i className="bi bi-x-circle"></i> Cancelar
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : <div className="small text-muted">Sem sessões agendadas.</div> }
          </div> : null}
        </div>
      )}
    </section>
  );
}

